/** Isolated, hardcoded educational fixture. No DB writes, network calls or fake live evidence. */
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {compareRoutes,type Graph,type Weather} from '@/packages/engine/index';
import type {RouteRequest} from '@/packages/contracts';
import {ApiError} from './errors';

const ALLOWED_ID='synthetic-grid';
type Fixture={id:string;kind:'synthetic';effective_at:string;graph_sha256:string;weather:Weather;disclaimer:string};
export async function computeScenario(input:RouteRequest){
  if(input.scenario_id!==ALLOWED_ID||!input.frame_at||input.save_history||input.horizon_hours!==0) throw new ApiError(422,'INVALID_INPUT');
  const fixture=JSON.parse(await readFile(join(process.cwd(),'artifacts/synthetic-scenario.json'),'utf8')) as Fixture;
  if(fixture.id!==input.scenario_id || fixture.kind!=='synthetic' || input.frame_at!==fixture.effective_at)throw new ApiError(422,'INVALID_INPUT');
  const graph=JSON.parse(await readFile(join(process.cwd(),'artifacts/synthetic-graph.json'),'utf8')) as Graph;
  if(graph.sha256!==fixture.graph_sha256)throw new ApiError(503,'GRAPH_UNAVAILABLE');
  const now=new Date(fixture.effective_at);
  const result=compareRoutes(graph,input.origin,input.destination,input.detour_fraction,fixture.weather,[],new Set(),now,fixture.effective_at);
  return {id:randomUUID(),...result,mode:'scenario',scenario_id:fixture.id,effective_at:fixture.effective_at,
    provenance:{graph_version:graph.version,graph_sha256:graph.sha256,ruleset_id:'relative-risk-v1',weather_run_id:null,weather_retrieved_at:null,source_issued_at:null,accepted_report_ids:[],override_ids:[],config_sha256:'synthetic-only'},
    disclaimer:fixture.disclaimer,synthetic:true};
}
