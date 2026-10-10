import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const r=process.cwd();
function walk(dir){let results=[];for(const x of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(x.name))continue;const p=path.join(dir,x.name);if(x.isDirectory())results.push(...walk(p));else results.push(p)}return results}
const files=walk(r).filter(p=>/\.(tsx?|jsx?|py|yaml|yml|json)$/.test(p)&&!p.endsWith('package-lock.json'));
test('no source code embeds Supabase service JWT',()=>{for(const p of files){const s=fs.readFileSync(p,'utf8');assert.doesNotMatch(s,/eyJhbGciOi[A-Za-z0-9._-]{80,}/,p)}});
test('no route handlers are configured for edge runtime',()=>{for(const p of files.filter(x=>x.includes('/app/api/')))assert.doesNotMatch(fs.readFileSync(p,'utf8'),/runtime\s*=\s*['"]edge['"]/,p)});
test('no production public upload to GitHub in workflow',()=>{for(const p of files.filter(x=>x.includes('.github/workflows/')))assert.doesNotMatch(fs.readFileSync(p,'utf8'),/gh\s+repo\s+edit.*visibility/,p)});
test('no public source file includes a private backend role key',()=>{for(const p of files.filter(x=>x.startsWith(path.join(r,'public'))))assert.doesNotMatch(fs.readFileSync(p,'utf8'),/SUPABASE_SERVICE_ROLE_KEY/,p)});
