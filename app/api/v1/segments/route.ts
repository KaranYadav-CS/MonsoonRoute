export const runtime='nodejs';export const preferredRegion='bom1';export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,ApiError} from '@/lib/server/errors';
import {serviceDB} from '@/lib/server/supabase';import {quota} from '@/lib/server/quotas';import {SegmentQuery,validateSingleParams,bbox} from '@/packages/contracts';
import {risk,type Graph,type Weather,type ReportEvidence} from '@/packages/engine/index';
import {readFile} from 'node:fs/promises';import {join} from 'node:path';
export const GET=async(req:Request)=>handler(async()=>{
 let bounds:[number,number,number,number],hour:0|1|3;try{const q=SegmentQuery.parse(validateSingleParams(new URL(req.url),new Set(['bbox','horizon_hours'])));bounds=bbox(q.bbox);hour=Number(q.horizon_hours) as 0|1|3;}catch{throw new ApiError(400,'INVALID_INPUT')}
 await quota(req,'segments_ip_min',30,60);const db=serviceDB();const {data:city,error:ce}=await db.from('cities').select('active_graph_id').eq('id','delhi-central').single();if(ce)throw new ApiError(503,'BACKEND_UNAVAILABLE');if(!city?.active_graph_id)throw new ApiError(503,'GRAPH_UNAVAILABLE');
 const {data:version,error:ge}=await db.from('graph_versions').select('id,sha256,captured_at,state').eq('id',city.active_graph_id).single();if(ge||!version||version.state!=='published')throw new ApiError(503,'GRAPH_UNAVAILABLE');
 let graph:Graph;try{graph=JSON.parse(await readFile(join(process.cwd(),'artifacts/graph.json'),'utf8'));if(graph.sha256!==version.sha256)throw Error('GRAPH_HASH_INVALID')}catch{throw new ApiError(503,'GRAPH_UNAVAILABLE')}
 const {data:context,error:cx}=await db.rpc('live_route_context',{p_graph:version.id});if(cx||!context)throw new ApiError(503,'BACKEND_UNAVAILABLE');
 const at=new Date(Date.now()+hour*3600000);const run=context.weather_run as {retrieved_at:string;source_issued_at:string|null}|null;
 const frames=(context.weather_frames||[]) as Array<{cell_id:number;interval_end:string;precipitation_mm:number}>;
 const evidence=(context.reports||[]) as Array<{edge_id:string;category:ReportEvidence['category'];observed_at:string}>;
 const accepted=evidence.map(x=>({...x,approved:true}));
 const closed=new Set<string>((context.closures||[]).map((x:{edge_id:string})=>x.edge_id));
 // Static nearest weather cell: dynamic time-scoped frame validation, no interpolation claims.
 const cellFor=(longitude:number,latitude:number)=>{const rows=[28.600,28.6275,28.655],cols=[77.190,77.2175,77.245];let best=Infinity,index=0;for(let i=0;i<3;i++)for(let j=0;j<3;j++){const d=(latitude-rows[i])**2+(longitude-cols[j])**2;if(d<best){best=d;index=i*3+j}}return index};
 const getWeather=(cell:number):Weather|null=>{
   if(!run||!Number.isFinite(Date.parse(run.retrieved_at))||Math.abs(Date.now()-Date.parse(run.retrieved_at))>3600000)return null;
   const byTime=new Map(frames.filter(f=>f.cell_id===cell).map(f=>[Date.parse(f.interval_end),f.precipitation_mm]));
   const floor=Math.floor(at.getTime()/3600000)*3600000,ceil=Math.ceil(at.getTime()/3600000)*3600000;
   const sum=(xs:number[])=>{let s=0;for(const t of xs){const v=byTime.get(t);if(v===undefined||!Number.isFinite(v)||v<0||v>300)return null;s+=v}return s};
   const p1=sum([floor]),p3=sum([floor-7200000,floor-3600000,floor]),f1=sum([ceil+3600000]),f3=sum([ceil+3600000,ceil+7200000,ceil+10800000]);
   return [p1,p3,f1,f3].some(x=>x===null)?null:{r1_past:p1!,r3_past:p3!,r1_future:f1!,r3_future:f3!,retrieved_at:run.retrieved_at,source_issued_at:run.source_issued_at};
 };
 const selected=graph.edges.filter(e=>e.geom.some(([lon,lat])=>lon>=bounds[0]&&lon<=bounds[2]&&lat>=bounds[1]&&lat<=bounds[3]));
 if(selected.length>2000)throw new ApiError(422,'ZOOM_IN');
 const features=selected.map(e=>{const mid=e.geom[Math.floor(e.geom.length/2)];const rv=risk(e,getWeather(cellFor(mid[0],mid[1])),accepted,at,version.captured_at);return {type:'Feature' as const,id:e.id,properties:{id:e.id,risk_index:rv.risk_index,evidence_coverage:rv.evidence_coverage,status:rv.status,reasons:rv.reasons,active_closure:closed.has(e.id)},geometry:{type:'LineString' as const,coordinates:e.geom}}});
 const json={type:'FeatureCollection' as const,features};if(Buffer.byteLength(JSON.stringify(json))>1_500_000)throw new ApiError(422,'ZOOM_IN');return success(json);
});
