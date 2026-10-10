import test from 'node:test';import assert from 'node:assert/strict';import {compareRoutes,validateGraph,risk,haversine,nearest} from '../../packages/engine/index.ts';
const now=new Date('2026-10-10T12:00:00Z'),stamp=now.toISOString(),sha='a'.repeat(64);
const graph={version:'synthetic-test',sha256:sha,nodes:[{id:'A',lat:28.63,lon:77.21},{id:'B',lat:28.63,lon:77.2105},{id:'C',lat:28.6305,lon:77.2105},{id:'D',lat:28.6305,lon:77.211}],edges:[
{id:'a',from:'A',to:'B',length_m:60,time_s:10,hotspot_factor:.9,depression_factor:.8,underpass:true,terrain_valid:true,geom:[[77.21,28.63],[77.2105,28.63]]},
{id:'b',from:'B',to:'D',length_m:60,time_s:10,hotspot_factor:1,depression_factor:.8,underpass:true,terrain_valid:true,geom:[[77.2105,28.63],[77.211,28.6305]]},
{id:'c',from:'A',to:'C',length_m:60,time_s:11,hotspot_factor:0,depression_factor:0,underpass:false,terrain_valid:true,geom:[[77.21,28.63],[77.2105,28.6305]]},
{id:'d',from:'C',to:'D',length_m:60,time_s:11,hotspot_factor:0,depression_factor:0,underpass:false,terrain_valid:true,geom:[[77.2105,28.6305],[77.211,28.6305]]}],turn_restrictions:[]};
const weather={r1_past:18,r3_past:32,r1_future:10,r3_future:20,retrieved_at:stamp};const A={lat:28.63,lon:77.21},D={lat:28.6305,lon:77.211};
test('graph topology validated',()=>assert.equal(validateGraph(graph),true));
test('repeated edge IDs rejected',()=>assert.throws(()=>validateGraph({...graph,edges:[...graph.edges,graph.edges[0]]}),/EDGE_INVALID/));
test('turn topology rejected',()=>assert.throws(()=>validateGraph({...graph,turn_restrictions:[{from_edge:'a',to_edge:'c',via_node:'B'}]}),/TURN_TOPOLOGY_INVALID/));
test('distance is symmetric',()=>assert.ok(Math.abs(haversine(A,D)-haversine(D,A))<1e-9));
test('snap refuses outside pilot',()=>assert.throws(()=>nearest(graph,{lat:21,lon:77}),/POINT_OUT_OF_PILOT/));
test('risk formula stays bounded',()=>assert.ok(risk(graph.edges[0],weather,[],now,stamp).risk_index<=1));
test('stale weather abstains',()=>assert.equal(risk(graph.edges[0],{...weather,retrieved_at:'2026-10-10T10:30:00Z'},[],now,stamp).risk_index,null));
test('clear report cannot reduce risk',()=>{const base=risk(graph.edges[0],weather,[],now,stamp).risk_index;assert.equal(risk(graph.edges[0],weather,[{edge_id:'a',category:'clear',approved:true,observed_at:stamp}],now,stamp).risk_index,base)});
test('approved heavy water raises risk',()=>{const base=risk(graph.edges[0],weather,[],now,stamp).risk_index;assert.ok(risk(graph.edges[0],weather,[{edge_id:'a',category:'heavy_water',approved:true,observed_at:stamp}],now,stamp).risk_index>base)});
test('detour=0 produces no over-cap recommendation',()=>{const d=compareRoutes(graph,A,D,0,weather,[],new Set(),now,stamp);assert.ok(!d.recommendation||d.recommendation.estimated_time_s<=d.comparison.estimated_time_cap_s)});
test('20% detour permits lower exposure path',()=>{const d=compareRoutes(graph,A,D,.2,weather,[],new Set(),now,stamp);assert.equal(d.baseline.edge_ids.join(','),'a,b');assert.deepEqual(d.recommendation?.edge_ids,['c','d']);assert.ok((d.comparison.modeled_exposure_reduction_pct||0)>0)});
test('known closure never recommended',()=>{const d=compareRoutes(graph,A,D,.2,weather,[],new Set(['b']),now,stamp);assert.ok(!d.recommendation?.edge_ids.includes('b'));assert.equal(d.baseline.active_closure_count,1)});
test('all closures causes no feasible route',()=>{const d=compareRoutes(graph,A,D,.2,weather,[],new Set(['b','d']),now,stamp);assert.equal(d.status,'no_feasible_route');assert.equal(d.recommendation,null)});
test('weather unknown prevents recommendation',()=>{const d=compareRoutes(graph,A,D,.2,null,[],new Set(),now,stamp);assert.equal(d.status,'conditions_unknown');assert.equal(d.recommendation,null)});
test('invalid detour rejected',()=>assert.throws(()=>compareRoutes(graph,A,D,.32,weather,[],new Set(),now,stamp),/DETOUR_INVALID/));
test('origin=destination rejected',()=>assert.throws(()=>compareRoutes(graph,A,A,.2,weather,[],new Set(),now,stamp),/TRIP_TOO_SHORT/));
test('banned turn cannot be used',()=>{const g={...graph,turn_restrictions:[{from_edge:'a',to_edge:'b',via_node:'B'}]};const d=compareRoutes(g,A,D,.2,weather,[],new Set(),now,stamp);assert.deepEqual(d.baseline.edge_ids,['c','d'])});
