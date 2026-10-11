'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {browserClient} from '@/lib/browser/supabase';

const links=[['/plan','Plan'],['/report','Report'],['/review','Review'],['/history','History'],['/methodology','Methodology']] as const;
export default function SiteHeader(){
 const pathname=usePathname();
 const [signedIn,setSignedIn]=useState(false);
 const [menuOpen,setMenuOpen]=useState(false);
 useEffect(()=>{
  let alive=true;
  try{
   const client=browserClient();
   void client.auth.getUser().then(({data})=>{if(alive)setSignedIn(!!data.user)}).catch(()=>{if(alive)setSignedIn(false)});
   const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(alive)setSignedIn(!!session?.user)});
   return()=>{alive=false;subscription.unsubscribe()};
  }catch{return()=>{alive=false}};
 },[]);
 return <header className="topbar">
  <Link href="/" className="brand" onClick={()=>setMenuOpen(false)} aria-label="MonsoonRoute home">
   <span className="brandicon" aria-hidden="true">≈</span> Monsoon<span>Route</span>
  </Link>
  <button type="button" className="navToggle" aria-expanded={menuOpen} aria-controls="site-navigation" onClick={()=>setMenuOpen(open=>!open)}>{menuOpen?'Close menu':'Menu'}</button>
  <nav id="site-navigation" className={menuOpen?'navOpen':'navCollapsed'} aria-label="Main navigation">
   {links.map(([href,text])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined} onClick={()=>setMenuOpen(false)}>{text}</Link>)}
   <Link href={signedIn?'/account':'/auth/login'} aria-current={pathname==='/account'||pathname.startsWith('/auth/')?'page':undefined} className="navAccount" onClick={()=>setMenuOpen(false)}>{signedIn?'My account':'Log in / Sign up'}</Link>
  </nav>
  <span className="headerTag">Central Delhi · Pilot</span>
 </header>;
}
