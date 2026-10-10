import {readFile} from 'node:fs/promises';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {Graph,Point,ReportEvidence,Weather,compareRoutes} from '@/packages/engine/index';import type {RouteRequest} from '@/packages/contracts';import {serviceDB} from './supabase';import {ApiError} from './errors';
const GRID_LAT=[28.600,28.6275,28.655],GRID_LON=[77.190,77.2175,77.245];
const nearCell=(p:Point)=>{let n=0,best=Infinity;for(let i=0;i<3;i++)for(let j=0;j<3;j++){const d=(p.lat-GRID_LAT[i])**2+(p.lon-GRID_LON[j])**2;if(d<best){best=d;n=i*3+j}}return n};
type Frame={cell_id:number;interval_end:string;precipitation_mm:number};
function rain(frames:Frame[],cell:number,t:Date,retrievedAt:string,issuedAt:string|null):Weather|null{
 if(!Number.isFinite(Date.parse(retrievedAt))||t.getTime()-Date.parse(retrievedAt)>3600000)return null;
 const byTime=new Map(frames.filter(x=>x.cell_id===cell).map(x=>[Date.parse(x.interval_end),x.precipitation_mm]));
 const floor=Math.floor(t.getTime()/3600000)*3600000,ceil=Math.ceil(t.getTime()/3600000)*3600000;
 const sum=(times:number[])=>{let total=0;for(const instant of times){const value=byTime.get(instant);if(value===undefined||!Number.isFinite(value)||value<0||value>300)return null;total+=value}return total};
 const past1=sum([floor]),past3=sum([floor-7200000,floor-3600000,floor]);
 const future1=sum([ceil+3600000]),future3=sum([ceil+3600000,ceil+7200000,ceil+10800000]);
 if([past1,past3,future1,future3].some(x=>x===null))return null;
 return {r1_past:past1!,r3_past:past3!,r1_future:future1!,r3_future:future3!,retrieved_at:retrievedAt,source_issued_at:issuedAt};
}
function graphFromFile(raw:string,dbSha:string):Graph{const g=JSON.parse(raw) as Graph;if(g.sha256!==dbSha)throw new ApiError(503,'GRAPH_UNAVAILABLE');return g}
export async function computeRoute(input:RouteRequest,actor:string|null){const db=serviceDB();const {data:city,error:ce}=await db.from('cities').select('active_graph_id').eq('id','delhi-central').single();if(ce||!city)throw new ApiError(503,'BACKEND_UNAVAILABLE');if(!city.active_graph_id)throw new ApiError(503,'GRAPH_UNAVAILABLE');const {data:version,error:ve}=await db.from('graph_versions').select('id,sha256,captured_at,state').eq('id',city.active_graph_id).single();if(ve||version?.state!=='published')throw new ApiError(503,'GRAPH_UNAVAILABLE');let graph:Graph;try{graph=graphFromFile(await readFile(join(process.cwd(),'artifacts/graph.json'),'utf8'),version.sha256)}catch{throw new ApiError(503,'GRAPH_UNAVAILABLE')}
 const {data:ctx,error:xe}=await db.rpc('live_route_context',{p_graph:version.id});if(xe||!ctx)throw new ApiError(503,'BACKEND_UNAVAILABLE');
 if(input.mode==='scenario')throw new ApiError(503,'FEATURE_DISABLED'); // deterministic replay not released until checksum-validated fixture import.
 const time=new Date();time.setTime(time.getTime()+input.horizon_hours*3600000);
 const run=ctx.weather_run as {id:string;retrieved_at:string;source_issued_at:string|null}|null;const frames=(ctx.weather_frames||[]) as Frame[];
 const weather=run?rain(frames,nearCell(input.origin),time,run.retrieved_at,run.source_issued_at):null;
 const reports=((ctx.reports||[]) as Array<{edge_id:string;category:ReportEvidence['category'];observed_at:string}>).map(x=>({...x,approved:true}));
 const closures=new Set(((ctx.closures||[]) as Array<{edge_id:string}>).map(x=>x.edge_id));
 const result=compareRoutes(graph,input.origin,input.destination,input.detour_fraction,weather,reports,closures,time,version.captured_at);
 const id=randomUUID();const data={id,...result,mode:input.mode,scenario_id:null,effective_at:time.toISOString(),provenance:{graph_version:version.id,graph_sha256:version.sha256,ruleset_id:'relative-risk-v1',weather_run_id:run?.id||null,weather_retrieved_at:run?.retrieved_at||null,source_issued_at:run?.source_issued_at||null,accepted_report_ids:[],override_ids:[],config_sha256:'unverified'}};
 // Auditable sanitized public computation; no raw anonymous coordinates persisted without consent.
 if(input.save_history&&actor){const {error}=await db.from('route_requests').insert({id,user_id:actor,city_id:'delhi-central',graph_id:version.id,weather_run_id:run?.id||null,scenario_id:null,ruleset_id:'relative-risk-v1',mode:'live',save_history:true,effective_at:time.toISOString(),request:input,result:data});if(error)throw new ApiError(503,'BACKEND_UNAVAILABLE')}
 return data;
}
