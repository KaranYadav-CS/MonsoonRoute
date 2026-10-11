"""Open-Meteo fixed nine-cell contract; no caller-controlled endpoint or SSRF."""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime,timezone
import hashlib,json,math,urllib.parse,urllib.request
LAT=(28.600,)*3+(28.6275,)*3+(28.655,)*3
LON=(77.190,77.2175,77.245)*3
HOST='https://api.open-meteo.com/v1/forecast'
PARAMS={'latitude':','.join(map(str,LAT)),'longitude':','.join(map(str,LON)),'hourly':'precipitation','past_days':'1','forecast_days':'2','timezone':'UTC','timeformat':'unixtime'}
class WeatherValidationError(ValueError):pass
def parse_payload(raw:bytes,now:datetime|None=None)->tuple[list[dict],str]:
    if len(raw)>1_048_576:raise WeatherValidationError('WEATHER_PAYLOAD_TOO_LARGE')
    try:cells=json.loads(raw)
    except Exception as e:raise WeatherValidationError('WEATHER_JSON_INVALID') from e
    if not isinstance(cells,list) or len(cells)!=9:raise WeatherValidationError('WEATHER_GRID_INCOMPLETE')
    frames=[];now=now or datetime.now(timezone.utc)
    for i,c in enumerate(cells):
        hourly=c.get('hourly',{});units=c.get('hourly_units',{});ts=hourly.get('time');mm=hourly.get('precipitation')
        if units.get('precipitation')!='mm' or not isinstance(ts,list) or not isinstance(mm,list) or len(ts)!=len(mm) or not ts:raise WeatherValidationError('WEATHER_SCHEMA_INVALID')
        if not isinstance(c.get('latitude'),(int,float)) or not isinstance(c.get('longitude'),(int,float)):raise WeatherValidationError('WEATHER_COORDINATES_INVALID')
        prev=None
        for t,r in zip(ts,mm):
            if not isinstance(t,int) or (prev is not None and t-prev!=3600):raise WeatherValidationError('WEATHER_TIMESTEP_INVALID')
            prev=t
            if r is None:continue
            if isinstance(r,bool) or not isinstance(r,(int,float)) or not math.isfinite(r) or not 0<=r<=300:raise WeatherValidationError('WEATHER_RAIN_INVALID')
            frames.append({'cell_id':i,'interval_end':datetime.fromtimestamp(t,timezone.utc).isoformat(),'precipitation_mm':float(r),
                'requested_lat':LAT[i],'requested_lon':LON[i],
                'provider_lat':float(c['latitude']),'provider_lon':float(c['longitude'])})
    if not frames:raise WeatherValidationError('WEATHER_NO_FRAMES')
    return frames,hashlib.sha256(raw).hexdigest()
def fetch_archive(timeout:float=10)->tuple[list[dict],str,bytes]:
    url=HOST+'?'+urllib.parse.urlencode(PARAMS)
    req=urllib.request.Request(url,headers={'accept':'application/json','user-agent':'MonsoonRoute/0.2 research'})
    with urllib.request.urlopen(req,timeout=timeout) as resp:
        if int(resp.headers.get('Age','0'))>=3600:raise WeatherValidationError('WEATHER_CACHE_EXPIRED')
        raw=resp.read(1_048_577)
    frames,sha=parse_payload(raw)
    now=datetime.now(timezone.utc);floor=int(now.timestamp()//3600)*3600
    for cell in range(9):
        available={int(datetime.fromisoformat(f['interval_end']).timestamp()) for f in frames if f['cell_id']==cell}
        if not set(range(floor-7200,floor+8*3600,3600)).issubset(available):raise WeatherValidationError('WEATHER_REQUIRED_WINDOWS_MISSING')
    return frames,sha,raw

def fetch(timeout:float=10)->tuple[list[dict],str]:
    frames,sha,_=fetch_archive(timeout)
    return frames,sha
