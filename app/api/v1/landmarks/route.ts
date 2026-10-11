export const runtime='nodejs';
export const preferredRegion='bom1';
export const maxDuration=30;
import {handler} from '@/lib/server/http';import {success,ApiError} from '@/lib/server/errors';import {validateSingleParams,LandmarkQuery} from '@/packages/contracts';import {readFile} from 'node:fs/promises';import {join} from 'node:path';
export const GET=async(req:Request)=>handler(async()=>{let q;try{q=LandmarkQuery.parse(validateSingleParams(new URL(req.url),new Set(['q']))).q.toLocaleLowerCase()}catch{throw new ApiError(400,'INVALID_INPUT')}const landmarks=JSON.parse(await readFile(join(process.cwd(),'artifacts/landmarks.json'),'utf8')) as Array<{name:string}>;return success(landmarks.filter(x=>x.name.toLocaleLowerCase().includes(q)).slice(0,20))});
