export const runtime='nodejs';
export const preferredRegion='bom1';
export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,failure,ApiError} from '@/lib/server/errors';import {serviceDB} from '@/lib/server/supabase';import {requireRole} from '@/lib/server/auth';import {RetryInput,Id} from '@/packages/contracts';import {strictJson,originCheck} from '@/lib/server/authorization';
export const POST=async(req:Request,{params}:{params:Promise<{id:string}>})=>handler(async()=>{originCheck(req);await requireRole('admin');if(!Id.safeParse((await params).id).success)throw new ApiError(400,'INVALID_INPUT');try{RetryInput.parse(await strictJson(req))}catch{throw new ApiError(400,'INVALID_INPUT')}throw new ApiError(503,'FEATURE_DISABLED')});
