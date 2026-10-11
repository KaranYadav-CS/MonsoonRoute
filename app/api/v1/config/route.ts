export const runtime='nodejs';
export const preferredRegion='bom1';
export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,ApiError} from '@/lib/server/errors';import {serviceDB} from '@/lib/server/supabase';import {CITY_ID,MAX_PHOTO_BYTES} from '@/packages/config/constants';import {loadGraph} from '@/lib/server/graph';
export const GET=async()=>handler(async()=>{
 const {graph,manifest}=await loadGraph();const db=serviceDB();
 const [{data:city,error:ce},{data:context,error:be}]=await Promise.all([db.from('cities').select('name,active_graph_id').eq('id',CITY_ID).single(),db.rpc('backend_context',{p_actor:null})]);
 if(ce||be)throw new ApiError(503,'BACKEND_UNAVAILABLE');if(city?.active_graph_id!==manifest.graph_id)throw new ApiError(503,'GRAPH_VERSION_MISMATCH');
 const flags=context.flags as Record<string,boolean>;const vision=process.env.AWS_ENABLED==='true'&&flags.aws_enabled&&flags.vision_enabled;
 return success({schema_version:'1.0',city_id:CITY_ID,city_name:city.name,supported_bbox:manifest.supported_bbox,graph_version:manifest.graph_id,graph_sha256:graph.sha256,ruleset_id:'relative-risk-v1',horizons:[0,1,3],max_detour_fraction:0.3,roads_geojson_url:`/pilot/${graph.sha256}/roads.geojson`,landmarks_url:`/pilot/${graph.sha256}/landmarks.json`,flags,vision_available:!!vision,image_analysis_available:process.env.AWS_ANALYSIS_ENABLED==='true',build_sha:process.env.VERCEL_GIT_COMMIT_SHA||process.env.BUILD_SHA||'local',report_photo_max_bytes:MAX_PHOTO_BYTES,limitations:manifest.limitations});
});
