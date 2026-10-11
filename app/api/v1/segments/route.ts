export const runtime='nodejs';export const preferredRegion='bom1';export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,ApiError} from '@/lib/server/errors';
import {quota} from '@/lib/server/quotas';import {SegmentQuery,validateSingleParams,bbox} from '@/packages/contracts';
import {risk} from '@/packages/engine/index';import {loadLiveContext} from '@/lib/server/graph';
export const GET=async(req:Request)=>handler(async()=>{
 let bounds:[number,number,number,number],hour:0|1|3;try{const q=SegmentQuery.parse(validateSingleParams(new URL(req.url),new Set(['bbox','horizon_hours'])));bounds=bbox(q.bbox);hour=Number(q.horizon_hours) as 0|1|3}catch{throw new ApiError(400,'INVALID_INPUT')}
 await quota(req,'segments_ip_min',30,60);const ctx=await loadLiveContext(hour);
 const selected=ctx.graph.edges.filter(e=>e.geom.some(([lon,lat])=>lon>=bounds[0]&&lon<=bounds[2]&&lat>=bounds[1]&&lat<=bounds[3]));
 if(selected.length>2000)throw new ApiError(422,'ZOOM_IN');
 const byId=new Map(ctx.graph.edges.map(e=>[e.id,e]));
 const reports=ctx.reports.flatMap(r=>{const physical=byId.get(r.edge_id)?.physical_key;return ctx.graph.edges.filter(e=>e.id===r.edge_id||(physical&&e.physical_key===physical)).map(e=>({...r,edge_id:e.id}))});
 const features=selected.map(e=>{const score=risk(e,ctx.weatherByEdge.get(e.id)??null,reports,ctx.effective,ctx.manifest.captured_at,ctx.captured);return {type:'Feature',id:e.id,properties:{edge_id:e.id,name:e.name??null,risk_index:score.risk_index,evidence_coverage:score.evidence_coverage,evidence_status:score.status==='known'?'current':'unknown',closed:ctx.closed.has(e.id),reasons:score.reasons},geometry:{type:'LineString',coordinates:e.geom}}});
 const data={type:'FeatureCollection',features,provenance:{graph_version:ctx.manifest.graph_id,ruleset_id:'relative-risk-v1',weather_run_id:ctx.context.weather_run?.id??null,captured_at:ctx.captured.toISOString(),horizon_hours:hour}};
 if(Buffer.byteLength(JSON.stringify(data))>1500000)throw new ApiError(422,'ZOOM_IN');return success(data);
});
