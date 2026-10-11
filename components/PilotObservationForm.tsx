'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {browserClient} from '@/lib/browser/supabase';
const MapPicker=dynamic(()=>import('./PilotPointPicker'),{ssr:false,loading:()=> <p role="status">Loading real Delhi street map…</p>});
type Point={lat:number;lon:number};
type Item={id:string;status:string;category:string;created_at:string;observed_at:string;review_note:string|null;expires_at:string;photo_path:string|null};
const categories=[['standing_water','Standing water'],['heavy_water','Heavy water'],['blocked','Road appears blocked'],['clear','Road appears clear']];
function localMinute(){const d=new Date(Date.now()-60000);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
async function sanitize(file:File):Promise<Blob>{
 if(file.size<1||file.size>3145728||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPEG, PNG or WebP below 3 MiB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>12_000_000)throw Error('The image has too many pixels.');
  const factor=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image processing is not supported on this device.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const output=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.78));
  if(!output||output.size<1||output.size>3145728)throw Error('Sanitized photo exceeds the size limit.');
  return output;
 }finally{bitmap.close()}
}
export default function PilotObservationForm(){
 const [auth,setAuth]=useState<'checking'|'signed-out'|'signed-in'|'unavailable'>('checking');
 const [owner,setOwner]=useState('');const [loc,setLoc]=useState<Point|null>(null);
 const [coordOpen,setCoordOpen]=useState(false),[observed,setObserved]=useState(localMinute);
 const [category,setCategory]=useState('standing_water'),[note,setNote]=useState(''),[photo,setPhoto]=useState<File|null>(null);
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[success,setSuccess]=useState(false);
 const [items,setItems]=useState<Item[]>([]);
 const [retry,setRetry]=useState<{path:string;blob:Blob}|null>(null);
 const nonce=useRef(crypto.randomUUID());
 const refresh=useCallback(async(userId:string)=>{
  try{const {data,error}=await browserClient().from('pilot_observations').select('id,status,category,created_at,observed_at,review_note,expires_at,photo_path').eq('user_id',userId).order('created_at',{ascending:false}).limit(10);
   if(!error)setItems((data??[]) as Item[]);
  }catch{/* UI surfaces submission errors; a list fetch is noncritical. */}
 },[]);
 useEffect(()=>{let active=true;
  try{
   const sb=browserClient();
   const load=async()=>{try{const {data,error}=await sb.auth.getUser();if(!active)return;
    if(error||!data.user){setAuth('signed-out');setOwner('');return}
    if(!data.user.email_confirmed_at){setAuth('signed-out');setOwner('');return}
    setOwner(data.user.id);setAuth('signed-in');void refresh(data.user.id);
   }catch{if(active)setAuth('unavailable')}};
   void load();
   const {data:{subscription}}=sb.auth.onAuthStateChange(()=>{void load()});
   return()=>{active=false;subscription.unsubscribe()}
  }catch{setAuth('unavailable');return()=>{active=false}}
 },[refresh]);
 async function retryUpload(){
  if(!retry||busy)return;setBusy(true);setMessage('');
  try{const {error}=await browserClient().storage.from('report-photos').upload(retry.path,retry.blob,{contentType:'image/jpeg',upsert:false});
   if(error)throw Error('Private photo upload failed; retry while the observation is recent.');
   setRetry(null);setMessage('The sanitized private photo is now attached to your pending observation.');setSuccess(true);
  }catch(e){setMessage(e instanceof Error?e.message:'Upload failed.')}finally{setBusy(false)}
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!loc||!owner||!consent||busy)return;
  setBusy(true);setMessage('');setSuccess(false);setRetry(null);
  try{
   if(loc.lat<28.600||loc.lat>28.655||loc.lon<77.190||loc.lon>77.245)throw Error('Select a point within the Central Delhi pilot boundary.');
   const when=new Date(observed);if(!Number.isFinite(when.getTime())||Date.now()-when.getTime()>3*3600000||when.getTime()>Date.now()+5*60000)throw Error('Observation time must be within the past three hours.');
   const image=photo?await sanitize(photo):null;
   const id=crypto.randomUUID();
   const path=image?owner+'/pilot-observations/'+id+'.jpg':null;
   const sb=browserClient();
   const {data,error}=await sb.from('pilot_observations').insert({id,user_id:owner,client_nonce:nonce.current,latitude:loc.lat,longitude:loc.lon,category,observed_at:when.toISOString(),note:note.trim(),photo_path:path}).select('id,status').single();
   if(error)throw Error(error.message.includes('PILOT_DAILY_QUOTA')?'You have reached the report limit. Please try later.':'The secure observation could not be recorded. '+error.message);
   nonce.current=crypto.randomUUID();setSuccess(true);setNote('');setPhoto(null);setConsent(false);
   setMessage('Observation '+String(data.id).slice(0,8)+' submitted for human triage, with no road-segment match. It will NOT change a map route.');
   if(image&&path){
    const up=await sb.storage.from('report-photos').upload(path,image,{contentType:'image/jpeg',upsert:false});
    if(up.error){setRetry({path,blob:image});setMessage('Observation saved, but the private photo upload failed. Use Retry photo upload below.');setSuccess(false)}
    else setMessage('Observation and sanitized private photo saved for human triage. No route or road closure was changed.');
   }
   void refresh(owner);
  }catch(err){setMessage(err instanceof Error?err.message:'Unable to submit.');setSuccess(false)}
  finally{setBusy(false)}
 }
 return <section className="panel pilotObservation">
  <div className="resultTop"><h2>Report what you observed</h2><span className="indicator">Private · Unmatched evidence</span></div>
  <p className="muted">Your observation is tied to an actual position on the real Delhi map, not a fabricated road ID. It will remain <strong>pending human triage</strong> until road evidence can be verified. It does not affect route recommendations.</p>
  {auth==='checking'&&<p role="status">Checking Supabase account…</p>}
  {auth==='unavailable'&&<p role="alert" className="notice warning">Supabase authentication is currently unavailable.</p>}
  {auth==='signed-out'&&<div className="heroActions"><Link className="btn" href="/auth/login?next=/report">Log in to report</Link><Link className="btnSecondary" href="/auth/signup?next=/report">Create account</Link></div>}
  {auth==='signed-in'&&<>
   <form onSubmit={submit} className="stack">
    <div><h3>1 · Select the real location</h3><MapPicker point={loc} onPick={p=>{setLoc(p);setCoordOpen(false)}}/>
     <button type="button" className="btnSecondary" onClick={()=>setCoordOpen(open=>!open)} aria-expanded={coordOpen}>{coordOpen?'Hide':'Enter'} coordinates manually</button>
     {coordOpen&&<div className="formGrid"><div className="field"><label htmlFor="obs-lat">Latitude</label><input id="obs-lat" type="number" step=".000001" min="28.600" max="28.655" value={loc?.lat??''} onChange={e=>setLoc(old=>({lat:Number(e.target.value),lon:old?.lon??77.210}))}/></div><div className="field"><label htmlFor="obs-lon">Longitude</label><input id="obs-lon" type="number" step=".000001" min="77.190" max="77.245" value={loc?.lon??''} onChange={e=>setLoc(old=>({lat:old?.lat??28.624,lon:Number(e.target.value)}))}/></div></div>}
     <p role="status" className="small muted">{loc?'Selected: '+loc.lat.toFixed(6)+'°, '+loc.lon.toFixed(6)+'°':'No road position selected. Click on the map or enter precise coordinates.'}</p>
    </div>
    <div><h3>2 · Describe the observation</h3><div className="formGrid">
      <div className="field"><label htmlFor="obs-cat">Condition</label><select id="obs-cat" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></div>
      <div className="field"><label htmlFor="obs-time">Time observed (local)</label><input id="obs-time" type="datetime-local" value={observed} onChange={e=>setObserved(e.target.value)} required/></div>
    </div>
    <div className="field"><label htmlFor="obs-note">Details (optional; 500 characters)</label><textarea id="obs-note" value={note} maxLength={500} rows={4} onChange={e=>setNote(e.target.value)} placeholder="For example: water visible along the roadside at this location; do not include identifiable people."/></div>
    <div className="field"><label htmlFor="obs-photo">Attach a private photo (optional; 3 MiB)</label><input id="obs-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]??null)}/><p className="small muted">Photos are resized and re-encoded as JPEG in your browser to remove embedded EXIF/location metadata before upload to the protected Supabase bucket.</p></div>
    </div>
    <label className="small"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/> I consent to storing this observation for human triage. I understand that there is no road verification, emergency response or automatic flood closure.</label>
    <button className="btn" type="submit" disabled={busy||!loc||!consent}>{busy?'Submitting securely…':'Submit private observation →'}</button>
   </form>
   {retry&&<button className="btnSecondary" onClick={()=>void retryUpload()} disabled={busy}>Retry private photo upload</button>}
   {message&&<p role="status" className={'notice '+(success?'':'warning')}>{message}</p>}
   <div className="pilotHistory"><h3>Your recent private observations</h3>{items.length===0?<p className="muted small">No observations saved yet.</p>:<div className="stack">{items.map(item=><div key={item.id} className="result"><strong>{item.category.replaceAll('_',' ')} · {item.status.replaceAll('_',' ')}</strong><p className="small muted">Observed {new Date(item.observed_at).toLocaleString()} · expires {new Date(item.expires_at).toLocaleString()}</p>{item.review_note&&<p className="small">Reviewer: {item.review_note}</p>}<p className="mono small">Reference {item.id.slice(0,8)}</p></div>)}</div>}</div>
  </>}
  <p className="small muted">Rate limit: two observations per ten minutes, eight per day. These submissions are provisional; published graph matching and closure approval are separate future gates. Private photos are not available to anonymous visitors.</p>
 </section>;
}
