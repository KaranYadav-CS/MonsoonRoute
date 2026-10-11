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
  await expect(map).toContainText('REAL STREET BASEMAP');
  await expect(map).toContainText('NOT FOR NAVIGATION');
  await expect(page.getByRole('button',{name:/Compare routes/})).toBeVisible();
});

test('live guidance stays unavailable without reviewed graph and backend',async({page})=>{
  await page.goto('/plan');
  await expect(page.getByText(/LIVE FLOOD RISK UNAVAILABLE/)).toHaveCount(0);
  await expect(page.getByText(/NOT FOR NAVIGATION/).first()).toBeVisible();
});
