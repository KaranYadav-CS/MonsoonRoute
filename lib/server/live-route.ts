import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {compareRoutes} from '@/packages/engine/index';
import type {RouteRequest} from '@/packages/contracts';
import {loadLiveContext} from './graph';
import {serviceDB} from './supabase';
import {ApiError} from './errors';

export async function computeLiveRoute(input:RouteRequest,actor:string|null){
 const {graph,manifest,context,captured,effective,weatherByEdge,closed,reports}=await loadLiveContext(input.horizon_hours);
 const result=compareRoutes(graph,input.origin,input.destination,input.detour_fraction,null,reports,closed,effective,manifest.captured_at,{capturedAt:captured,weatherByEdge});
 const data={id:randomUUID(),...result,mode:'live',scenario_id:null,effective_at:effective.toISOString(),provenance:{graph_version:manifest.graph_id,graph_sha256:graph.sha256,ruleset_id:'relative-risk-v1',weather_run_id:context.weather_run?.id??null,weather_retrieved_at:context.weather_run?.retrieved_at??null,source_issued_at:context.weather_run?.source_issued_at??null,accepted_report_ids:context.reports.map(r=>r.id),override_ids:context.closures.map(c=>c.id),config_sha256:createHash('sha256').update('relative-risk-v1|150000|2000|yen12|junction-delay5|detour30').digest('hex')},limitations:manifest.limitations};
 const saved=!!(input.save_history&&actor),rounded=new Date(Math.floor(captured.getTime()/3600000)*3600000).toISOString();
 const summary={status:result.status,candidate_count:result.search.candidate_count,elapsed_ms:result.search.elapsed_ms,distance_m:Math.round(result.baseline.distance_m/100)*100,estimated_time_s:Math.round(result.baseline.estimated_time_s/60)*60};
 const {error}=await serviceDB().from('route_requests').insert({id:data.id,user_id:saved?actor:null,city_id:'delhi-central',graph_id:manifest.graph_id,weather_run_id:context.weather_run?.id??null,scenario_id:null,ruleset_id:'relative-risk-v1',mode:'live',save_history:saved,effective_at:saved?effective.toISOString():rounded,created_at:saved?captured.toISOString():rounded,request:saved?input:{horizon_hours:input.horizon_hours,detour_fraction:input.detour_fraction,save_history:false},result:saved?data:summary});
 if(error)throw new ApiError(503,'BACKEND_UNAVAILABLE');
 return data;
}
