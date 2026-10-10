import {z} from 'zod';
export const Point=z.object({lat:z.number().finite().min(-90).max(90),lon:z.number().finite().min(-180).max(180)}).strict();
export const RouteInput=z.object({origin:Point,destination:Point,detour_fraction:z.number().finite().min(0).max(.30).default(.20),horizon_hours:z.union([z.literal(0),z.literal(1),z.literal(3)]).default(0),mode:z.enum(['live','scenario']).default('live'),scenario_id:z.string().regex(/^[a-z0-9-]{1,64}$/).optional(),frame_at:z.string().datetime({offset:true}).optional(),save_history:z.boolean().default(false)}).strict().superRefine((v,c)=>{if(v.mode==='scenario'&&(!v.scenario_id||!v.frame_at))c.addIssue({code:'custom',message:'Scenario and frame required'});if(v.mode==='live'&&(v.scenario_id||v.frame_at))c.addIssue({code:'custom',message:'Live request cannot include scenario fields'})});
export const ReportDraftInput=z.object({client_nonce:z.string().uuid(),edge_id:z.string().min(1).max(160),point:Point,observed_at:z.string().datetime({offset:true}),category:z.enum(['standing_water','heavy_water','blocked','clear']),note:z.string().max(500).default(''),photo_mime:z.enum(['image/jpeg','image/png','image/webp']).optional()}).strict();
export const FinalizeInput=z.object({has_photo:z.boolean()}).strict();
export const ModerationInput=z.object({expected_version:z.number().int().min(0),acknowledged_evidence:z.literal(true),action:z.enum(['approve','reject','resolve']),reason:z.string().min(5).max(1000),close_minutes:z.number().int().min(0).max(120).default(0),closure_scope:z.enum(['physical','directed']).default('physical')}).strict();
export const FlagsInput=z.object({aws_enabled:z.boolean().optional(),vision_enabled:z.boolean().optional(),photos_enabled:z.boolean().optional(),weather_ingest_enabled:z.boolean().optional()}).strict().refine(v=>Object.keys(v).length>0);
export const Id=z.string().uuid();
export const EmptyInput=z.object({}).strict();export const RetryInput=z.object({reason:z.string().min(5).max(300)}).strict();
export const Cursor=z.object({created_at:z.string().datetime({offset:true}),id:Id}).strict();
export const ListQuery=z.object({cursor:z.string().max(256).optional()}).strict();
export const ReviewQuery=ListQuery.extend({status:z.enum(['pending','approved','rejected','resolved']).default('pending')});
export const LandmarkQuery=z.object({q:z.string().max(60).default('')}).strict();
export const SegmentQuery=z.object({bbox:z.string().max(160),horizon_hours:z.enum(['0','1','3']).default('0')}).strict();
export type RouteRequest=z.infer<typeof RouteInput>;
export function validateSingleParams(url:URL,allowed:Set<string>){const entries=[...url.searchParams];const keys=new Set<string>();for(const [k] of entries){if(!allowed.has(k)||keys.has(k))throw new Error('INVALID_QUERY');keys.add(k)}return Object.fromEntries(entries)}
export function bbox(s:string){const xs=s.split(',').map(Number);if(xs.length!==4||xs.some(x=>!Number.isFinite(x))||xs[0]>=xs[2]||xs[1]>=xs[3]||xs[0]<-180||xs[2]>180||xs[1]<-90||xs[3]>90)throw new Error('INVALID_BBOX');const area=111320*(xs[3]-xs[1])*111320*Math.cos(((xs[1]+xs[3])/2)*Math.PI/180)*(xs[2]-xs[0])/1e6;if(area>25)throw new Error('BBOX_TOO_LARGE');return xs as [number,number,number,number]}
export function decodeCursor(value?:string){if(!value)return null;if(value.length>256||!/^[\w-]+$/.test(value))throw new Error('INVALID_CURSOR');const bin=Buffer.from(value,'base64url');if(bin.length>256)throw new Error('INVALID_CURSOR');return Cursor.parse(JSON.parse(bin.toString('utf8')))}
