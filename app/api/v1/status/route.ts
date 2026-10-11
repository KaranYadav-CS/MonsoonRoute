export const runtime='nodejs';
export const preferredRegion='bom1';
export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,ApiError} from '@/lib/server/errors';import {serviceDB} from '@/lib/server/supabase';import {loadGraph} from '@/lib/server/graph';
export const GET=async()=>handler(async()=>{
 const db=serviceDB(),now=new Date();const {manifest}=await loadGraph();
 const [{data:services,error:se},{data:run,error:we}]=await Promise.all([db.from('service_status').select('name,last_success_at,last_error_code,summary'),db.from('weather_runs').select('id,retrieved_at,source_issued_at,metadata').eq('kind','forecast').eq('state','published').order('retrieved_at',{ascending:false}).limit(1).maybeSingle()]);
 if(se||we)throw new ApiError(503,'BACKEND_UNAVAILABLE');const age=run?(now.getTime()-Date.parse(run.retrieved_at))/60000:null;
 const components:Record<string,unknown>={database:{status:'healthy',last_success_at:now.toISOString(),last_error_code:null},graph:{status:'healthy',last_success_at:manifest.captured_at,last_error_code:null},weather:{status:age!==null&&age<=60?'healthy':'degraded',last_success_at:run?.retrieved_at??null,last_error_code:age!==null&&age>60?'WEATHER_STALE':null},vision:{status:process.env.AWS_ANALYSIS_ENABLED==='true'?'healthy':'unknown',last_success_at:null,last_error_code:null}};
 for(const s of services||[])if(['vision','maintenance'].includes(s.name))components[s.name]={status:s.last_error_code?'degraded':s.last_success_at?'healthy':'unknown',last_success_at:s.last_success_at,last_error_code:s.last_error_code};
 return success({checked_at:now.toISOString(),build_sha:process.env.VERCEL_GIT_COMMIT_SHA||process.env.BUILD_SHA||'local',graph_version:manifest.graph_id,components,weather:{run_id:run?.id??null,retrieved_at:run?.retrieved_at??null,age_minutes:age,source_issued_at:run?.source_issued_at??null,archive_backend:run?.metadata?.archive_backend??null,archive_sha256:run?.metadata?.sha256??null,refresh_id:null}});
});
