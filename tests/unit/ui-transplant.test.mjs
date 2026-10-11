import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.cwd();
const baseline=JSON.parse(readFileSync(join(root,'docs/ui-transplant-baseline.json'),'utf8'));
const read=path=>readFileSync(join(root,path),'utf8');
const hash=path=>createHash('sha256').update(readFileSync(join(root,path))).digest('hex');
function gather(path){return readdirSync(join(root,path),{withFileTypes:true}).flatMap(e=>e.isDirectory()?gather(path+'/'+e.name):[path+'/'+e.name])}

test('production pages, API endpoints and auth callbacks preserve their original paths',()=>{
 const current=gather('app').filter(p=>p.endsWith('/page.tsx')||p.endsWith('/route.ts')).sort();
 assert.deepEqual(current,baseline.production_page_and_api_file_paths);
});

test('backend implementations, database schemas, worker and original workflow components remain byte-identical',()=>{
 for(const [path,sha] of Object.entries(baseline.immutable_backend_and_workflow_checksums)){
  assert.ok(existsSync(join(root,path)),`missing original file: ${path}`);
  assert.equal(hash(path),sha,`unexpected production business logic change: ${path}`);
 }
});

test('the reference frontend is never imported as an application/router',()=>{
 assert.equal(existsSync(join(root,'Frontend')),false);
 for(const f of gather('app').filter(f=>f.endsWith('.tsx'))){const s=read(f);assert.doesNotMatch(s,/\.\.\/Frontend|\/Frontend\/|\.html(?:\?|\")/i,f)}
});

test('visual navigation keeps original destinations and real authentication entry point',()=>{
 const header=read('components/SiteHeader.tsx');
 for(const route of ['/', '/plan','/report','/analyze','/review','/history','/methodology','/account','/auth/login','/auth/signup']){
  assert.ok(header.includes(`'${route}'`)||header.includes(`"${route}"`),`missing navigation destination ${route}`);
 }
 assert.match(header,/aria-expanded=\{menuOpen\}/);
 assert.match(header,/aria-current=\{pathname===/);
});

test('all referenced /ui design images exist and are WebP only',()=>{
 const tsx=[...gather('app'),...gather('components')].filter(p=>p.endsWith('.tsx'));
 const css=read('app/globals.css');
 const refs=new Set([...tsx.map(read).join('\n').matchAll(/\/ui\/([\w-]+\.webp)/g),...css.matchAll(/\/ui\/([\w-]+\.webp)/g)].map(m=>m[1]));
 assert.ok(refs.size>=10,`only ${refs.size} referenced images found`);
 for(const ref of refs)assert.ok(existsSync(join(root,'public/ui',ref)),`missing design asset ${ref}`);
 const size=readdirSync(join(root,'public/ui')).reduce((n,f)=>n+readFileSync(join(root,'public/ui',f)).length,0);
 assert.ok(size<3*1024*1024,`UI transfer unexpectedly large: ${size} bytes`);
});

test('responsive breakpoints and reduced-motion preference are defined',()=>{
 const css=read('app/globals.css');
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
