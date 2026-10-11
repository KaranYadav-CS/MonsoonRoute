export const runtime='nodejs';
export const preferredRegion='bom1';
import {handler} from '@/lib/server/http';
import {success} from '@/lib/server/errors';
export const GET=async()=>handler(async()=>success([{id:'synthetic-grid',title:'Synthetic grid — routing logic exercise',kind:'synthetic',start_at:'2026-10-10T12:00:00Z',end_at:'2026-10-10T12:00:00Z',description:'Artificial road topology and hypothetical rainfall. Not Central Delhi road guidance.',public_visible:true}]));
