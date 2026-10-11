import Link from 'next/link';
import WeatherPreview from '@/components/WeatherPreview';

const capabilities=[
 {icon:'drop.webp',title:'Weather context',detail:'Time-stamped rainfall evidence and bounded weather coverage—not measured flood depth.'},
 {icon:'route-risk.webp',title:'Risk-aware routes',detail:'Compare supported roads against a maximum extra-travel-time budget.'},
 {icon:'bar-chart.webp',title:'Explainable decisions',detail:'Inspect route evidence, relative scores, uncertainty, and closure decisions.'},
 {icon:'users.webp',title:'Human-reviewed reports',detail:'Community observations inform routing only after authorized review.'}
];
export default function Home(){return <>
 <section className="ui-home-hero" id="home">
  <div className="ui-home-hero-backdrop" aria-hidden="true"/>
  <div className="ui-home-hero-inner">
   <span className="ui-hero-badge"><span/> MONSOON-READY SMARTER TRAVEL</span>
   <h1>Avoid Waterlogged<br/>Roads. <em>Reach Safer.</em></h1>
   <p>Compare evidence-aware routes in Central Delhi using rainfall context, road-network data, and reviewed community observations. Make informed decisions—not assumptions.</p>
   <div className="ui-home-buttons"><Link className="ui-primary-action" href="/plan">Open live map <span aria-hidden="true">↗</span></Link><Link className="ui-glass-action" href="/methodology">How it works <span aria-hidden="true">↗</span></Link></div>
   <div className="ui-home-highlights"><span><img src="/ui/cloud-rain.webp" alt=""/> Weather evidence</span><span><img src="/ui/route-risk.webp" alt=""/> Risk-aware routing</span><span><img src="/ui/bar-chart.webp" alt=""/> Transparent limits</span></div>
  </div>
  <div className="ui-hero-edge"/>
 </section>
 <section className="ui-feature-ribbon" aria-label="Application capabilities"><div className="ui-feature-ribbon-inner">
  {[{icon:'drop.webp',label:'Relative waterlogging index',sub:'Evidence, not a depth forecast'},{icon:'map-folded.webp',label:'Alternative route planning',sub:'Bounded detours'},{icon:'clock.webp',label:'Dated rainfall context',sub:'Freshness is visible'},{icon:'users.webp',label:'Local community evidence',sub:'Human-reviewed decisions'}].map(item=><div className="ui-ribbon-item" key={item.label}><img src={'/ui/'+item.icon} alt=""/><div><strong>{item.label}</strong><span>{item.sub}</span></div></div>)}
 </div></section>
 <section className="ui-home-section" id="features"><div className="ui-section-head"><span className="ui-section-eyebrow">THE REAL-WORLD PROBLEM</span><h2>Monsoon travel is unpredictable.<br/><em>Better evidence helps.</em></h2><p>Uncertainty can turn an ordinary commute into a difficult decision. MonsoonRoute shows where its evidence comes from, how recent it is, and what it cannot prove.</p></div>
  <div className="ui-image-cards"><article><img src="/ui/waterlogged.webp" alt="Waterlogging on a city street"/><div><h3>Waterlogged roads</h3><p>Conditions can change between rainfall updates and actual travel.</p></div></article><article><img src="/ui/road-delays.webp" alt="Traffic during rainfall"/><div><h3>Unexpected delays</h3><p>Consider travel-time cost alongside modeled susceptibility.</p></div></article><article><img src="/ui/risk-safety.webp" alt="Traffic navigating flooded streets"/><div><h3>Uncertain road conditions</h3><p>No app can certify a waterlogged road as safe to traverse.</p></div></article></div>
 </section>
 <section className="ui-home-solution" id="how-it-works"><div className="ui-home-solution-inner"><div><span className="ui-section-eyebrow">OUR APPROACH</span><h2>Route decisions with visible evidence.</h2><p>MonsoonRoute combines bounded relative road susceptibility with observed and reviewed inputs. It makes uncertainty explicit instead of inventing floodwater measurements.</p><Link href="/methodology" className="ui-primary-action">Explore methodology <span aria-hidden="true">↗</span></Link></div><div className="ui-solution-steps">{capabilities.map((x,i)=><article key={x.title}><span>{String(i+1).padStart(2,'0')}</span><img src={'/ui/'+x.icon} alt=""/><div><h3>{x.title}</h3><p>{x.detail}</p></div></article>)}</div></div></section>
 <section className="ui-home-section" id="live-evidence"><div className="ui-section-head"><span className="ui-section-eyebrow">FORECAST CONTEXT</span><h2>Current rainfall preview</h2><p>Forecast information is shown separately from reports of actual roadway conditions.</p></div><div className="ui-weather-wrap"><WeatherPreview/></div><div className="ui-live-cta"><img src="/ui/flood-night.webp" alt="Monsoon street at night" loading="lazy"/><div><span className="ui-section-eyebrow">CENTRAL DELHI PILOT</span><h2>See the map. Compare real route alternatives.</h2><p>Choose a supported junction, set the detour limit, and inspect the evidence behind each comparison.</p><Link href="/plan" className="ui-primary-action">Plan a journey →</Link></div></div></section>
 <section className="ui-home-final"><h2>Travel with more context this monsoon.</h2><p>Know what the data says—and what remains uncertain.</p><div><Link href="/plan" className="ui-primary-action">Explore map & routes →</Link><Link href="/report" className="ui-glass-action">Report a road condition</Link></div></section>
 </>}
