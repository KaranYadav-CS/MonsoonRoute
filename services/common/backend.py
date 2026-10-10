"""Minimal scoped Supabase REST and private Storage adapter for Lambda code.

This module never accepts caller-chosen hosts or publishes credentials in logs.
The deployment service role is retrieved from Secrets Manager at cold start.
"""
from __future__ import annotations
import json,os,re,urllib.request,urllib.parse,urllib.error
from functools import lru_cache
from typing import Any

PROJECT_REF='ihvsazbjhlpylnfeakao'
BASE='https://'+PROJECT_REF+'.supabase.co'
_ALLOWED_RESOURCE=re.compile(r'^[a-z][a-z0-9_]{0,63}$')
class BackendError(RuntimeError):pass
@lru_cache(maxsize=1)
def credentials():
    arn=os.getenv('BACKEND_SECRET_ARN','')
    if not re.fullmatch(r'arn:aws:secretsmanager:ap-south-1:043063712559:secret:monsoonroute-[A-Za-z0-9/_+=.@-]+',arn):raise BackendError('BACKEND_SECRET_NOT_CONFIGURED')
    import boto3
    try:
        r=boto3.client('secretsmanager',region_name='ap-south-1').get_secret_value(SecretId=arn)
        obj=json.loads(r['SecretString'])
        url=obj.get('SUPABASE_URL');key=obj.get('SUPABASE_SERVICE_ROLE_KEY')
        if url!=BASE or not isinstance(key,str) or len(key)<30:raise BackendError('BACKEND_SECRET_CONTRACT_INVALID')
        return key
    except BackendError:raise
    except Exception as e:raise BackendError('BACKEND_CREDENTIAL_FETCH_FAILED') from e

def request(method:str,path:str,body:Any=None,*,max_bytes:int=3_145_728,timeout:float=9)->Any:
    if not path.startswith(('/rest/v1/','/storage/v1/')) or any(x in path for x in ('://','\\','\x00','#')):raise BackendError('BACKEND_PATH_INVALID')
    key=credentials();data=json.dumps(body,separators=(',',':'),ensure_ascii=False).encode() if body is not None else None
    req=urllib.request.Request(BASE+path,data=data,method=method,headers={
      'apikey':key,'authorization':'Bearer '+key,'accept':'application/json',
      'content-type':'application/json','prefer':'return=representation'})
    try:
        with urllib.request.urlopen(req,timeout=timeout) as response:
            out=response.read(max_bytes+1)
            if len(out)>max_bytes:raise BackendError('BACKEND_RESPONSE_TOO_LARGE')
            if response.headers.get('content-type','').startswith('application/json'):
                return json.loads(out or b'null')
            return out
    except urllib.error.HTTPError as e:
        # Do not expose body: it may contain sensitive provider/user material.
        raise BackendError('BACKEND_HTTP_'+str(e.code)) from None
    except (OSError,ValueError) as e:raise BackendError('BACKEND_REQUEST_FAILED') from e

def rpc(name:str,body:dict|None=None)->Any:
    if not _ALLOWED_RESOURCE.fullmatch(name):raise BackendError('RPC_NAME_INVALID')
    return request('POST','/rest/v1/rpc/'+name,body or {})

def table_insert(table:str,body:dict)->dict:
    if not _ALLOWED_RESOURCE.fullmatch(table):raise BackendError('TABLE_NAME_INVALID')
    result=request('POST','/rest/v1/'+table,body)
    if not isinstance(result,list) or len(result)!=1 or not isinstance(result[0],dict):raise BackendError('TABLE_INSERT_RESULT_INVALID')
    return result[0]

def table_one(table:str,criteria:dict[str,str],select:str='*')->dict|None:
    if not _ALLOWED_RESOURCE.fullmatch(table) or len(criteria)>4:raise BackendError('TABLE_NAME_INVALID')
    query={'select':select,'limit':'2'}
    for k,v in criteria.items():
        if not _ALLOWED_RESOURCE.fullmatch(k) or not isinstance(v,str) or len(v)>160:raise BackendError('TABLE_FILTER_INVALID')
        query[k]='eq.'+v
    result=request('GET','/rest/v1/'+table+'?'+urllib.parse.urlencode(query))
    if not isinstance(result,list) or len(result)>1:raise BackendError('TABLE_READ_NOT_UNIQUE')
    return result[0] if result else None

def object_get(bucket:str,key:str,max_bytes:int=3_145_728)->bytes:
    if bucket!='report-photos' or not re.fullmatch(r'[0-9a-f-]{36}/[0-9a-f-]{36}/original',key):raise BackendError('STORAGE_KEY_INVALID')
    result=request('GET','/storage/v1/object/authenticated/'+bucket+'/'+urllib.parse.quote(key),max_bytes=max_bytes)
    if not isinstance(result,bytes) or not result:raise BackendError('STORAGE_IMAGE_MISSING')
    return result

def object_put(bucket:str,key:str,image:bytes):
    if bucket!='report-photos' or not re.fullmatch(r'[0-9a-f-]{36}/[0-9a-f-]{36}/processed\.jpg',key):raise BackendError('STORAGE_KEY_INVALID')
    token=credentials()
    req=urllib.request.Request(BASE+'/storage/v1/object/'+bucket+'/'+urllib.parse.quote(key),data=image,method='POST',headers={
      'apikey':token,'authorization':'Bearer '+token,'content-type':'image/jpeg','x-upsert':'true','cache-control':'no-store'})
    try:
        with urllib.request.urlopen(req,timeout=9) as response:
            if response.status not in (200,201):raise BackendError('STORAGE_UPLOAD_FAILED')
    except urllib.error.HTTPError as e:raise BackendError('STORAGE_UPLOAD_HTTP_'+str(e.code)) from None
