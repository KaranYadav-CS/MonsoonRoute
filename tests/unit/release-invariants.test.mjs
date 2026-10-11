import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRoutes,risk,haversine} from '../../packages/engine/index.ts';
let seed=20261011;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const time=new Date('2026-10-11T14:00:00Z'),weather={r1_past:10,r3_past:20,r1_future:5,r3_future:10,retrieved_at:time.toISOString()};
for(let index=0;index<200;index++)test(`directed graph ${index}: exhaustive baseline, closure and detour invariants`,()=>{
 const nodes=Array.from({length:6},(_,i)=>({id:'n'+i,lat:28.626+i*.0001,lon:77.218+i*.0001}));const edges=[];
 for(const a of nodes)for(const b of nodes){if(a===b||random()>.37)continue;const length=haversine(a,b);edges.push({id:a.id+'-'+b.id,from:a.id,to:b.id,length_m:length,time_s:2+length/(3+random()*8),hotspot_factor:random(),depression_factor:random(),underpass:false,terrain_valid:true,geom:[[a.lon,a.lat],[b.lon,b.lat]]})}
 const graph={version:'synthetic-property',sha256:'f'.repeat(64),nodes,edges,turn_restrictions:[]},closed=new Set(edges.filter(()=>random()<.15).map(e=>e.id));
 const outgoing=node=>edges.filter(e=>e.from===node),degree=node=>outgoing(node).length;
 let exhaustive=Infinity;
 function walk(node,cost,visited,previous){if(node==='n5'){exhaustive=Math.min(exhaustive,cost);return}for(const e of outgoing(node))if(!visited.has(e.to))walk(e.to,cost+e.time_s+(previous&&degree(node)>=3?5:0),new Set([...visited,e.to]),e.id)}
 walk('n0',0,new Set(['n0']),'');
 if(exhaustive===Infinity){assert.throws(()=>compareRoutes(graph,nodes[0],nodes[5],.2,weather,[],closed,time,time.toISOString()),/NO_NETWORK_ROUTE/);return}
 const result=compareRoutes(graph,nodes[0],nodes[5],index%4/10,weather,[],closed,time,time.toISOString());
 assert.ok(Math.abs(result.baseline.estimated_time_s-exhaustive)<1e-7);
 for(const option of [result.recommendation,...result.alternatives].filter(Boolean)){assert.ok(option.legal);assert.ok(option.within_detour_cap);assert.ok(option.estimated_time_s<=result.comparison.estimated_time_cap_s+1e-6);assert.equal(option.active_closure_count,0);assert.ok(option.edge_ids.every(id=>!closed.has(id)))}
});
const edge={id:'f',from:'a',to:'b',length_m:50,time_s:10,hotspot_factor:0,depression_factor:0,underpass:false,terrain_valid:true,geom:[[77.218,28.626],[77.219,28.626]]};
test('future horizon uses capture age rather than advancing freshness by three hours',()=>assert.notEqual(risk(edge,weather,[],new Date(time.getTime()+10800000),time.toISOString(),time).risk_index,null));
test('future-tolerated observation is clamped and cannot amplify severity',()=>{const value=risk(edge,{...weather,r1_past:0,r3_past:0,r1_future:0,r3_future:0},[{edge_id:'f',category:'blocked',observed_at:new Date(time.getTime()+240000).toISOString(),approved:true}],time,time.toISOString());assert.ok(Math.abs(value.risk_index-.65)<1e-8)});
test('expired report cannot affect future horizon',()=>{const future=new Date(time.getTime()+10800000);const evidence=[{edge_id:'f',category:'blocked',observed_at:time.toISOString(),expires_at:new Date(time.getTime()+3600000).toISOString(),approved:true}];assert.equal(risk(edge,weather,evidence,future,time.toISOString(),time).risk_index,risk(edge,weather,[],future,time.toISOString(),time).risk_index)});
