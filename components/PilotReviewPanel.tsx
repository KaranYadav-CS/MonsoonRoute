'use client';
import {useCallback,useEffect,useState} from 'react';
import {browserClient} from '@/lib/browser/supabase';
type Review={id:string;category:string;status:string;observed_at:string;latitude:number;longitude:number;note:string;photo_path:string|null;review_note:string|null};
export default function PilotReviewPanel(){
 const [allowed,setAllowed]=useState(false),[loading,setLoading]=useState(true),[items,setItems]=useState<Review[]>([]);
 const [note,setNote]=useState<Record<string,string>>({}),[message,setMessage]=useState('');
 const load=useCallback(async()=>{setLoading(true);try{const sb=browserClient();const {data:user}=await sb.auth.getUser();if(!user.user){setAllowed(false);return}
  const {data:access,error:accessError}=await sb.rpc('pilot_reviewer_access');
  if(accessError||access!==true){setAllowed(false);return}
  setAllowed(true);
  const {data,error}=await sb.from('pilot_observations').select('id,category,status,observed_at,latitude,longitude,note,photo_path,review_note').eq('status','pending').order('created_at',{ascending:true}).limit(50);
  if(error)throw Error('Unable to retrieve the private review queue.');
  setItems((data??[]) as Review[]);
 }catch{setMessage('Review service unavailable.')}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 async function decide(item:Review,status:'acknowledged_unmatched'|'rejected'){
  const reason=(note[item.id]??'').trim();if(reason.length<10){setMessage('Enter a review reason of at least 10 characters.');return}
  setMessage('');try{
   const {error}=await browserClient().from('pilot_observations').update({status,review_note:reason}).eq('id',item.id).eq('status','pending');
   if(error)throw Error('Review update failed. Refresh and retry.');
   setMessage('Human decision recorded. This does not approve a route closure.');void load();
  }catch(err){setMessage(err instanceof Error?err.message:'Review unavailable')}
 }
 async function openPhoto(item:Review){
  if(!item.photo_path)return;
  const {data,error}=await browserClient().storage.from('report-photos').createSignedUrl(item.photo_path,60);
  if(error||!data){setMessage('Private photo not available.');return}
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
 }
 return <section className="panel"><h2>Unmatched observation triage</h2><p className="muted small">Reviewer-only provisional evidence. Acknowledgement does not establish a road graph match or authorize a road closure.</p>{loading?<p role="status">Checking reviewer permission…</p>:!allowed?<p className="notice">Access requires an explicitly assigned moderator role. Ordinary accounts cannot view other users' reports.</p>:items.length===0?<p>No pending provisional observations.</p>:<div className="stack">{items.map(item=><article className="result" key={item.id}>
  <strong>{item.category.replaceAll('_',' ')}</strong><p className="small">{new Date(item.observed_at).toLocaleString()} · Location {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</p>
  <p>{item.note||'No description supplied.'}</p>{item.photo_path&&<button type="button" className="btnSecondary" onClick={()=>void openPhoto(item)}>View private photo (60-second link)</button>}
  <div className="field"><label htmlFor={'review-'+item.id}>Human review reason</label><textarea id={'review-'+item.id} minLength={10} maxLength={1000} value={note[item.id]??''} onChange={e=>setNote(p=>({...p,[item.id]:e.target.value}))}/></div>
  <div className="heroActions"><button className="btnSecondary" type="button" onClick={()=>void decide(item,'acknowledged_unmatched')}>Acknowledge as unlinked evidence</button><button className="btnSecondary" type="button" onClick={()=>void decide(item,'rejected')}>Reject observation</button></div></article>)}</div>}{message&&<p role="status" className="notice">{message}</p>}</section>;
}
