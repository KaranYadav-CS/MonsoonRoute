'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/browser/supabase';

type Mode='login'|'signup'|'forgot'|'update';
const allowed=new Set(['/account','/report','/history','/plan']);
export default function AuthForm({mode,next='/account'}:{mode:Mode;next?:string}){
 const router=useRouter();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [success,setSuccess]=useState(false);
 const destination=allowed.has(next)?next:'/account';
 async function handleSubmit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setMessage('');setSuccess(false);
  if((mode==='signup'||mode==='update')&&password!==confirm){setMessage('Passwords do not match.');return}
  if((mode==='signup'||mode==='update')&&password.length<12){setMessage('Use at least 12 characters for your password.');return}
  setBusy(true);
  try{
   const sb=browserClient();
   if(mode==='login'){
    const {error}=await sb.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
    if(error)throw error;router.replace(destination);router.refresh();return;
   }
   if(mode==='signup'){
    const {data,error}=await sb.auth.signUp({email:email.trim().toLowerCase(),password,options:{emailRedirectTo:window.location.origin+'/auth/callback?next='+encodeURIComponent(destination)}});
    if(error)throw error;
    if(data.session){router.replace(destination);router.refresh();return}
    setSuccess(true);setMessage('Check your email for a verification link. Open it to activate your account.');
    return;
   }
   if(mode==='forgot'){
    const {error}=await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:window.location.origin+'/auth/callback?next='+encodeURIComponent('/auth/update-password')});
    if(error)throw error;
    setSuccess(true);setMessage('If this email is registered, you will receive a secure password reset link.');
    return;
   }
   const {error}=await sb.auth.updateUser({password});
   if(error)throw error;setSuccess(true);setMessage('Password updated. You can now access your account.');router.replace('/account');router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:'Authentication temporarily unavailable.')}
  finally{setBusy(false)}
 }
 const title={login:'Welcome back',signup:'Create your account',forgot:'Reset your password',update:'Set a new password'}[mode];
 return <div className="panel authPanel">
  <span className="indicator">Supabase secure authentication</span>
  <h2>{title}</h2>
  <p className="muted small">{mode==='signup'?'Register with your email and a strong password. Email verification may be required.':mode==='login'?'Sign in to submit observations and see your own history.':mode==='forgot'?'We will email a password-reset link if your account exists.':'Choose a strong replacement password.'}</p>
  <form className="stack" onSubmit={handleSubmit}>
   {mode!=='update'&&<div className="field"><label htmlFor="auth-email">Email address</label><input id="auth-email" name="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" maxLength={254}/></div>}
   {mode!=='forgot'&&<div className="field"><label htmlFor="auth-password">{mode==='update'?'New password':'Password'}</label><input id="auth-password" name="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}/></div>}
   {(mode==='signup'||mode==='update')&&<div className="field"><label htmlFor="auth-confirm">Confirm password</label><input id="auth-confirm" name="confirm-password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={12} maxLength={128} autoComplete="new-password"/></div>}
   <button type="submit" className="btn" disabled={busy}>{busy?'Please wait…':({login:'Log in',signup:'Create account',forgot:'Send reset link',update:'Update password'}[mode])}</button>
  </form>
  {message&&<p role="status" className={'notice '+(success?'':'warning')}>{message}</p>}
  <div className="authLinks">{mode!=='login'&&<Link href="/auth/login">Log in</Link>}{mode!=='signup'&&<Link href="/auth/signup">Create an account</Link>}{mode==='login'&&<Link href="/auth/forgot-password">Forgot password?</Link>}</div>
  <p className="muted small">Flood reports are reviewed by people. An image classification never closes a road automatically.</p>
 </div>;
}
