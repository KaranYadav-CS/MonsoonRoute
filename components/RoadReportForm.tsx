'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {browserClient} from '@/lib/browser/supabase';
const Picker=dynamic(()=>import('./PilotPointPicker'),{ssr:false});
type Point={lat:number;lon:number};
type Road={id:string;name:string;coordinates:number[][]};
function distance(point:Point,road:Road){
 const factor=111320*Math.cos(point.lat*Math.PI/180);let closest=Infinity;
 for(let i=1;i<road.coordinates.length;i++){const a=road.coordinates[i-1],b=road.coordinates[i],ax=(a[0]-point.lon)*factor,ay=(a[1]-point.lat)*111320,bx=(b[0]-point.lon)*factor,by=(b[1]-point.lat)*111320,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));closest=Math.min(closest,Math.hypot(ax+t*dx,ay+t*dy))}return closest;
}
function localNow(){const d=new Date(Date.now()-60000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
export default function RoadReportForm(){
 const [signedIn,setSignedIn]=useState<boolean|null>(null),[roads,setRoads]=useState<Road[]>([]),[point,setPoint]=useState<Point>({lat:28.6289765,lon:77.2200133}),[category,setCategory]=useState('standing_water'),[observed,setObserved]=useState(localNow),[note,setNote]=useState(''),[photo,setPhoto]=useState<File|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[id,setId]=useState<string|null>(null);
 const nonce=useRef<string|null>(null);
 useEffect(()=>{let alive=true;const ctl=new AbortController();
  void browserClient().auth.getUser().then(({data})=>{if(alive)setSignedIn(!!data.user)}).catch(()=>{if(alive)setSignedIn(false)});
  void fetch('/api/v1/config',{signal:ctl.signal}).then(r=>r.json()).then(c=>{if(!c.data?.roads_geojson_url)throw Error('Road data could not be loaded.');return fetch(c.data.roads_geojson_url,{signal:ctl.signal})}).then(r=>r.json()).then(j=>{if(alive)setRoads(j.features.map((f:{id:string;properties:{edge_id:string;name:string|null};geometry:{coordinates:number[][]}})=>({id:f.properties.edge_id||f.id,name:f.properties.name||'Unnamed road',coordinates:f.geometry.coordinates})))}).catch(()=>{if(alive)setMessage('The road data could not be loaded. Refresh to retry.')});
  return()=>{alive=false;ctl.abort()};
 },[]);
 const selected=useMemo(()=>{let road:Road|null=null,best=Infinity;for(const r of roads){const d=distance(point,r);if(d<best){best=d;road=r}}return road&&best<=100?{road,distance:best}:null},[point,roads]);
 function change(){nonce.current=null;setId(null);setMessage('')}
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!selected||!consent||busy)return;setBusy(true);setMessage('');nonce.current??=crypto.randomUUID();
  try{
   if(photo&&(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>3145728||!photo.size))throw Error('Choose a JPEG, PNG or WebP smaller than 3 MiB.');
   const body={client_nonce:nonce.current,edge_id:selected.road.id,point,category,observed_at:new Date(observed).toISOString(),note:note.trim(),...(photo?{photo_mime:photo.type}:{})};
   const draft=await fetch('/api/v1/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),j=await draft.json();if(!draft.ok)throw Error(j.error?.message||'The report could not be created.');
   if(j.data.status!=='draft'){setId(j.data.report_id);setMessage('Your existing report is ready to view.');return}
   if(photo){if(!j.data.upload)throw Error('Photo upload authorization could not be obtained.');const storage=browserClient().storage.from(j.data.upload.bucket);const upload=await storage.upload(j.data.upload.path,photo,{upsert:false,contentType:photo.type});if(upload.error){const existing=await storage.info(j.data.upload.path);if(existing.error||!existing.data||existing.data.size!==photo.size)throw Error('Private photo upload failed. Retry this submission.');}}
   const finalized=await fetch('/api/v1/reports/'+j.data.report_id+'/finalize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({has_photo:!!photo})}),result=await finalized.json();if(!finalized.ok)throw Error(result.error?.message||'The report could not be submitted. Retry safely.');
   setId(j.data.report_id);setMessage(photo?'Submitted. Your private photo is processing before human review.':'Submitted for human review. Road conditions are updated only after an authorized decision.');
  }catch(e){setMessage(e instanceof Error?e.message:'Submission failed. Please retry.')}finally{setBusy(false)}
 }
 return <section className="panel"><span className="indicator">Road-linked evidence · Private photos</span><h2>Report what you observed</h2><p className="muted small">Choose the road, observation time and condition. Photos are optional; an AI result never approves a report or closes a road.</p>
  {signedIn===null?<p role="status">Checking your session…</p>:!signedIn?<div className="notice"><p>Sign in to submit a protected road observation.</p><div className="heroActions"><Link className="btn" href="/auth/login?next=/report">Log in</Link><Link className="btnSecondary" href="/auth/signup?next=/report">Create account</Link></div></div>:<form className="stack" onSubmit={submit}>
   <Picker point={point} onPick={p=>{change();setPoint(p)}}/>
   <div className={'notice '+(!selected?'warning':'')} role="status">{selected?<><strong>{selected.road.name}</strong> · {Math.round(selected.distance)} m from the selected road</>:'Choose a point within 100 m of a supported road.'}</div>
   <details className="coordsDetails"><summary>Keyboard location input</summary><div className="formGrid">{(['lat','lon'] as const).map(k=><div className="field" key={k}><label htmlFor={'report-'+k}>{k==='lat'?'Latitude':'Longitude'}</label><input id={'report-'+k} type="number" step="0.000001" required min={k==='lat'?28.610:77.200} max={k==='lat'?28.650:77.240} value={point[k]} onChange={e=>{change();setPoint({...point,[k]:Number(e.target.value)})}}/></div>)}</div></details>
   <div className="formGrid"><div className="field"><label htmlFor="report-time">Observed at (your local time)</label><input id="report-time" type="datetime-local" value={observed} required onChange={e=>{change();setObserved(e.target.value)}}/></div><div className="field"><label htmlFor="report-category">Condition</label><select id="report-category" value={category} onChange={e=>{change();setCategory(e.target.value)}}><option value="standing_water">Standing water</option><option value="heavy_water">Heavy water</option><option value="blocked">Road appears blocked</option><option value="clear">Road appears clear</option></select></div></div>
   <div className="field"><label htmlFor="report-note">Observation details</label><textarea id="report-note" value={note} maxLength={500} rows={3} onChange={e=>{change();setNote(e.target.value)}} placeholder="Describe what you saw. Avoid names, phone numbers or other personal information."/></div>
   <div className="field"><label htmlFor="report-photo">Private photo (optional, up to 3 MiB)</label><input id="report-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{change();setPhoto(e.target.files?.[0]??null)}}/></div>
   <label className="checkRow small"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I consent to private processing and human review. Observation details expire after three hours; processed photos are retained for up to seven days.</label>
   <button className="btn" disabled={busy||!consent||!selected||!!id}>{busy?'Submitting privately…':'Submit for review →'}</button>
  </form>}
  {message&&<p className={'notice '+(id?'':'warning')} role="status">{message}</p>}{id&&<Link className="btnSecondary" href={'/reports/'+id}>View report and photo status →</Link>}
 </section>;
}
