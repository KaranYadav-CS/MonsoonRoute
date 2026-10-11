import {randomUUID} from 'node:crypto';
import {PutObjectCommand,DeleteObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {InvokeCommand,LambdaClient} from '@aws-sdk/client-lambda';
import {awsCredentialsProvider} from '@vercel/functions/oidc';
import {requireUser} from '@/lib/server/auth';
import {handler} from '@/lib/server/http';
import {success,ApiError} from '@/lib/server/errors';
import {originCheck} from '@/lib/server/authorization';
import {sanitizePhoto} from '@/lib/server/sanitize';
import {scopedQuota} from '@/lib/server/quotas';
import {serviceDB} from '@/lib/server/supabase';
export const runtime='nodejs';export const dynamic='force-dynamic';export const preferredRegion='bom1';export const maxDuration=60;
const REGION='ap-south-1',BUCKET='monsoonroute-prod-artifacts-043063712559-ap-south-1';
const FUNCTION='arn:aws:lambda:ap-south-1:043063712559:function:monsoonroute-private-model-inference';
const ROLE='arn:aws:iam::043063712559:role/monsoonroute-vercel-private-analysis';
const MODEL='2517f3dfb5d82dc21a0729733fff7756eaca0b4b22026d153189501169a84d76';
export const POST=async(req:Request)=>handler(async()=>{
 originCheck(req);const user=await requireUser();if(!user.email_confirmed_at)throw new ApiError(403,'FORBIDDEN');
 const {data:context,error}=await serviceDB().rpc('backend_context',{p_actor:user.id});if(error)throw new ApiError(503,'BACKEND_UNAVAILABLE');
 if(process.env.VERCEL_ENV!=='production'||process.env.AWS_ANALYSIS_ENABLED!=='true'||process.env.AWS_ANALYSIS_ROLE_ARN!==ROLE||!context.flags.aws_enabled||!context.flags.vision_enabled)throw new ApiError(503,'ANALYSIS_UNAVAILABLE');
 if(!req.headers.get('content-type')?.startsWith('multipart/form-data;')||Number(req.headers.get('content-length')??0)>3700000)throw new ApiError(413,'INVALID_INPUT');
 let clean:Buffer;
 try{const form=await req.formData(),file=form.get('photo');if(form.get('consent')!=='yes'||[...form.keys()].some(k=>!['photo','consent'].includes(k))||!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<1||file.size>3145728)throw Error('INVALID_IMAGE');clean=await sanitizePhoto(Buffer.from(await file.arrayBuffer()))}catch{throw new ApiError(422,'INVALID_INPUT')}
 await scopedQuota('user:'+user.id,'analysis_user_30min',1,1800);await scopedQuota('user:'+user.id,'photo_user_day',10,86400);await scopedQuota('global:photo_jobs_global','photo_jobs_global',100,86400);
 const credentials=awsCredentialsProvider({roleArn:ROLE}),s3=new S3Client({region:REGION,credentials,maxAttempts:2}),lambda=new LambdaClient({region:REGION,credentials,maxAttempts:1});
 const key='user-analysis/'+randomUUID().replaceAll('-','')+'.jpg';let version:string|undefined;
 try{
  const uploaded=await s3.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:clean,ContentType:'image/jpeg',ServerSideEncryption:'AES256',Metadata:{'advisory-only':'true'}}),{abortSignal:AbortSignal.timeout(10000)});version=uploaded.VersionId;
  const response=await lambda.send(new InvokeCommand({FunctionName:FUNCTION,InvocationType:'RequestResponse',Payload:new TextEncoder().encode(JSON.stringify({mode:'classify_private_s3',key}))}),{abortSignal:AbortSignal.timeout(40000)});
  if(response.StatusCode!==200||response.FunctionError||!response.Payload)throw Error('INFERENCE_FAILED');const data=JSON.parse(new TextDecoder().decode(response.Payload));
  if(data.model_sha256!==MODEL||!['Flooded Scene','Non Flooded'].includes(data.class_label)||!['uncertain','flooded_scene_likely','non_flooded_scene_likely'].includes(data.advisory)||data.evaluation_approved!==false||data.routing_usable!==false||!Number.isFinite(data.scores?.flooded_scene)||!Number.isFinite(data.scores?.non_flooded))throw Error('MODEL_RECEIPT_INVALID');
  return success({...data,processing_mode:'private_aws_lambda',disclaimer:'Image-only advisory. Scores are uncalibrated and do not measure flood depth, road passability or field accuracy. No report or road closure was created.'});
 }catch{throw new ApiError(503,'ANALYSIS_UNAVAILABLE')}
 finally{if(version){try{await s3.send(new DeleteObjectCommand({Bucket:BUCKET,Key:key,VersionId:version}),{abortSignal:AbortSignal.timeout(5000)})}catch{/* Encrypted prefix lifecycle is the recovery path. */}}s3.destroy();lambda.destroy()}
});
