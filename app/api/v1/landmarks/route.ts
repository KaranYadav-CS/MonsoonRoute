export const runtime='nodejs';
export const preferredRegion='bom1';
export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,failure,ApiError} from '@/lib/server/errors';import {serviceDB} from '@/lib/server/supabase';import {LANDMARKS} from '@/packages/config/constants';import {validateSingleParams,LandmarkQuery} from '@/packages/contracts';
export const GET=async(req:Request)=>handler(async()=>{let q;try{q=LandmarkQuery.parse(validateSingleParams(new URL(req.url),new Set(['q']))).q.toLocaleLowerCase()}catch{throw new ApiError(400,'INVALID_INPUT')}return success(LANDMARKS.filter(x=>x.name.toLowerCase().includes(q)).slice(0,20))});
