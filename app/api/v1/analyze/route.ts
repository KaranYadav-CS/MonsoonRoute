import {createHmac,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {NextResponse} from 'next/server';
import {PutObjectCommand,DeleteObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {InvokeCommand,LambdaClient} from '@aws-sdk/client-lambda';
import {awsCredentialsProvider} from '@vercel/functions/oidc';
import {requireUser} from '@/lib/server/auth';
import {ApiError} from '@/lib/server/errors';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='bom1';
export const maxDuration=60;

const REGION='ap-south-1';
const BUCKET='monsoonroute-prod-artifacts-043063712559-ap-south-1';
const FUNCTION='arn:aws:lambda:ap-south-1:043063712559:function:monsoonroute-private-model-inference';
const ROLE='arn:aws:iam::043063712559:role/monsoonroute-vercel-private-analysis';
const MODEL='2517f3dfb5d82dc21a0729733fff7756eaca0b4b22026d153189501169a84d76';
const INPUT_LIMIT=3*1024*1024;
function jsonError(code:string,status:number){
 const messages:Record<string,string>={AUTH_REQUIRED:'Log in with your verified email account to analyze a photo.',EMAIL_UNVERIFIED:'Verify your email before uploading.',INVALID_INPUT:'Choose a valid JPEG, PNG or WebP image smaller than 3 MiB and accept the consent statement.',RATE_LIMITED:'You may analyze one photo every 30 minutes. Please try later.',FEATURE_DISABLED:'Experimental image analysis is not currently enabled.',ANALYSIS_UNAVAILABLE:'The private image analysis service is temporarily unavailable.'};
 return NextResponse.json({data:null,error:{code,message:messages[code]||messages.ANALYSIS_UNAVAILABLE}},{status,headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(req:Request){
 if(process.env.VERCEL_ENV!=='production'||process.env.AWS_ANALYSIS_ENABLED!=='true'||process.env.AWS_ANALYSIS_ROLE_ARN!==ROLE)return jsonError('FEATURE_DISABLED',503);
 const origin=req.headers.get('origin');
 if(!origin||origin!=='https://monsoon-route-omega.vercel.app')return jsonError('INVALID_INPUT',403);
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;'))return jsonError('INVALID_INPUT',415);
 const declared=Number(req.headers.get('content-length')??0);
 if(!Number.isFinite(declared)||declared>3_700_000)return jsonError('INVALID_INPUT',413);
 let user:Awaited<ReturnType<typeof requireUser>>;
 try{user=await requireUser()}catch(e){return jsonError(e instanceof ApiError&&e.status===401?'AUTH_REQUIRED':'ANALYSIS_UNAVAILABLE',e instanceof ApiError&&e.status===401?401:503)}
 if(!user.email||!user.email_confirmed_at)return jsonError('EMAIL_UNVERIFIED',403);
 let image:Uint8Array;
 try{
  const form=await req.formData();
  if(form.get('consent')!=='yes'||[...form.keys()].some(k=>!['photo','consent'].includes(k)))return jsonError('INVALID_INPUT',400);
  const file=form.get('photo');
  if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<1||file.size>INPUT_LIMIT)return jsonError('INVALID_INPUT',400);
  const bytes=Buffer.from(await file.arrayBuffer());
  const source=sharp(bytes,{failOn:'error',limitInputPixels:12_000_000});
  const metadata=await source.metadata();
  if(!['jpeg','png','webp'].includes(metadata.format||''))return jsonError('INVALID_INPUT',400);
  const cleaned=await source.rotate().resize(1024,1024,{fit:'inside',withoutEnlargement:true}).jpeg({quality:78,mozjpeg:true}).toBuffer();
  if(cleaned.byteLength>1_400_000||cleaned.byteLength===0)return jsonError('INVALID_INPUT',400);
  image=new Uint8Array(cleaned);
 }catch{return jsonError('INVALID_INPUT',400)}
 const hmac=process.env.RATE_LIMIT_HMAC_KEY;
 if(!hmac||hmac.length<32)return jsonError('ANALYSIS_UNAVAILABLE',503);
 let uploaded=false;
 const key='user-analysis/'+randomUUID().replaceAll('-','')+'.jpg';
 try{
  const credentials=awsCredentialsProvider({roleArn:ROLE});
  const s3=new S3Client({region:REGION,credentials,maxAttempts:2});
  const lambda=new LambdaClient({region:REGION,credentials,maxAttempts:1});
  const quotaUser=createHmac('sha256',hmac).update(user.id).digest('hex');
  const slot=Math.floor(Date.now()/1_800_000);
  const quotaKey='analysis-quota/'+quotaUser+'/'+String(slot)+'.txt';
  try{
   await s3.send(new PutObjectCommand({Bucket:BUCKET,Key:quotaKey,Body:'reserved',IfNoneMatch:'*',ServerSideEncryption:'AES256',ContentType:'text/plain'}),{abortSignal:AbortSignal.timeout(12000)});
  }catch(e){
   const code=e&&typeof e==='object'&&'name' in e?String(e.name):'';
   if(code==='PreconditionFailed'||code==='ConditionalRequestConflict')return jsonError('RATE_LIMITED',429);
   throw e;
  }
  await s3.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:image,ContentType:'image/jpeg',ServerSideEncryption:'AES256',Metadata:{'analysis-mode':'experimental','road-safety-approved':'false'}}),{abortSignal:AbortSignal.timeout(15000)});
  uploaded=true;
  const response=await lambda.send(new InvokeCommand({FunctionName:FUNCTION,InvocationType:'RequestResponse',Payload:new TextEncoder().encode(JSON.stringify({mode:'classify_private_s3',key}))}),{abortSignal:AbortSignal.timeout(48000)});
  if(response.StatusCode!==200||response.FunctionError||!response.Payload)throw Error('MODEL_EXECUTION_UNAVAILABLE');
  const data=JSON.parse(new TextDecoder().decode(response.Payload)) as Record<string,unknown>;
  if(data.model_sha256!==MODEL||!['Flooded Scene','Non Flooded'].includes(String(data.class_label))||data.evaluation_approved!==false||data.routing_usable!==false||typeof data.uncalibrated_probability!=='number'||!Number.isFinite(data.uncalibrated_probability)||data.uncalibrated_probability<0||data.uncalibrated_probability>1)throw Error('MODEL_RECEIPT_REJECTED');
  return NextResponse.json({data:{class_label:data.class_label,uncalibrated_probability:data.uncalibrated_probability,model_revision:data.model_revision,model_sha256:MODEL,processing_mode:'private_aws_lambda',evaluation_approved:false,routing_usable:false,disclaimer:'Exploratory image-only classifier. The number is an uncalibrated model score, not validated flood-detection accuracy, observed road water depth or safe routing guidance. No road report or closure was created.'},error:null},{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return jsonError('ANALYSIS_UNAVAILABLE',503)}
 finally{
  if(uploaded){
   try{
    const credentials=awsCredentialsProvider({roleArn:ROLE});
    await new S3Client({region:REGION,credentials,maxAttempts:1}).send(new DeleteObjectCommand({Bucket:BUCKET,Key:key}),{abortSignal:AbortSignal.timeout(5000)});
   }catch{/* Prefix lifecycle enforces short retention even on cleanup failure. */}
  }
 }
}
