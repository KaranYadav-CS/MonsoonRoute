/** Server-only report lifecycle. All write operations are delegated to audited SQL RPCs. */
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {sanitizePhoto} from './sanitize';
import {quota} from './quotas';
import manifest from '@/models/manifest.json';
import {ApiError} from './errors';
import {serviceDB} from './supabase';
import type {z} from 'zod';
import {ReportDraftInput} from '@/packages/contracts';
import {MAX_PHOTO_BYTES} from '@/packages/config/constants';

type Draft=z.infer<typeof ReportDraftInput>;
const BUCKET='report-photos';
function digest(input:string|Buffer){return createHash('sha256').update(input).digest('hex')}
function quotaSubject(subject:string){const key=process.env.RATE_LIMIT_HMAC_KEY;if(!key||key.length<32)throw new ApiError(503,'BACKEND_UNAVAILABLE');return createHmac('sha256',key).update(subject).digest('hex')}
function isUuid(value:string){return /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(value)}
export async function createDraft(actor:string,input:Draft){
  const db=serviceDB();
  const {data:city,error:cityError}=await db.from('cities').select('active_graph_id').eq('id','delhi-central').single();
  if(cityError)throw new ApiError(503,'BACKEND_UNAVAILABLE');if(!city?.active_graph_id)throw new ApiError(503,'GRAPH_UNAVAILABLE');
  const norm={...input,note:input.note.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim()};
  const when=Date.parse(norm.observed_at);if(!Number.isFinite(when)||when<Date.now()-3*60*60*1000||when>Date.now()+5*60*1000)throw new ApiError(422,'INVALID_INPUT');
  const hash=digest(JSON.stringify([city.active_graph_id,norm.edge_id,norm.point.lat,norm.point.lon,norm.observed_at,norm.category,norm.note,norm.photo_mime??null]));
  const {data,error}=await db.rpc('create_report_draft',{p_actor:actor,p_nonce:norm.client_nonce,p_request_sha256:hash,p_graph:city.active_graph_id,p_edge:norm.edge_id,p_lat:norm.point.lat,p_lon:norm.point.lon,p_observed:norm.observed_at,p_category:norm.category,p_note:norm.note,p_mime:norm.photo_mime??null,p_user_quota_hash:quotaSubject('user:'+actor)});
  if(error){const message=error.message||'';if(/INVALID_REPORT_EDGE|POINT_OUTSIDE_PILOT|INVALID_OBSERVED_TIME/.test(message))throw new ApiError(422,'INVALID_INPUT');if(/PHOTOS_DISABLED/.test(message))throw new ApiError(409,'FEATURE_DISABLED');if(/QUOTA/.test(message))throw new ApiError(429,'RATE_LIMITED');if(/IDEMPOTENCY_CONFLICT/.test(message))throw new ApiError(409,'CONFLICT');throw new ApiError(503,'BACKEND_UNAVAILABLE')}
  const result=data as {report_id:string;status:string;path:string|null;mime?:string|null};if(!isUuid(result.report_id))throw new ApiError(503,'BACKEND_UNAVAILABLE');
  let upload:null|{path:string;bucket:string;max_bytes:number;mime:string}=null;
  if(result.status==='draft'&&result.path&&result.mime)upload={path:result.path,bucket:BUCKET,max_bytes:MAX_PHOTO_BYTES,mime:result.mime};
  return {report_id:result.report_id,status:result.status,upload};
}
export async function finalizeReport(actor:string,reportId:string,hasPhoto:boolean,request?:Request){
  const db=serviceDB();
  const {data:record,error:re}=await db.from('reports').select('photo_original_path,photo_mime,status,user_id').eq('id',reportId).eq('user_id',actor).maybeSingle();if(re)throw new ApiError(503,'BACKEND_UNAVAILABLE');if(!record)throw new ApiError(404,'NOT_FOUND');
  if(record.status==='pending'){const {data:job,error}=await db.from('vision_jobs').select('id').eq('report_id',reportId).maybeSingle();if(error)throw new ApiError(503,'BACKEND_UNAVAILABLE');return {report_id:reportId,job_id:job?.id??null,status:'pending' as const}}
  if(hasPhoto&&!record.photo_original_path)throw new ApiError(409,'CONFLICT');
  if(hasPhoto){const info=await db.storage.from(BUCKET).info(record.photo_original_path);if(info.error||!info.data)throw new ApiError(409,'PHOTO_PROCESSING');if((info.data as {size?:number}).size&&Number((info.data as {size?:number}).size)>MAX_PHOTO_BYTES)throw new ApiError(422,'INVALID_INPUT')}
  const configured=await db.rpc('backend_context',{p_actor:actor});if(configured.error)throw new ApiError(503,'BACKEND_UNAVAILABLE');
  const flags=(configured.data as {flags?:Record<string,boolean>}|null)?.flags||{};
  const aws=process.env.AWS_ENABLED==='true'&&flags.aws_enabled===true&&flags.vision_enabled===true;
  if(hasPhoto&&request)await quota(request,'photo_user_day',10,86400,actor);
  const jobConfig={schema_version:'1.0',processing_mode:aws?'aws':'manual',sanitize_version:'sanitize-v1',model_id:aws?manifest.model_id:null,model_revision:aws?manifest.revision:null,model_sha256:aws?manifest.model_sha256:null,preprocessor_sha256:aws?manifest.preprocessor_sha256:null,worker_build_sha:process.env.VERCEL_GIT_COMMIT_SHA||process.env.BUILD_SHA||'local'};
  if(aws&&(!manifest.parity_validated||!manifest.model_sha256||!manifest.preprocessor_sha256))throw new ApiError(503,'FEATURE_DISABLED');
  const {data,error}=await db.rpc('finalize_report',{p_actor:actor,p_report:reportId,p_has_photo:hasPhoto,p_quota_subject_hash:quotaSubject('global:photo_jobs_global'),p_job_config:hasPhoto?jobConfig:{}});
  if(error){if(/PHOTO_JOB_QUOTA/.test(error.message))throw new ApiError(429,'RATE_LIMITED');if(/PHOTO_STATE_MISMATCH|INVALID_REPORT_STATE/.test(error.message))throw new ApiError(409,'CONFLICT');throw new ApiError(503,'BACKEND_UNAVAILABLE')}
  const response=data as {report_id:string;job_id:string|null;status:'pending'};
  if(!hasPhoto||!response.job_id)return response;
  if(aws){const {reserveAndEnqueue}=await import('./aws-jobs');try{await reserveAndEnqueue(response.job_id,response.report_id)}catch{/* Durable job stays queued; scheduled repair retries it. */}return response}
  // In the manual fallback, process bounded input synchronously; a failure is persisted as failed.
  await processManualPhoto(response.job_id,response.report_id,actor,record.photo_original_path!);
  return response;
}
export async function processManualPhoto(jobId:string,reportId:string,ownerId:string,originalPath:string){
  const db=serviceDB(),lease=randomUUID();const {data:claimed,error:clErr}=await db.rpc('claim_vision_job',{p_job_id:jobId,p_token:lease});if(clErr)throw new ApiError(503,'BACKEND_UNAVAILABLE');if(!Array.isArray(claimed)||claimed.length===0)return false;
  let processedPath:string|null=null;let errorCode:string|null=null;let result:Record<string,unknown>|null=null;
  try{
    const fetched=await db.storage.from(BUCKET).download(originalPath);if(fetched.error||!fetched.data)throw new Error('IMAGE_FETCH_FAILED');const original=Buffer.from(await fetched.data.arrayBuffer());
    if(!original.length||original.length>MAX_PHOTO_BYTES)throw new Error('IMAGE_SIZE_INVALID');const hash=digest(original);
    const pin=await db.rpc('pin_vision_source',{p_job:jobId,p_token:lease,p_sha:hash});if(pin.error||pin.data===false)throw new Error('SOURCE_HASH_MISMATCH');
    const clean=await sanitizePhoto(original);processedPath=`${ownerId}/${reportId}/processed.jpg`;
    const upload=await db.storage.from(BUCKET).upload(processedPath,clean,{contentType:'image/jpeg',cacheControl:'0',upsert:true});if(upload.error)throw new Error('IMAGE_UPLOAD_FAILED');
    result={schema_version:'1.0',processing_mode:'manual',model_used:false,advisory:'manual_review',model_id:null,model_revision:null,scores:null,calibrated:false,location_verified:false,depth_estimated:false,sanitized_sha256:digest(clean),original_sha256:hash};
  }catch(e){errorCode=e instanceof Error&&/^(IMAGE_FETCH_FAILED|IMAGE_SIZE_INVALID|SOURCE_HASH_MISMATCH|IMAGE_FORMAT_INVALID|PROCESSED_IMAGE_TOO_LARGE|IMAGE_UPLOAD_FAILED)$/.test(e.message)?e.message:'SANITIZATION_FAILED';processedPath=null;result=null}
  const done=await db.rpc('finish_vision_job',{p_job_id:jobId,p_token:lease,p_processed_path:processedPath,p_result:result,p_error_code:errorCode});
  if(done.error||done.data!==true){if(processedPath)await db.storage.from(BUCKET).remove([processedPath]);throw new ApiError(503,'BACKEND_UNAVAILABLE')}
  if(errorCode===null)await db.storage.from(BUCKET).remove([originalPath]);return errorCode===null;
}
