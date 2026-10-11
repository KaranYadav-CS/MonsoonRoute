'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import type {RouteDecision} from '@/packages/engine/index';
import RouteCards from './RouteCards';
import EvidenceSheet from './EvidenceSheet';
const MapCanvas=dynamic(()=>import('./LiveMap'),{ssr:false,loading:()=> <div className="map" role="status">Loading the street map…</div>});
type Point={lat:number;lon:number};
type Landmark={id:string;name:string;point:Point};
type Config={graph_sha256:string;supported_bbox:[number,number,number,number]};
type Status={weather:{retrieved_at:string|null;age_minutes:number|null;archive_backend:string|null}};
const initialOrigin={lat:28.6289765,lon:77.2200133},initialDestination={lat:28.6221132,lon:77.2258604};
export default function RoutePlanner(){
 const [origin,setOrigin]=useState(initialOrigin),[destination,setDestination]=useState(initialDestination),[detour,setDetour]=useState(20),[horizon,setHorizon]=useState<0|1|3>(0);
 const [target,setTarget]=useState<'origin'|'destination'|'inspect'>('origin'),[save,setSave]=useState(false),[demo,setDemo]=useState(false),[lang,setLang]=useState<'en'|'hi'>('en');
 const [config,setConfig]=useState<Config|null>(null),[landmarks,setLandmarks]=useState<Landmark[]>([]),[status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<RouteDecision|null>(null);
 const previous=useRef<AbortController|null>(null),serial=useRef(0);
 const text=(en:string,hi:string)=>lang==='hi'?hi:en;
 useEffect(()=>{
  const ctl=new AbortController();let alive=true;
  void Promise.all([fetch('/api/v1/config',{signal:ctl.signal}).then(async r=>{if(!r.ok)throw Error('The planner could not load its road data. Please refresh.');return r.json()}),fetch('/api/v1/landmarks',{signal:ctl.signal}).then(r=>r.json())]).then(([c,l])=>{if(alive){setConfig(c.data);setLandmarks(l.data||[])}}).catch(e=>{if(alive)setMessage(e instanceof Error?e.message:'Could not load the planner.')});
  const refresh=()=>{if(document.hidden)return;void fetch('/api/v1/status',{signal:ctl.signal,cache:'no-store'}).then(r=>r.json()).then(j=>{if(alive&&j.data)setStatus(j.data)}).catch(()=>{})};
  refresh();const timer=window.setInterval(refresh,30000);return()=>{alive=false;ctl.abort();window.clearInterval(timer);previous.current?.abort()};
 },[]);
 function changed(){serial.current++;previous.current?.abort();setResult(null);setBusy(false);setMessage('')}
 const onPick=useCallback((p:Point)=>{serial.current++;previous.current?.abort();setResult(null);setBusy(false);setMessage('');if(target==='origin'){setOrigin(p);setTarget('destination')}else if(target==='destination')setDestination(p)},[target]);
 async function run(event:React.FormEvent){
  event.preventDefault();previous.current?.abort();const ctl=new AbortController();previous.current=ctl;const request=++serial.current;setBusy(true);setResult(null);setMessage('');
  try{
   const body={origin,destination,detour_fraction:detour/100,horizon_hours:demo?0:horizon,mode:demo?'scenario':'live',save_history:!demo&&save,...(demo?{scenario_id:'synthetic-grid',frame_at:'2026-10-10T12:00:00Z'}:{})};
   const response=await fetch('/api/v1/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal,cache:'no-store'});const json=await response.json();
   if(ctl.signal.aborted||request!==serial.current)return;if(!response.ok)throw Error(json.error?.message||'The trip could not be computed.');setResult(json.data);
  }catch(e){if(!ctl.signal.aborted&&request===serial.current)setMessage(e instanceof Error?e.message:'The planner could not be reached.')}finally{if(!ctl.signal.aborted&&request===serial.current)setBusy(false)}
 }
 const bounds=config?.supported_bbox??[77.200,28.610,77.240,28.650];
 return <div className="pageGrid"><form className="panel" onSubmit={run}>
  <div className="resultTop"><span className="indicator">Central Delhi · Car travel</span><button type="button" className="pickTarget" onClick={()=>setLang(lang==='en'?'hi':'en')}>{lang==='en'?'हिन्दी':'English'}</button></div>
  <h2>{text('Plan your journey','अपनी यात्रा की योजना बनाएँ')}</h2>
  {demo?<div className="notice warning" role="status"><strong>Synthetic learning scenario.</strong> Artificial roads and hypothetical rain; no current road condition is represented.</div>:<div className={'notice '+(status?.weather.age_minutes==null||status.weather.age_minutes>60?'warning':'')} role="status">{status?.weather.retrieved_at?<><strong>{status.weather.age_minutes!<=60?text('Recent weather evidence','हाल की मौसम जानकारी'):text('Weather is stale — closures and ordinary routes only','मौसम जानकारी पुरानी है — केवल मार्ग और बंद सड़कें')}</strong><div className="small">Open-Meteo · captured {new Date(status.weather.retrieved_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · {Math.max(0,Math.round(status.weather.age_minutes!))} min ago · {status.weather.archive_backend==='s3'?'AWS archived':'Provider capture'}</div></>:text('Checking weather freshness…','मौसम की जानकारी जाँची जा रही है…')}</div>}
  {(['origin','destination'] as const).map(field=>{const point=field==='origin'?origin:destination,set=field==='origin'?setOrigin:setDestination;return <fieldset className="journeyField" key={field}>
   <legend>{field==='origin'?text('From','कहाँ से'):text('To','कहाँ तक')}</legend>
   <select aria-label={field==='origin'?'Origin road junction':'Destination road junction'} value="" onChange={event=>{const anchor=landmarks.find(l=>l.id===event.target.value);if(anchor){changed();set(anchor.point)}}}>
    <option value="">{text('Choose a named road junction','सड़क जंक्शन चुनें')}</option>{landmarks.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
   </select>
   <details className="coordsDetails"><summary>{text('Coordinates / keyboard input','निर्देशांक / कीबोर्ड इनपुट')} · {point.lat.toFixed(5)}, {point.lon.toFixed(5)}</summary><div className="formGrid">{(['lat','lon'] as const).map(k=><div className="field" key={k}><label htmlFor={field+k}>{k==='lat'?text('Latitude','अक्षांश'):text('Longitude','देशांतर')}</label><input id={field+k} type="number" step="0.000001" required min={k==='lat'?bounds[1]:bounds[0]} max={k==='lat'?bounds[3]:bounds[2]} value={point[k]} onChange={e=>{changed();set({...point,[k]:Number(e.target.value)})}}/></div>)}</div></details>
  </fieldset>})}
  <div className="field"><label htmlFor="detour">{text('Maximum extra travel time','अधिकतम अतिरिक्त यात्रा समय')}: <strong>{detour}%</strong></label><input id="detour" type="range" min={0} max={30} value={detour} onChange={e=>{changed();setDetour(Number(e.target.value))}}/><div className="rangeLabels"><span>0%</span><span>30%</span></div></div>
  <div className="field"><label htmlFor="horizon">{text('Planning time','यात्रा का समय')}</label><select id="horizon" disabled={demo} value={horizon} onChange={e=>{changed();setHorizon(Number(e.target.value) as 0|1|3)}}><option value={0}>{text('Now','अभी')}</option><option value={1}>{text('In 1 hour','1 घंटे बाद')}</option><option value={3}>{text('In 3 hours','3 घंटे बाद')}</option></select></div>
  {!demo&&<label className="small checkRow"><input type="checkbox" checked={save} onChange={e=>setSave(e.target.checked)}/>{text('Save this journey to my private history','यह यात्रा मेरे निजी इतिहास में सहेजें')}</label>}
  <button className="btn" type="submit" disabled={busy||(!demo&&!config)}>{busy?text('Comparing routes…','मार्गों की तुलना जारी है…'):text('Compare routes →','मार्गों की तुलना करें →')}</button>
  {message&&<p className="error" role="alert">{message}</p>}<RouteCards result={result}/>
  <details className="scenarioDetails"><summary>{text('Explore a labeled learning scenario','शिक्षण परिदृश्य देखें')}</summary><label className="checkRow small"><input type="checkbox" checked={demo} onChange={e=>{changed();setDemo(e.target.checked);setSave(false);if(e.target.checked){setOrigin({lat:28.62396,lon:77.209});setDestination({lat:28.62396,lon:77.2109})}else{setOrigin(initialOrigin);setDestination(initialDestination)}}}/>Synthetic teaching exercise</label></details>
  <EvidenceSheet/>
 </form><div className="panel mapPanel"><div className="resultTop"><h2>{text('Central Delhi road network','मध्य दिल्ली का सड़क नेटवर्क')}</h2><span className="indicator">{demo?'Scenario':'Live evidence'}</span></div>
  <div className="pointPicker" role="group" aria-label="Map controls">{(['origin','destination','inspect'] as const).map((mode,i)=><button type="button" key={mode} className={'pickTarget '+(target===mode?'selected':'')} aria-pressed={target===mode} onClick={()=>setTarget(mode)}>{i===0?'1. Pick origin':i===1?'2. Pick destination':'Inspect evidence'}</button>)}</div>
  <MapCanvas onPick={target==='inspect'?undefined:onPick} demo={demo} origin={origin} destination={destination} result={result} horizon={horizon}/>
  <div className="mapLegend"><span><b style={{background:'#0b586d'}}/>Baseline</span><span><b style={{background:'#0d9488'}}/>Lower exposure</span><span>Dashed boundary · supported area</span></div>
  <p className="muted small">Named junctions are real road anchors. Point snapping is limited to 120 m; access distance is shown separately. Duration estimates exclude traffic.</p>
 </div></div>;
}
