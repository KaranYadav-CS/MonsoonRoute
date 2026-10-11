'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {browserClient} from '@/lib/browser/supabase';

const navigation=[
 {href:'/',label:'Home',glyph:'home'},
 {href:'/plan',label:'Map & routes',glyph:'map'},
 {href:'/report',label:'Report condition',glyph:'report'},
 {href:'/analyze',label:'Analyze image',glyph:'camera'},
 {href:'/review',label:'Review',glyph:'review'},
 {href:'/history',label:'My journeys',glyph:'history'},
 {href:'/methodology',label:'Methodology',glyph:'info'},
] as const;

function Glyph({name}:{name:string}){
 const common={fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" {...common}>
  {name==='home'?<><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>:
  name==='map'?<><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15m6-12v15"/></>:
  name==='report'?<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6m-6 4h4"/></>:
  name==='camera'?<><rect x="2" y="6" width="20" height="14" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="m7 6 1-2h8l1 2"/></>:
  name==='review'?<><path d="M4 4h16v16H4zM8 9l2 2 5-5M8 16h8"/></>:
  name==='history'?<><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/><path d="M12 7v5l4 2"/></>:
  name==='info'?<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>:
  <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>}
 </svg>;
}

export default function SiteHeader(){
 const pathname=usePathname();
 const [signedIn,setSignedIn]=useState(false);
 const [menuOpen,setMenuOpen]=useState(false);
 useEffect(()=>{const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false)};window.addEventListener('keydown',onKeyDown);return()=>window.removeEventListener('keydown',onKeyDown)},[]);
 useEffect(()=>{let active=true;try{
  const client=browserClient();
  void client.auth.getUser().then(({data})=>{if(active)setSignedIn(Boolean(data.user))}).catch(()=>{});
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(active)setSignedIn(Boolean(session?.user))});
  return()=>{active=false;subscription.unsubscribe()};
 }catch{return()=>{active=false}}},[]);
 if(pathname.startsWith('/auth/'))return null;
 const isHome=pathname==='/';
 return <>
  {isHome?<header className="ui-landing-nav">
   <Link href="/" className="ui-landing-brand" aria-label="MonsoonRoute home"><img src="/ui/logo-white.webp" alt="MonsoonRoute" width="170" height="56"/></Link>
   <button type="button" className="ui-menu-btn" onClick={()=>setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="site-navigation"><span>{menuOpen?'Close menu':'Menu'}</span> <span aria-hidden="true">{menuOpen?'×':'☰'}</span></button>
   <nav id="site-navigation" className={menuOpen?'ui-landing-links is-open':'ui-landing-links'} aria-label="Main navigation">
    <Link href="/" aria-current="page" onClick={()=>setMenuOpen(false)}>Home</Link>
    <a href="#features" onClick={()=>setMenuOpen(false)}>Features</a>
    <a href="#how-it-works" onClick={()=>setMenuOpen(false)}>How it works</a>
    <Link href="/plan" onClick={()=>setMenuOpen(false)}>Live map</Link>
    <Link href="/methodology" onClick={()=>setMenuOpen(false)}>Methodology</Link>
    <Link className="ui-nav-login" href={signedIn?'/account':'/auth/login'} onClick={()=>setMenuOpen(false)}>{signedIn?'My account':'Log in'}</Link>
    {!signedIn&&<Link className="ui-nav-signup" href="/auth/signup" onClick={()=>setMenuOpen(false)}>Sign up</Link>}
   </nav>
  </header>:
  <><header className="ui-mobile-top"><button type="button" className="ui-menu-btn" onClick={()=>setMenuOpen(!menuOpen)} aria-controls="site-navigation" aria-expanded={menuOpen} aria-label={menuOpen?'Close navigation':'Open navigation'}><span aria-hidden="true">{menuOpen?'×':'☰'}</span> <span>{menuOpen?'Close':'Menu'}</span></button><Link href="/" className="ui-mobile-brand" aria-label="MonsoonRoute home"><img src="/ui/logo.webp" alt="MonsoonRoute" width="170" height="50"/></Link><Link href={signedIn?'/account':'/auth/login'} aria-label="Account"><Glyph name="profile"/></Link></header>
   <aside className={menuOpen?'ui-sidebar is-open':'ui-sidebar'} aria-label="Main navigation">
    <div className="ui-sidebar-top"><Link href="/" className="ui-sidebar-brand" onClick={()=>setMenuOpen(false)}><img src="/ui/logo-white.webp" alt="MonsoonRoute home" width="174" height="58"/></Link><button type="button" className="ui-close-sidebar" onClick={()=>setMenuOpen(false)} aria-label="Close navigation">×</button></div>
    <nav id="site-navigation" className="ui-sidebar-nav" aria-label="Workspace pages">{navigation.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href?'page':undefined} onClick={()=>setMenuOpen(false)}><Glyph name={item.glyph}/><span>{item.label}</span></Link>)}</nav>
    <div className="ui-sidebar-bottom"><div className="ui-pilot-label"><span className="ui-live-dot"/> CENTRAL DELHI PILOT</div><p>Relative risk, not road-safety certification.</p><Link className="ui-sidebar-user" href={signedIn?'/account':'/auth/login'} onClick={()=>setMenuOpen(false)}><span className="ui-user-avatar"><Glyph name="profile"/></span><span>{signedIn?'My account':'Log in / Sign up'}<small>Account & preferences</small></span><span aria-hidden="true">›</span></Link></div>
   </aside>
   {menuOpen&&<button type="button" className="ui-sidebar-shade" onClick={()=>setMenuOpen(false)} aria-label="Close menu"/>}
  </>}
 </>;
}
