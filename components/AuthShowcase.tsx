import Link from 'next/link';
import AuthForm from './AuthForm';
export default function AuthShowcase({mode,next}:{mode:'login'|'signup'|'forgot'|'update',next?:string}){
 return <div className="ui-auth-layout">
  <aside className="ui-auth-promo" aria-label="MonsoonRoute features"><div className="ui-auth-promo-overlay"/><div className="ui-auth-promo-content">
   <Link href="/" aria-label="MonsoonRoute home"><img src="/ui/logo-white.webp" alt="MonsoonRoute" width="180" height="60"/></Link>
   <div className="ui-auth-promo-main"><div className="ui-hero-badge"><span/> FLOOD-AWARE TRAVEL RESEARCH</div><h1>Travel Smarter<br/>This <em>Monsoon.</em></h1><p>Know your route options with rainfall context, reviewable road evidence and clear limitations.</p>
   <ul>{[['drop.webp','Avoid waterlogged roads','Compare supported road alternatives.'],['route-risk.webp','Evidence-aware decisions','Understand route trade-offs.'],['clock.webp','Freshness you can inspect','See when weather evidence was captured.'],['users.webp','Community-powered context','Human review before routing updates.']].map(([icon,title,sub])=><li key={title}><img src={'/ui/'+icon} alt=""/><span><strong>{title}</strong><small>{sub}</small></span></li>)}</ul></div>
   <p className="ui-auth-disclaimer">Central Delhi pilot · Relative risk is not a road safety guarantee</p>
  </div></aside>
  <div className="ui-auth-form-side"><div className="ui-auth-top"><Link href="/">← Back to home</Link>{mode==='login'?<span>New here? <Link href="/auth/signup">Create account</Link></span>:<span>Have an account? <Link href="/auth/login">Log in</Link></span>}</div><div className="ui-auth-form-center"><div className="ui-auth-form-intro"><span className="ui-auth-kicker">MONSOONROUTE ACCOUNT</span><h1>{mode==='login'?'Welcome Back':mode==='signup'?'Create Your Account':mode==='forgot'?'Reset Your Password':'Update Your Password'}</h1><p>{mode==='login'?'Continue to your saved routes and community observations.':mode==='signup'?'Join the Central Delhi pilot and submit observations for review.':mode==='forgot'?'Securely recover access to your account.':'Choose a new strong password for your account.'}</p></div><AuthForm mode={mode} next={next}/></div><p className="ui-auth-terms">Authentication is securely managed by Supabase. <Link href="/methodology">How the pilot works</Link></p></div>
 </div>
}
