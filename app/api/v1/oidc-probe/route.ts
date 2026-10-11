import {awsCredentialsProvider} from '@vercel/functions/oidc';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const preferredRegion='bom1';
export const maxDuration=15;
export async function GET(){
 if(process.env.VERCEL_ENV!=='production')return Response.json({verified:false,reason:'NON_PRODUCTION'},{status:404});
 try{
  const provider=awsCredentialsProvider({roleArn:'arn:aws:iam::043063712559:role/monsoonroute-vercel-oidc-probe'});
  const credentials=await provider();
  if(!credentials.accessKeyId||!credentials.secretAccessKey)throw Error('STS_EMPTY');
  return Response.json({verified:true,account:'043063712559',scope:'zero-permission-vercel-prod-oidc',timestamp:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({verified:false,reason:'OIDC_ASSUME_ROLE_FAILED'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
