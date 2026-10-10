"""Conservative AWS maintenance worker: audit archive before retention writes.

Disabled by default. Unverified object deletion is not silently considered complete.
"""
from __future__ import annotations
import os,json,hashlib,logging,re
from datetime import datetime,timezone
from backend import rpc,BackendError
logger=logging.getLogger(__name__)

def archive_events(events:list[dict],bucket:str):
    if not events:return {'count':0,'key':None}
    if len(events)>500:raise BackendError('AUDIT_BATCH_TOO_LARGE')
    ids=[e['id'] for e in events]
    if len(set(ids))!=len(ids) or not all(isinstance(x,int) and x>0 for x in ids):raise BackendError('AUDIT_BATCH_INVALID')
    raw=json.dumps({'schema_version':'1.0','exported_at':datetime.now(timezone.utc).isoformat(),'records':events},sort_keys=True,separators=(',',':')).encode()
    key='audit/'+datetime.now(timezone.utc).strftime('%Y/%m/%d/')+hashlib.sha256(raw).hexdigest()+'.json'
    import boto3
    s3=boto3.client('s3',region_name='ap-south-1')
    s3.put_object(Bucket=bucket,Key=key,Body=raw,ServerSideEncryption='AES256',ContentType='application/json')
    if s3.head_object(Bucket=bucket,Key=key)['ContentLength']!=len(raw):raise BackendError('AUDIT_ARCHIVE_NOT_VERIFIED')
    n=rpc('commit_audit_archive',{'p_ids':ids,'p_key':key})
    if not isinstance(n,int) or n!=len(ids):raise BackendError('AUDIT_COMMIT_INCOMPLETE')
    return {'count':n,'key':key}

def lambda_handler(event,context):
    if os.environ.get('MAINTENANCE_ENABLED')!='true':return {'status':'disabled','audited':0}
    bucket=os.environ.get('ARTIFACT_BUCKET','')
    if not re.fullmatch(r'monsoonroute-(?:prod|production)-[a-z0-9-]{3,70}',bucket):raise BackendError('MAINTENANCE_BUCKET_NOT_CONFIGURED')
    try:
        data=rpc('maintenance_context',{})
        if not isinstance(data,dict):raise BackendError('MAINTENANCE_CONTEXT_INVALID')
        # Do not purge private media here without a separate reviewed Storage deletion
        # proof and owner-specific retention policy.
        media=data.get('cleanup_reports') or []
        if media:logger.warning('media_cleanup_deferred_count=%d',len(media))
        archival=archive_events(data.get('audit') or [],bucket)
        # Database pruning is an independently audited SQL function and may require a
        # separate operational retention review before setting the flag below.
        pruned=None
        if os.environ.get('MAINTENANCE_PRUNE_APPROVED')=='true':pruned=rpc('prune_maintenance',{})
        return {'status':'processed','archived_count':archival['count'],'media_pending':len(media),'pruned':pruned}
    except Exception as e:
        logger.warning('maintenance_failed class=%s',type(e).__name__)
        raise RuntimeError('MAINTENANCE_FAILED') from None
