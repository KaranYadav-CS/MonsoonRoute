import {NextResponse} from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const lat=[28.6,28.6,28.6,28.6275,28.6275,28.6275,28.655,28.655,28.655];
const lon=[77.19,77.2175,77.245,77.19,77.2175,77.245,77.19,77.2175,77.245];
const url=new URL('https://api.open-meteo.com/v1/forecast');
url.searchParams.set('latitude',lat.join(','));
url.searchParams.set('longitude',lon.join(','));
url.searchParams.set('hourly','precipitation');
url.searchParams.set('past_days','1');
url.searchParams.set('forecast_days','2');
url.searchParams.set('timezone','UTC');
url.searchParams.set('timeformat','unixtime');
type Cell={latitude?:number;longitude?:number;hourly?:{time?:number[];precipitation?:(number|null)[]};hourly_units?:{precipitation?:string}};
const headers={'Cache-Control':'public, max-age=0, s-maxage=900, stale-while-revalidate=1800'};
export async function GET(){
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(8500),next:{revalidate:900},headers:{accept:'application/json'}});
    if(!response.ok)throw Error('PROVIDER_UNAVAILABLE');
    const cells=await response.json() as Cell[];
    if(!Array.isArray(cells)||cells.length!==9)throw Error('GRID_INCOMPLETE');
    const now=Math.floor(Date.now()/1000);
    const rows=cells.map((cell,i)=>{
      const times=cell.hourly?.time,rain=cell.hourly?.precipitation;
      if(cell.hourly_units?.precipitation!=='mm'||!Array.isArray(times)||!Array.isArray(rain)||times.length!==rain.length||times.length<12)throw Error('INVALID_WEATHER_SCHEMA');
      if(!Number.isFinite(cell.latitude)||!Number.isFinite(cell.longitude))throw Error('INVALID_WEATHER_COORDINATES');
      const future=times.flatMap((t,j)=>t>now&&t<=now+10800&&typeof rain[j]==='number'&&Number.isFinite(rain[j])&&rain[j]!>=0&&rain[j]!<=300?[rain[j] as number]:[]);
      if(!future.length)throw Error('NO_FORECAST_COVERAGE');
      return {cellId:i,requestedLatitude:lat[i],requestedLongitude:lon[i],providerLatitude:cell.latitude,providerLongitude:cell.longitude,precipitationNext3hMm:Number(future.reduce((a,b)=>a+b,0).toFixed(2)),samples:future.length};
    });
    return NextResponse.json({source:'Open-Meteo',retrievedAt:new Date().toISOString(),region:'Central Delhi nine-cell pilot',cells:rows,unit:'mm',forecastWindowHours:3,observedFloodDepth:false,roadSafetyCertified:false,navigationReady:false,disclaimer:'Weather-model precipitation estimates only. Not observed water depth, street closure information or safe-route guidance.'},{headers});
  }catch{
    return NextResponse.json({error:{code:'WEATHER_UNAVAILABLE',message:'Verified nine-cell rainfall preview currently unavailable; no values are fabricated.'}},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
