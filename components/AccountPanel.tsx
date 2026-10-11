'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/browser/supabase';
export default function AccountPanel(){
 const router=useRouter();const [email,setEmail]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{let alive=true;try{
  void browserClient().auth.getUser().then(({data,error})=>{if(!alive)return;if(error)setError('Session could not be verified.');else setEmail(data.user?.email||null)}).catch(()=>{if(alive)setError('Authentication unavailable.')}).finally(()=>{if(alive)setLoading(false)});
 }catch{Promise.resolve().then(()=>{if(alive){setError('Authentication unavailable.');setLoading(false)}})}
 return()=>{alive=false}},[]);
 async function signOut(){setError('');try{const {error}=await browserClient().auth.signOut();if(error)throw error;setEmail(null);router.replace('/auth/login');router.refresh()}catch{setError('Unable to sign out. Please try again.')}}
 return <section className="panel authPanel"><h2>Your account</h2>{loading&&<p role="status">Verifying your session…</p>}
 {!loading&&email&&<><p>You are signed in as <strong>{email}</strong>.</p><div className="heroActions"><Link className="btnSecondary" href="/report">Report a road condition</Link><Link className="btnSecondary" href="/history">My history</Link><button type="button" className="btn" onClick={()=>void signOut()}>Log out</button></div></>}
 {!loading&&!email&&<><p>You are not signed in.</p><div className="heroActions"><Link className="btn" href="/auth/login">Log in</Link><Link className="btnSecondary" href="/auth/signup">Create account</Link></div></>}
 {error&&<p role="alert" className="notice warning">{error}</p>}</section>;
}
