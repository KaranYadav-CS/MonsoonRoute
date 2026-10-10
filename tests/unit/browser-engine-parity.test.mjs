import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRoutes as source} from '../../packages/engine/index.ts';
import {compareRoutes as browser} from '../../demo/engine.mjs';
const graph=JSON.parse(readFileSync(new URL('../../artifacts/synthetic-graph.json',import.meta.url),'utf8'));
const fixture=JSON.parse(readFileSync(new URL('../../artifacts/synthetic-scenario.json',import.meta.url),'utf8'));
const node=id=>graph.nodes.find(n=>n.id===id);
function deterministic(receipt){const result=structuredClone(receipt);delete result.search.elapsed_ms;return result}
for (const fraction of [0,.1,.2,.3]){
 test(`browser bundle matches pure routing engine with ${Math.round(fraction*100)}% detour`,()=>{
  const args=[graph,node('p2-0'),node('p2-5'),fraction,fixture.weather,[],new Set(),new Date(fixture.effective_at),fixture.effective_at];
  assert.deepEqual(deterministic(source(...args)),deterministic(browser(...args)));
 });
}
