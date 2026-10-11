'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {browserClient} from '@/lib/browser/supabase';

type Receipt={class_label:'Flooded Scene'|'Non Flooded';uncalibrated_probability:number;model_revision:string;processing_mode:string;disclaimer:string};
export default function ImageAnalyzer(){
 const [session,setSession]=useState<'checking'|'signed-out'|'signed-in'|'unavailable'>('checking');
 const [file,setFile]=useState<File|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(''),[receipt,setReceipt]=useState<Receipt|null>(null);
 useEffect(()=>{let active=true;try{
  const sb=browserClient();
  void sb.auth.getUser().then(({data})=>{if(active)setSession(data.user?'signed-in':'signed-out')}).catch(()=>{if(active)setSession('unavailable')});
  const {data:{subscription}}=sb.auth.onAuthStateChange((_evt,s)=>{if(active)setSession(s?.user?'signed-in':'signed-out')});
  return()=>{active=false;subscription.unsubscribe()};
 }catch{return()=>{active=false}}},[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!file||!consent||busy)return;
  setBusy(true);setMessage('');setReceipt(null);
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024||file.size===0)throw Error('Use a JPEG, PNG or WebP photo smaller than 3 MiB.');
   const form=new FormData();form.append('photo',file);form.append('consent','yes');
   const response=await fetch('/api/v1/analyze',{method:'POST',body:form,cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data?.error?.message||'The experimental classifier is unavailable.');
   const r=data?.data as Receipt;
   if(!r||!['Flooded Scene','Non Flooded'].includes(r.class_label)||r.processing_mode!=='private_aws_lambda')throw Error('Invalid classifier response.');
   setReceipt(r);
  }catch(err){setMessage(err instanceof Error?err.message:'Analysis unavailable.')}finally{setBusy(false)}
 }
 return <div className="panel analyzerPanel">
  <span className="indicator">Private AWS ONNX · Experimental preview</span>
  <h2>Analyze a flood-scene photo</h2>
  <p className="muted">Upload a JPEG, PNG or WebP image to see an advisory image classification. This is <strong>not</strong> a measurement of flood depth, real-world accuracy, or road passability.</p>
  <div className="notice warning"><strong>No road-safety decision.</strong> Image predictions never create a road closure, community report or route recommendation. Only authorized human reviewers can decide road evidence.</div>
  {session==='checking'&&<p role="status">Checking your account…</p>}
  {session==='unavailable'&&<p role="status" className="notice warning">Authentication is temporarily unavailable.</p>}
  {session==='signed-out'&&<div className="heroActions"><Link className="btn" href="/auth/login?next=/analyze">Log in to analyze</Link><Link className="btnSecondary" href="/auth/signup?next=/analyze">Create account</Link></div>}
  {session==='signed-in'&&<form className="stack" onSubmit={submit}>
    <div className="field"><label htmlFor="analysis-photo">Choose a photo (up to 3 MiB)</label><input id="analysis-photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>{setFile(e.currentTarget.files?.[0]??null);setReceipt(null);setMessage('')}}/><p className="muted small">{file?file.name+' · '+(file.size/1024).toFixed(0)+' KiB':'JPEG, PNG or WebP only. EXIF and location metadata are removed before transmission to AWS.'}</p></div>
    <label className="small"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I consent to temporary private AWS processing. My photo is deleted following analysis (or expired by retention rules); only an advisory result is shown in this browser.</label>
    <button className="btn" type="submit" disabled={busy||!consent||!file}>{busy?'Analyzing privately…':'Analyze image →'}</button>
  </form>}
  {message&&<p role="status" className="notice warning">{message}</p>}
  {receipt&&<section aria-live="polite" className="result analyzerResult"><span className="indicator">AWS model result · Uncalibrated</span><h3>{receipt.class_label}</h3><p>Classifier score: <strong>{(receipt.uncalibrated_probability*100).toFixed(1)}%</strong> (not measured accuracy)</p><p className="muted small">{receipt.disclaimer}</p><p className="muted small">Source: pinned ONNX model, IAM-private AWS Lambda. No road status was changed.</p></section>}
  <p className="muted small">One analysis per confirmed account per 30-minute window. Submitted images are stripped of metadata, stored encrypted, deleted after processing, and subject to a one-day lifecycle cleanup.</p>
 </div>;
}
