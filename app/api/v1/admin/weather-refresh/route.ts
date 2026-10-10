export const runtime='nodejs';
export const preferredRegion='bom1';
export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,failure,ApiError} from '@/lib/server/errors';import {serviceDB} from '@/lib/server/supabase';import {requireRole} from '@/lib/server/auth';import {originCheck,strictJson} from '@/lib/server/authorization';import {EmptyInput} from '@/packages/contracts';
export const POST=async(req:Request)=>handler(async()=>{originCheck(req);await requireRole('admin');try{EmptyInput.parse(await strictJson(req))}catch{throw new ApiError(400,'INVALID_INPUT')}throw new ApiError(503,'FEATURE_DISABLED')});
