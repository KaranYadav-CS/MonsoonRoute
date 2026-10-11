import 'server-only';
import type {Point} from '@/packages/engine/index';
import {loadGraph} from './graph';
import {serviceDB} from './supabase';
import {ApiError} from './errors';
export function readPoint(value:unknown):Point|null {
 if(value&&typeof value==='object'&&'coordinates' in value){const c=(value as {coordinates:number[]}).coordinates;return {lon:c[0],lat:c[1]}}
 if(typeof value!=='string'||!/^[a-f0-9]+$/i.test(value))return null;
 const b=Buffer.from(value,'hex');if(b.length<21)return null;const little=b[0]===1,type=little?b.readUInt32LE(1):b.readUInt32BE(1),offset=(type&0x20000000)?9:5;
 if(b.length<offset+16)return null;const read=(i:number)=>little?b.readDoubleLE(i):b.readDoubleBE(i);return {lon:read(offset),lat:read(offset+8)};
}
export type Row={id:string;graph_id:string;edge_id:string;point:unknown;observed_at:string;expires_at:string;category:string;note:string;status:string;review_version:number;review_reason:string|null;reviewed_at:string|null;created_at:string;photo_original_path:string|null;photo_processed_path:string|null};
export async function reportData(row:Row){
 const {graph}=await loadGraph();const edge=graph.edges.find(e=>e.id===row.edge_id);
 const {data:job,error}=await serviceDB().from('vision_jobs').select('id,report_id,state,attempts,result,error_code,created_at,updated_at').eq('report_id',row.id).maybeSingle();if(error)throw new ApiError(503,'BACKEND_UNAVAILABLE');
 return {id:row.id,graph_version:row.graph_id,edge_id:row.edge_id,road_name:edge?.name||'Unnamed road',point:readPoint(row.point),observed_at:row.observed_at,expires_at:row.expires_at,category:row.category,note:row.note,status:row.status,review_version:row.review_version,review_reason:row.review_reason,reviewed_at:row.reviewed_at,created_at:row.created_at,has_photo:!!(row.photo_original_path||row.photo_processed_path),photo_ready:!!row.photo_processed_path,job:job?{id:job.id,report_id:job.report_id,state:job.state,attempts:job.attempts,advisory:job.result?.advisory??null,scores:job.result?.scores??null,model_id:job.result?.model_id??null,model_revision:job.result?.model_revision??null,calibrated:false,error_code:job.error_code,created_at:job.created_at,updated_at:job.updated_at}:null};
}
export const REPORT_FIELDS='id,graph_id,edge_id,point,observed_at,expires_at,category,note,status,review_version,review_reason,reviewed_at,created_at,photo_original_path,photo_processed_path';
