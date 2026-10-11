'use client';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import SiteHeader from './SiteHeader';
export default function AppChrome({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const isAuth=pathname.startsWith('/auth/');
 const isHome=pathname==='/';
 return <div className={isAuth?'ui-app ui-auth-app':isHome?'ui-app ui-home-app':'ui-app ui-dashboard-app'}>
  <a className="skip" href="#content">Skip to content</a>
  <SiteHeader/>
  {!isAuth&&!isHome&&<div className="ui-workspace-topbar" aria-label="Workspace quick actions">
   <Link className="ui-workspace-search" href="/plan" aria-label="Open live route planner and select destination"><span aria-hidden="true">⌖</span> Plan a route · Select a road junction or map point <span aria-hidden="true">↗</span></Link>
   <div className="ui-workspace-top-actions"><span className="ui-workspace-chip"><i/> CENTRAL DELHI PILOT</span><Link href="/methodology" aria-label="Read methodology and limitations" title="Methodology">ⓘ</Link><Link href="/account" aria-label="Open account" className="ui-top-avatar">◉</Link></div>
  </div>}
  <main id="content" className="ui-app-content">{children}</main>
  {!isAuth&&<footer className="ui-footer"><span><strong>MonsoonRoute</strong> · Central Delhi research pilot. Never enter floodwater based on a route estimate.</span><Link href="/methodology">Methods, limits & sources →</Link></footer>}
 </div>;
}
