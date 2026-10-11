"""AWS Lambda weather ingestion. Disabled by default; publish only after archive + DB RPC success.

Source: fixed Open-Meteo nine-cell forecast; no user-supplied URLs; response validated.
"""
from __future__ import annotations
import os,hashlib,json,uuid,base64,logging,re
from datetime import datetime,timezone
from adapters import fetch_archive,WeatherValidationError
from backend import table_insert,rpc,BackendError
logger=logging.getLogger(__name__)

def publish(frames:list[dict],sha:str,raw:bytes,*,now:datetime|None=None)->dict:
    if not frames or not re.fullmatch(r'[0-9a-f]{64}',sha) or hashlib.sha256(raw).hexdigest()!=sha:raise WeatherValidationError('ARCHIVE_DIGEST_MISMATCH')
    bucket=os.environ.get('ARTIFACT_BUCKET','')
    if not re.fullmatch(r'monsoonroute-(?:prod|production)-[a-z0-9-]{3,70}',bucket):raise BackendError('RUNTIME_ARCHIVE_BUCKET_NOT_CONFIGURED')
    if os.getenv('SOURCE_LICENSE_REVIEWED')!='true':raise BackendError('WEATHER_LICENSE_NOT_REVIEWED')
    import boto3
    s3=boto3.client('s3',region_name='ap-south-1')
    key='raw/weather/'+sha+'.json'
    s3.put_object(Bucket=bucket,Key=key,Body=raw,ServerSideEncryption='AES256',ContentType='application/json',Metadata={'source':'open-meteo-forecast','sha256':sha})
    # Object presence is independently checked BEFORE DB publication.
    head=s3.head_object(Bucket=bucket,Key=key)
    if head['ContentLength']!=len(raw) or head.get('Metadata',{}).get('sha256')!=sha:raise BackendError('WEATHER_ARCHIVE_VERIFICATION_FAILED')
    now=now or datetime.now(timezone.utc)
    rows=sorted(frames,key=lambda x:(x['cell_id'],x['interval_end']))
    artifact=table_insert('source_artifacts',{'source_id':'open-meteo-forecast','retrieved_at':now.isoformat(),
       'sha256':sha,'object_key':key,'license_review':'approved','metadata':{'archive_backend':'s3','bytes':len(raw),'provider':'open-meteo'}})
    if not artifact.get('id'):raise BackendError('WEATHER_ARTIFACT_NOT_PERSISTED')
    run={'id':str(uuid.uuid4()),'city_id':'delhi-central','artifact_id':artifact['id'],'kind':'forecast',
      'retrieved_at':now.isoformat(),'source_issued_at':None,'valid_from':min(x['interval_end'] for x in rows),
      'valid_until':max(x['interval_end'] for x in rows),'expected_rows':len(rows),
      'metadata':{'archive_backend':'s3','sha256':sha,'provider':'open-meteo','issue_time_unavailable':True}}
    if run['valid_from']==run['valid_until']:raise WeatherValidationError('WEATHER_WINDOW_TOO_SHORT')
    created=rpc('publish_weather_run',{'p_run':run,'p_frames':rows})
    if created!=run['id']:raise BackendError('WEATHER_PUBLISH_NOT_CONFIRMED')
    return {'status':'published','published':True,'run_id':created,'frame_count':len(rows),'archive_sha256':sha}

def lambda_handler(event,context):
    if os.environ.get('WEATHER_INGEST_ENABLED')!='true':return {'status':'disabled','published':False}
    try:
        frames,sha,raw=fetch_archive(timeout=8)
        return publish(frames,sha,raw)
    except (WeatherValidationError,BackendError,ValueError,TimeoutError) as exc:
        logger.warning('weather_ingestion_failed category=%s',type(exc).__name__)
        raise RuntimeError('WEATHER_INGESTION_FAILED') from None
