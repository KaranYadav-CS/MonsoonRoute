import {test,expect} from '@playwright/test';
test('map worker, streets, pins and genuine route calculation load',async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const worker=await request.get('/vendor/maplibre/6.14.0/maplibre-gl-worker.mjs');expect(worker.ok()).toBeTruthy();expect(worker.headers()['content-type']).toMatch(/javascript/);
 await page.goto('/plan');await expect(page.getByRole('application')).toHaveAttribute('data-map-ready','true',{timeout:30000});
 expect(await page.locator('input').evaluateAll(es=>es.every(e=>(e as HTMLInputElement).validity.valid))).toBeTruthy();
 await page.getByRole('button',{name:'Compare routes →',exact:true}).click();await expect(page.getByRole('heading',{name:'Comparison results'})).toBeVisible({timeout:20000});
 await expect(page.getByText('Fastest baseline',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('live APIs provide a published real graph, current archived weather and junctions',async({request})=>{
 const c=await request.get('/api/v1/config');expect(c.ok()).toBeTruthy();const config=(await c.json()).data;expect(config.graph_sha256).toMatch(/^[a-f0-9]{64}$/);expect(config.image_analysis_available).toBeTruthy();expect(config.vision_available).toBeTruthy();
 const s=await request.get('/api/v1/status');const status=(await s.json()).data;expect(status.components.database.status).toBe('healthy');expect(status.weather.age_minutes).toBeLessThan(60);expect(status.weather.archive_backend).toBe('s3');
 const l=await request.get('/api/v1/landmarks');expect((await l.json()).data.length).toBeGreaterThan(10);
});
test('private review, report history and photos require authentication',async({request})=>{
 for(const endpoint of ['/api/v1/review/reports','/api/v1/me/reports','/api/v1/me/routes'])expect((await request.get(endpoint)).status()).toBe(401);
 const r=await request.post('/api/v1/analyze',{headers:{origin:'https://monsoon-route-omega.vercel.app'}});expect(r.status()).toBe(401);
});
test('desktop navigation and email authentication pages work',async({page})=>{
 await page.goto('/');const nav=page.getByRole('navigation',{name:'Main navigation'});
 for(const [name,path] of [['Plan','/plan'],['Report','/report'],['Analyze','/analyze'],['Review','/review'],['History','/history'],['Methodology','/methodology']]){await nav.getByRole('link',{name,exact:true}).click();await expect(page).toHaveURL(new RegExp(path+'$'));await expect(page.getByRole('heading',{level:1})).toBeVisible()}
 await page.goto('/auth/login');await expect(page.getByLabel('Email address')).toBeVisible();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();await expect(page.getByText('Continue with GitHub')).toHaveCount(0);
});
test('mobile navigation and planner have no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Plan',exact:true}).click();await expect(page).toHaveURL(/\/plan$/);await expect(page.getByRole('button',{name:'Menu',exact:true})).toHaveAttribute('aria-expanded','false');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();await expect(page.locator('#detour')).toBeVisible();
});
