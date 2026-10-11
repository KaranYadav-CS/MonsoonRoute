"""Bounded private maintenance: durable queue repair and verified retention cleanup."""
import os,json,time,hashlib,uuid
from datetime import datetime,timezone
from backend import rpc,object_remove,update_row,BackendError
BUCKET='monsoonroute-prod-artifacts-043063712559-ap-south-1'
QUEUE='https://sqs.ap-south-1.amazonaws.com/043063712559/monsoonroute-p5-inactive-vision'
def lambda_handler(event,context):
 import boto3
 if os.getenv('MAINTENANCE_ENABLED')!='true':return {'status':'paused'}
 started=time.monotonic();data=rpc('maintenance_context',{});flags=data.get('flags',{});sqs=boto3.client('sqs',region_name='ap-south-1');sent=removed=archived=0
 if flags.get('aws_enabled') and flags.get('vision_enabled'):
  for job in data.get('jobs',[]):
   if time.monotonic()-started>40:break
   if not rpc('reserve_vision_enqueue',{'p_job':job['id']}):continue
   sqs.send_message(QueueUrl=QUEUE,MessageBody=json.dumps({'schema_version':'1.0','job_id':job['id'],'report_id':job['report_id'],'request_id':str(uuid.uuid4())}));sent+=1
 now=datetime.now(timezone.utc)
 for report in data.get('cleanup_reports',[]):
  if time.monotonic()-started>45:break
  age=(now-datetime.fromisoformat(report['created_at'].replace('Z','+00:00'))).total_seconds()
  for column,ttl in [('photo_original_path',86400),('photo_processed_path',604800)]:
   path=report.get(column)
   if path and (age>=ttl or report['status']=='withdrawn'):
    expected=report['user_id']+'/'+report['id']+'/'+('original' if column=='photo_original_path' else 'processed.jpg')
    if path!=expected:raise BackendError('RETENTION_PATH_MISMATCH')
    object_remove(path);update_row('reports',{'id':report['id'],column:path},{column:None});removed+=1
 events=data.get('audit',[])
 if events and time.monotonic()-started<45:
  raw=json.dumps({'schema_version':'1.0','exported_at':now.isoformat(),'records':events},sort_keys=True,separators=(',',':')).encode();key='audit/'+now.strftime('%Y/%m/%d/')+hashlib.sha256(raw).hexdigest()+'.json'
  s3=boto3.client('s3',region_name='ap-south-1');s3.put_object(Bucket=BUCKET,Key=key,Body=raw,ServerSideEncryption='AES256',ContentType='application/json')
  if s3.head_object(Bucket=BUCKET,Key=key)['ContentLength']!=len(raw):raise BackendError('ARCHIVE_INCOMPLETE')
  archived=rpc('commit_audit_archive',{'p_ids':[e['id'] for e in events],'p_key':key})
 update_row('service_status',{'name':'maintenance'},{'last_success_at':now.isoformat(),'last_error_code':None,'summary':{'requeued':sent,'media_removed':removed,'archived':archived}})
 return {'status':'processed','requeued':sent,'media_removed':removed,'archived':archived}
