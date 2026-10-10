export const runtime='nodejs';
export const preferredRegion='bom1';
export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,failure,ApiError} from '@/lib/server/errors';import {serviceDB} from '@/lib/server/supabase';import {requireRole} from '@/lib/server/auth';import {FlagsInput} from '@/packages/contracts';import {originCheck,strictJson} from '@/lib/server/authorization';
export const PUT=async(req:Request)=>handler(async()=>{originCheck(req);const u=await requireRole('admin');let x;try{x=FlagsInput.parse(await strictJson(req))}catch{throw new ApiError(400,'INVALID_INPUT')}if(Object.entries(x).some(([k,v])=>v===true&&(k==='aws_enabled'||k==='vision_enabled'||k==='photos_enabled')))throw new ApiError(403,'FEATURE_DISABLED');const {data,error}=await serviceDB().rpc('set_runtime_flags',{p_actor:u.id,p_flags:x});if(error)throw new ApiError(503,'BACKEND_UNAVAILABLE');return success(data)});
