"""Durable private photo jobs. Advisory classification never publishes road closures."""
import hashlib,json,time,uuid
from datetime import datetime,timezone
from backend import rpc,table_one,object_get,object_put,object_remove,update_row,BackendError
from sanitize import sanitize_image,InvalidImage
from model_runtime import predict,DIGEST,PROCESSOR_DIGEST

def process_job(data):
    flags=rpc('backend_context',{}).get('flags',{})
    if not flags.get('aws_enabled') or not flags.get('vision_enabled'):raise BackendError('VISION_PAUSED')
    job=table_one('vision_jobs',{'id':data['job_id']})
    if not job or job['report_id']!=data['report_id']:raise ValueError('MESSAGE_MISMATCH')
    token=str(uuid.uuid4());claimed=rpc('claim_vision_job',{'p_job_id':job['id'],'p_token':token})
    if not claimed:return
    report=table_one('reports',{'id':job['report_id']});config=job.get('inference_config',{})
    if not report or report['status'] in ('draft','withdrawn') or not report.get('user_id'):return
    if config.get('processing_mode')!='aws' or config.get('model_sha256')!=DIGEST or config.get('preprocessor_sha256')!=PROCESSOR_DIGEST or config.get('model_revision')!='1fb5408d3b778c92c79b3a7894517ce794ad21f7':
        rpc('finish_vision_job',{'p_job_id':job['id'],'p_token':token,'p_processed_path':None,'p_result':None,'p_error_code':'MODEL_VERSION_MISMATCH'});return
    source=report['user_id']+'/'+report['id']+'/original';processed=report['user_id']+'/'+report['id']+'/processed.jpg'
    if report['photo_original_path']!=source:raise ValueError('SOURCE_PATH_MISMATCH')
    started=time.monotonic()
    try:
        original=object_get('report-photos',source)
        if not rpc('pin_vision_source',{'p_job':job['id'],'p_token':token,'p_sha':hashlib.sha256(original).hexdigest()}):return
        cleaned=sanitize_image(original);result=predict(cleaned);result['latency_ms']=round((time.monotonic()-started)*1000,2)
        object_put('report-photos',processed,cleaned)
        done=rpc('finish_vision_job',{'p_job_id':job['id'],'p_token':token,'p_processed_path':processed,'p_result':result,'p_error_code':None})
        if not done:object_remove(processed);return
        object_remove(source)
        update_row('reports',{'id':report['id'],'photo_original_path':source},{'photo_original_path':None})
        update_row('service_status',{'name':'vision'},{'last_success_at':datetime.now(timezone.utc).isoformat(),'last_error_code':None,'summary':{'model_sha256':DIGEST,'latency_ms':result['latency_ms']}})
    except (InvalidImage,ValueError) as exc:
        code='INVALID_IMAGE' if isinstance(exc,InvalidImage) else 'MODEL_OR_SOURCE_INVALID'
        rpc('finish_vision_job',{'p_job_id':job['id'],'p_token':token,'p_processed_path':None,'p_result':None,'p_error_code':code})
    # Transient backend/S3 failures preserve the lease and fail the SQS item.

def lambda_handler(event,context):
    from model_runtime import lambda_handler as private_handler
    if isinstance(event,dict) and event.get('mode')=='backend_check':
        result=rpc('backend_context',{});return {'backend_verified':isinstance(result.get('flags'),dict),'region':'ap-south-1'}
    if not isinstance(event,dict) or 'Records' not in event:return private_handler(event,context)
    failures=[]
    for record in event.get('Records',[]):
        try:
            data=json.loads(record['body'])
            if set(data) not in ({'schema_version','job_id','report_id'},{'schema_version','job_id','report_id','request_id'}) or data.get('schema_version')!='1.0':raise ValueError('INVALID_MESSAGE')
            for key in ('job_id','report_id'):uuid.UUID(data[key])
            if 'request_id' in data:uuid.UUID(data['request_id'])
            process_job(data)
        except Exception as exc:
            print(json.dumps({'event':'vision_retry','error_class':type(exc).__name__}))
            failures.append({'itemIdentifier':record['messageId']})
    return {'batchItemFailures':failures}
