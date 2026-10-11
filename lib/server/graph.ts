import 'server-only';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateGraph,type Graph,type Weather,type Point,type ReportEvidence} from '@/packages/engine/index';
import {serviceDB} from './supabase';
import {ApiError} from './errors';

export type GraphManifest={graph_id:string;compiled_graph_sha256:string;captured_at:string;supported_bbox:[number,number,number,number];limitations:string[]};
type Frame={cell_id:number;interval_end:string;precipitation_mm:number};
type Run={id:string;retrieved_at:string;source_issued_at:string|null;metadata:Record<string,unknown>};
type RouteContext={captured_at:string;graph_id:string;graph_sha256?:string;reports:Array<ReportEvidence&{id:string}>;closures:Array<{id:string;edge_id:string;scope:'physical'|'directed';valid_until:string}>;weather_run:Run|null;weather_frames:Frame[]};
let cached:Promise<{graph:Graph;manifest:GraphManifest}>|undefined;
export function loadGraph(){
 cached??=(async()=>{
  const [raw,metadata]=await Promise.all([readFile(join(process.cwd(),'artifacts/graph.json'),'utf8'),readFile(join(process.cwd(),'artifacts/graph-manifest.json'),'utf8')]);
  const graph=JSON.parse(raw) as Graph,manifest=JSON.parse(metadata) as GraphManifest;
  const digest=createHash('sha256').update(raw.replace(/,"sha256":"[a-f0-9]{64}"/,'')).digest('hex');
  if(digest!==graph.sha256||manifest.compiled_graph_sha256!==graph.sha256)throw new ApiError(503,'GRAPH_VERSION_MISMATCH');
  validateGraph(graph);return {graph,manifest};
 })();
 return cached;
}
export function weatherAt(frames:Frame[],cell:number,effective:Date,run:Run|null,captured:Date):Weather|null {
 if(!run)return null;
 const age=captured.getTime()-Date.parse(run.retrieved_at);if(!Number.isFinite(age)||age< -300000||age>3600000)return null;
 const byTime=new Map(frames.filter(f=>f.cell_id===cell).map(f=>[Date.parse(f.interval_end),f.precipitation_mm]));
 const floor=Math.floor(effective.getTime()/3600000)*3600000,ceil=Math.ceil(effective.getTime()/3600000)*3600000;
 const sum=(times:number[])=>{let result=0;for(const t of times){const value=byTime.get(t);if(value===undefined||!Number.isFinite(value)||value<0||value>300)return null;result+=value}return result};
 const p1=sum([floor]),p3=sum([floor-7200000,floor-3600000,floor]),f1=sum([ceil+3600000]),f3=sum([ceil+3600000,ceil+7200000,ceil+10800000]);
 if([p1,p3,f1,f3].some(v=>v===null))return null;
 return {r1_past:p1!,r3_past:p3!,r1_future:f1!,r3_future:f3!,retrieved_at:run.retrieved_at,source_issued_at:run.source_issued_at};
}
function cellFor(p:Point){let best=Infinity,cell=0;[28.600,28.6275,28.655].forEach((lat,i)=>[77.190,77.2175,77.245].forEach((lon,j)=>{const d=(p.lat-lat)**2+(p.lon-lon)**2;if(d<best){best=d;cell=i*3+j}}));return cell}
export async function loadLiveContext(horizon:0|1|3){
 const {graph,manifest}=await loadGraph();
 const {data,error}=await serviceDB().rpc('live_route_context',{p_graph:manifest.graph_id});
 if(error||!data)throw new ApiError(503,error?.message?.includes('GRAPH_VERSION_MISMATCH')?'GRAPH_VERSION_MISMATCH':'BACKEND_UNAVAILABLE');
 const context=data as RouteContext;
 if(context.graph_sha256&&context.graph_sha256!==graph.sha256)throw new ApiError(503,'GRAPH_VERSION_MISMATCH');
 const captured=new Date(context.captured_at),effective=new Date(captured.getTime()+horizon*3600000);
 const weatherCells=new Map<number,Weather|null>();for(let i=0;i<9;i++)weatherCells.set(i,weatherAt(context.weather_frames,i,effective,context.weather_run,captured));
 const weatherByEdge=new Map(graph.edges.map(e=>{const point=e.geom[Math.floor(e.geom.length/2)];return [e.id,weatherCells.get(cellFor({lat:point[1],lon:point[0]}))??null] as const}));
 const edgeMap=new Map(graph.edges.map(e=>[e.id,e]));const closed=new Set<string>();
 for(const closure of context.closures){const selected=edgeMap.get(closure.edge_id);if(!selected)throw new ApiError(503,'GRAPH_VERSION_MISMATCH');if(closure.scope==='directed')closed.add(selected.id);else for(const edge of graph.edges)if(edge.physical_key===selected.physical_key)closed.add(edge.id)}
 return {graph,manifest,context,captured,effective,weatherByEdge,closed,reports:context.reports.map(r=>({...r,approved:true}))};
}
