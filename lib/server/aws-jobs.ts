/** AWS SQS send is enabled only after explicit P5 activation + exact queue URL validation. */
import {SQSClient,SendMessageCommand} from '@aws-sdk/client-sqs';
import {ApiError} from './errors';
import {serviceDB} from './supabase';
import {awsCredentialsProvider} from '@vercel/functions/oidc';
import {randomUUID} from 'node:crypto';
export async function reserveAndEnqueue(jobId:string,reportId:string){
  if(process.env.AWS_ENABLED!=='true')throw new ApiError(503,'FEATURE_DISABLED');
  const url=process.env.AWS_VISION_QUEUE_URL;
  if(!url||!/^https:\/\/sqs\.ap-south-1\.amazonaws\.com\/043063712559\/monsoonroute-[a-z0-9-]+$/.test(url))throw new ApiError(503,'BACKEND_UNAVAILABLE');
  const db=serviceDB();const {data,error}=await db.rpc('reserve_vision_enqueue',{p_job:jobId});if(error)throw new ApiError(503,'BACKEND_UNAVAILABLE');if(!Array.isArray(data)||data.length===0)return;
  const role=process.env.AWS_ROLE_ARN;if(!role||role!=='arn:aws:iam::043063712559:role/monsoonroute-vercel-runtime')throw new ApiError(503,'BACKEND_UNAVAILABLE');
  const client=new SQSClient({region:'ap-south-1',credentials:awsCredentialsProvider({roleArn:role}),maxAttempts:2});
  try{await client.send(new SendMessageCommand({QueueUrl:url,MessageBody:JSON.stringify({schema_version:'1.0',job_id:jobId,report_id:reportId,request_id:randomUUID()})}),{abortSignal:AbortSignal.timeout(5000)})}catch{throw new ApiError(503,'BACKEND_UNAVAILABLE')}finally{client.destroy()}
}
