"""AWS SQS event worker: idempotent lease, original hash pinning, sanitized output, optional model.

Every failed record is reported to SQS for retry/DLQ. Human review is mandatory.
"""
from __future__ import annotations
import hashlib,json,logging,os,uuid
from backend import rpc,table_one,object_get,object_put,BackendError
from sanitize import sanitize_image,InvalidImage
from inference import predict,VisionUnavailable
logger=logging.getLogger(__name__)

def parse_message(record):
    data=json.loads(record['body'])
    if not isinstance(data,dict) or set(data)!= {'schema_version','job_id','report_id'} or data.get('schema_version')!='1.0':raise ValueError('INVALID_JOB_ENVELOPE')
    for k in ('job_id','report_id'):
        if not isinstance(data[k],str) or str(uuid.UUID(data[k]))!=data[k]:raise ValueError('INVALID_JOB_UUID')
    return data

def work(data:dict):
    job=table_one('vision_jobs',{'id':data['job_id']},select='id,report_id,state,inference_config')
    if not job or job['report_id']!=data['report_id']:raise BackendError('JOB_REPORT_MISMATCH')
    report=table_one('reports',{'id':data['report_id']},select='id,user_id,status,photo_original_path')
    if not report or report['status'] in ('draft','withdrawn') or not report.get('user_id'):return {'status':'irrelevant'}
    source=report['photo_original_path'];expected=report['user_id']+'/'+report['id']+'/original'
    if source!=expected:raise BackendError('SOURCE_PATH_MISMATCH')
    token=str(uuid.uuid4());claimed=rpc('claim_vision_job',{'p_job_id':job['id'],'p_token':token})
    if not isinstance(claimed,list) or not claimed:return {'status':'not_claimed'}
    processed=None;error=None;result=None
    try:
        blob=object_get('report-photos',source,max_bytes=3_145_728)
        sha=hashlib.sha256(blob).hexdigest()
        if rpc('pin_vision_source',{'p_job':job['id'],'p_token':token,'p_sha':sha}) is not True:raise BackendError('SOURCE_HASH_CONFLICT')
        clean=sanitize_image(blob)
        cfg=job.get('inference_config') or {}
        if cfg.get('sanitize_version')!='sanitize-v1' or cfg.get('processing_mode') not in ('aws','manual'):raise BackendError('JOB_CONFIG_INVALID')
        result={'schema_version':'1.0','sanitize_version':'sanitize-v1','original_sha256':sha,'processed_sha256':hashlib.sha256(clean).hexdigest(),
                'model_used':False,'advisory':'Image sanitized. A moderator must validate road and time evidence.'}
        if cfg['processing_mode']=='aws':
            # Model artifacts must be supplied locally by a reviewed immutable deployment;
            # no automatic download from an unpinned public HF head revision.
            result.update(predict(clean,os.environ.get('MODEL_PATH',''),os.environ.get('PROCESSOR_PATH',''),os.environ.get('MODEL_MANIFEST_PATH','')))
        processed=report['user_id']+'/'+report['id']+'/processed.jpg'
        object_put('report-photos',processed,clean)
    except (BackendError,InvalidImage,VisionUnavailable,ValueError,OSError) as exc:
        error='IMAGE_PROCESSING_FAILED' if isinstance(exc,InvalidImage) else ('MODEL_UNAVAILABLE' if isinstance(exc,VisionUnavailable) else 'WORKER_FAILURE')
        logger.warning('vision_processing_failed class=%s',type(exc).__name__)
        processed=None;result=None
    # Persist terminal result; a stale lease cannot override a newer worker.
    finished=rpc('finish_vision_job',{'p_job_id':job['id'],'p_token':token,'p_processed_path':processed,'p_result':result,'p_error_code':error})
    if finished is not True:raise BackendError('LEASE_FINISH_FAILED')
    return {'status':'processed' if not error else 'failed','model_used':bool(result and result.get('model_used'))}

def lambda_handler(event,context):
    failed=[]
    for row in event.get('Records',[]):
        try:
            payload=parse_message(row)
            if os.getenv('VISION_ENABLED')!='true':raise RuntimeError('VISION_DISABLED')
            work(payload)
        except Exception as e:
            logger.warning('vision_record_not_completed class=%s',type(e).__name__)
            if 'messageId' in row:failed.append({'itemIdentifier':row['messageId']})
    return {'batchItemFailures':failed}
