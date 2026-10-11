/** One-time, protected production build transfer. No secret is printed or returned. */
import {SecretsManagerClient,PutSecretValueCommand} from '@aws-sdk/client-secrets-manager';
import {awsCredentialsProvider} from '@vercel/functions/oidc';
import {randomUUID} from 'node:crypto';
const secretArn='arn:aws:secretsmanager:ap-south-1:043063712559:secret:monsoonroute-backend-60YzXf';
const roleArn='arn:aws:iam::043063712559:role/monsoonroute-vercel-secret-bootstrap';
if(process.env.MONSOON_BOOTSTRAP_SECRET!=='true'){
 console.log('Backend secret transfer not requested.');
}else{
 if(process.env.VERCEL_ENV!=='production'||process.env.SUPABASE_URL!=='https://ihvsazbjhlpylnfeakao.supabase.co')throw Error('BOOTSTRAP_TARGET_REJECTED');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||key.length<30||key.startsWith('sb_publishable_'))throw Error('BOOTSTRAP_BACKEND_KEY_MISSING');
 const check=await fetch(process.env.SUPABASE_URL+'/rest/v1/rpc/backend_context',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:'{"p_actor":null}',signal:AbortSignal.timeout(10000)});
 if(!check.ok)throw Error('BOOTSTRAP_BACKEND_CONSUMER_CHECK_FAILED');await check.arrayBuffer();
 const client=new SecretsManagerClient({region:'ap-south-1',credentials:awsCredentialsProvider({roleArn}),maxAttempts:2});
 try{
  await client.send(new PutSecretValueCommand({SecretId:secretArn,ClientRequestToken:randomUUID(),SecretString:JSON.stringify({supabase_url:process.env.SUPABASE_URL,supabase_service_role_key:key})}),{abortSignal:AbortSignal.timeout(15000)});
  console.log('Protected backend consumer verified; AWS secret version stored.');
 }catch{throw Error('BOOTSTRAP_SECRET_TRANSFER_FAILED')}finally{client.destroy()}
}
