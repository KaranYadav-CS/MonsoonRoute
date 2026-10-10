"""Optional Chromium UI regression without any network requests or npm install.

Requires Python Playwright and a Chromium executable. Statically injects the same
original browser ESM and JSON fixture that the /demo/ page loads when served.
The preview screenshots are an execution record, not a substitute for Next E2E.
"""
from __future__ import annotations
import base64,json,os,pathlib

ROOT=pathlib.Path(__file__).resolve().parents[1]

def check():
    from playwright.sync_api import sync_playwright
    html=(ROOT/'demo/index.html').read_text().replace('<script type="module" src="./app.mjs"></script>','')
    for asset in ('monsoon-mark.svg','monsoon-city.svg'):
        src=(ROOT/'public/brand'/asset).read_bytes()
        html=html.replace('../public/brand/'+asset,'data:image/svg+xml;base64,'+base64.b64encode(src).decode())
    engine=(ROOT/'demo/engine.mjs').read_text().replace("import { PILOT_BBOX } from './constants.mjs';",(ROOT/'demo/constants.mjs').read_text().replace('export const ','const ')).replace('export function ','function ')
    app=(ROOT/'demo/app.mjs').read_text().replace("import {compareRoutes} from './engine.mjs';",'')
    fixture_js='const __g='+json.dumps(json.loads((ROOT/'artifacts/synthetic-graph.json').read_text()))+';const __w='+json.dumps(json.loads((ROOT/'artifacts/synthetic-scenario.json').read_text()))+';window.fetch=async (url)=>({ok:true,json:async()=>String(url).includes("graph")?__g:__w});'
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        for width,height in ((1440,900),(390,844)):
            page=b.new_page(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=(width==390),has_touch=(width==390))
            errors=[]
            page.on('pageerror',lambda exc:errors.append(str(exc)))
            page.set_content(html,wait_until='domcontentloaded')
            page.evaluate(fixture_js+'\n'+engine+'\n'+app)
            page.wait_for_function("document.querySelectorAll('#metrics article').length===3",timeout=15000)
            assert 'Lower relative-exposure candidate' in page.locator('#status').inner_text()
            assert page.locator('#network path').count()>100
            assert not page.evaluate('document.documentElement.scrollWidth>window.innerWidth')
            assert not errors,errors
            if width==1440:
                page.locator('#detour').fill('0')
                assert 'No strictly lower-exposure' in page.locator('#status').inner_text()
                page.locator('#detour').fill('30')
                assert 'candidate' in page.locator('#status').inner_text().lower()
            path=ROOT/'docs'/f'p4-ui-{width}.png'
            page.screenshot(path=str(path),full_page=True)
            print(f'PASS desktop/mobile {width}x{height}: 3 metrics, {page.locator("#network path").count()} paths, zero errors and overflow')
            page.close()
        b.close()
if __name__=='__main__':check()
