import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {compareRoutes,validateGraph,risk} from '../../packages/engine/index.ts';
const graph=JSON.parse(fs.readFileSync('artifacts/synthetic-graph.json','utf8'));
const scenario=JSON.parse(fs.readFileSync('artifacts/synthetic-scenario.json','utf8'));
const find=id=>graph.nodes.find(n=>n.id===id);
const now=new Date(scenario.effective_at);
test('synthetic graph has bidirectional 36-node geometry',()=>{assert.equal(graph.nodes.length,36);assert.equal(graph.edges.length,120);assert.equal(validateGraph(graph),true)});
test('synthetic scenario provenance is conspicuously distinct from live',()=>{assert.equal(scenario.kind,'synthetic');assert.match(scenario.disclaimer,/not.*guidance/i);assert.equal(scenario.graph_sha256,graph.sha256)});
test('synthetic fixture yields bounded lower exposure route at 30 percent',()=>{
 const result=compareRoutes(graph,find('p2-0'),find('p2-5'),.3,scenario.weather,[],new Set(),now,scenario.effective_at);
 assert.equal(result.status,'ok');assert.ok(result.recommendation);assert.ok(result.recommendation.estimated_time_s<=result.comparison.estimated_time_cap_s+1e-6);assert.ok(result.comparison.modeled_exposure_reduction_pct>0);
});
test('synthetic fixture never returns a recommendation when weather is missing',()=>{const r=compareRoutes(graph,find('p2-0'),find('p2-5'),.3,null,[],new Set(),now,scenario.effective_at);assert.equal(r.recommendation,null);assert.equal(r.status,'conditions_unknown')});
test('synthetic fixture rejects non-pilot coordinates',()=>assert.throws(()=>compareRoutes(graph,{lat:0,lon:0},find('p2-5'),.3,scenario.weather,[],new Set(),now,scenario.effective_at),/POINT_OUT_OF_PILOT/));
test('closure never enters the recommended option',()=>{const c=new Set(graph.edges.filter(e=>e.from==='p2-2').map(e=>e.id));const r=compareRoutes(graph,find('p2-0'),find('p2-5'),.3,scenario.weather,[],c,now,scenario.effective_at);assert.ok(!r.recommendation?.edge_ids.some(id=>c.has(id)))});
