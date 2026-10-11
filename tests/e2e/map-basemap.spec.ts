import {test,expect} from '@playwright/test';

test('actual Central Delhi basemap is configured and reachable',async({page,request})=>{
  const style=await request.get('https://tiles.openfreemap.org/styles/liberty',{timeout:20000});
  expect(style.ok()).toBeTruthy();
  const json=await style.json();
  expect(json.version).toBe(8);
  expect(json.sources?.openmaptiles?.type).toBe('vector');
  await page.goto('/plan');
  await expect(page.getByRole('heading',{name:/Evidence-aware route planning/})).toBeVisible();
  const map=page.getByRole('application');
  await expect(map).toContainText('REAL OSM STREET BASEMAP');
  await expect(map).toContainText('LIVE FLOOD RISK UNAVAILABLE');
  await expect(page.getByRole('button',{name:/Compare verified routes/})).toBeVisible();
});

test('live guidance stays unavailable without reviewed graph and backend',async({page})=>{
  await page.goto('/plan');
  await expect(page.getByText(/LIVE FLOOD RISK UNAVAILABLE/).first()).toBeVisible();
  await expect(page.getByRole('button',{name:/Compare verified routes/})).toBeDisabled();
});

test('WhatsApp preview share link points to the deployed, explicitly non-navigational research page',async({page})=>{
  await page.goto('/plan');
  const share=page.getByRole('link',{name:/Share this research preview on WhatsApp/});
  await expect(share).toBeVisible();
  const href=await share.getAttribute('href');
  expect(href).toBeTruthy();
  const url=new URL(href!);
  expect(url.hostname).toBe('wa.me');
  const message=url.searchParams.get('text')??'';
  expect(message).toContain('not verified navigation');
  expect(message).toContain('https://monsoon-route-omega.vercel.app/plan');
  await expect(share).toHaveAttribute('rel',/noopener noreferrer/);
});

test('desktop header links actually navigate to each application route',async({page})=>{
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Main navigation'});
  for(const [label,path,heading] of [
    ['Plan','/plan','Evidence-aware route planning'],
    ['Report','/report','Report a local road condition'],
    ['Review','/review','Review observations'],
    ['History','/history','Saved journeys'],
    ['Methodology','/methodology','Explain the model']
  ] as const){
    await nav.getByRole('link',{name:label,exact:true}).click();
    await expect(page).toHaveURL(new RegExp(path+'$'));
    await expect(page.getByRole('heading',{name:new RegExp(heading)})).toBeVisible();
    await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','page');
  }
  await nav.getByRole('link',{name:'Log in / Sign up'}).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password', {exact:true})).toBeVisible();
  await expect(page.getByText('Continue with GitHub')).toHaveCount(0);
});

test('mobile navigation opens, follows links and closes after navigation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const toggle=page.getByRole('button',{name:'Menu'});
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('button',{name:'Close menu'})).toHaveAttribute('aria-expanded','true');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Report'}).click();
  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByRole('button',{name:'Menu'})).toHaveAttribute('aria-expanded','false');
  await expect(page.getByRole('heading',{name:/Report a local road condition/})).toBeVisible();
});

test('supabase email signup, recovery and private report gate are present',async({page})=>{
  await page.goto('/auth/signup');
  await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Confirm password')).toBeVisible();
  await page.goto('/auth/forgot-password');
  await expect(page.getByRole('button',{name:'Send reset link'})).toBeVisible();
  await page.goto('/report');
  await expect(page.getByText('Continue with GitHub')).toHaveCount(0);
});

test('real map is default and simulated learning routes require explicit opt-in',async({page})=>{
  await page.goto('/plan');
  await expect(page.getByRole('heading',{name:/Real Central Delhi map/})).toBeVisible();
  await expect(page.getByRole('button',{name:/Compare verified routes/})).toBeDisabled();
  await expect(page.getByText(/Real flood-risk routing is not yet available/)).toBeVisible();
  const checkbox=page.getByRole('checkbox',{name:/Optional: synthetic teaching exercise/});
  await checkbox.check();
  await expect(page.getByRole('button',{name:'Run synthetic comparison'})).toBeEnabled();
  await expect(page.getByText(/Artificial streets and hypothetical rainfall/)).toBeVisible();
});

test('map point picker advances from origin to destination on real basemap clicks',async({page})=>{
  await page.goto('/plan');
  const map=page.getByRole('application');
  await expect(map).toBeVisible();
  const originButton=page.getByRole('button',{name:'1. Pick origin'});
  const destinationButton=page.getByRole('button',{name:'2. Pick destination'});
  await expect(originButton).toHaveAttribute('aria-pressed','true');
  const originBefore=await page.locator('#originlat').inputValue();
  await map.click({position:{x:190,y:170}});
  await expect(destinationButton).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('#originlat').inputValue()).not.toBe(originBefore);
  const destinationBefore=await page.locator('#destinationlat').inputValue();
  await map.click({position:{x:330,y:260}});
  await expect.poll(()=>page.locator('#destinationlat').inputValue()).not.toBe(destinationBefore);
  await destinationButton.click();
  await expect(destinationButton).toHaveAttribute('aria-pressed','true');
});

test('community road observations use a real-location intake, never a fabricated segment ID',async({page})=>{
  await page.goto('/report');
  await expect(page.getByRole('heading',{name:/Report a local road condition/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Report what you observed'})).toBeVisible();
  await expect(page.getByText(/pending human triage/).first()).toBeVisible();
  await expect(page.getByText(/fabricated road ID/).first()).toBeVisible();
  await expect(page.getByText('Community report submission is temporarily unavailable.')).toHaveCount(0);
});

test('experimental AWS model page discloses safety boundaries and requires sign in',async({page})=>{
  await page.goto('/analyze');
  await expect(page.getByRole('heading',{name:'Flood image analysis'})).toBeVisible();
  await expect(page.getByRole('heading',{name:/Analyze a flood-scene photo/})).toBeVisible();
  await expect(page.getByText(/No road-safety decision/)).toBeVisible();
  await expect(page.getByText(/Image predictions never create a road closure/)).toBeVisible();
  await expect(page.getByLabel('Choose a photo (up to 3 MiB)')).toHaveCount(0);
});

test('mobile navigation reaches private observation and image-analysis pages',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:'Menu'}).click();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Report'}).click();
  await expect(page).toHaveURL(/\/report$/);
  await page.getByRole('button',{name:'Menu'}).click();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Analyze'}).click();
  await expect(page).toHaveURL(/\/analyze$/);
  await expect(page.getByRole('button',{name:'Menu'})).toHaveAttribute('aria-expanded','false');
});
