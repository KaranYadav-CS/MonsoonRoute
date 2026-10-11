import Link from 'next/link';
import WeatherPreview from '@/components/WeatherPreview';
import './landing-reference.css';

// The reference landing page is a visual guide, not evidence of a live flood-depth
// prediction service. All operational CTAs lead to existing production routes.
const imageRoot = '/ui/';
const highlights = [
  {icon:'cloud-rain.webp',label:'Dated rainfall context'},
  {icon:'route-risk.webp',label:'Evidence-aware route planning'},
  {icon:'bar-chart.webp',label:'Transparent model limits'},
  {icon:'drop.webp',label:'Built for monsoon journeys'},
];
const metrics = [
  {icon:'drop.webp',title:'Relative exposure estimates',detail:'Not a water-depth forecast'},
  {icon:'map-folded.webp',title:'Alternative route planning',detail:'Travel-time versus exposure'},
  {icon:'clock.webp',title:'Weather + road context',detail:'Evidence freshness is visible'},
  {icon:'users.webp',title:'Reviewed community reports',detail:'Subject to human verification'},
];
const problemCards=[
  {image:'waterlogged.webp',title:'Waterlogged roads',detail:'Road conditions may change between available updates.'},
  {image:'road-delays.webp',title:'Unpredictable delays',detail:'Compare detours and travel-time costs with available evidence.'},
  {image:'risk-safety.webp',title:'Incomplete observations',detail:'No route estimate can certify a road safe to traverse.'},
];
const capabilities=[
  {icon:'cloud-rain.webp',title:'Rainfall context',detail:'Time-stamped weather information with source and freshness limits.'},
  {icon:'route-risk.webp',title:'Route comparison',detail:'Compare supported pilot roads using bounded exposure estimates.'},
  {icon:'clock.webp',title:'Evidence traceability',detail:'Understand which inputs contributed to a route decision.'},
  {icon:'mobile.webp',title:'Responsive access',detail:'Consistent planning and reporting workflows across screen sizes.'},
];
const audiences=[
  {icon:'grad-cap.webp',title:'Students',detail:'Compare travel options before heading to campus.'},
  {icon:'briefcase.webp',title:'Daily commuters',detail:'Consider disruptions and extra travel-time trade-offs.'},
  {icon:'users.webp',title:'City residents',detail:'Review road observations and their freshness.'},
  {icon:'car.webp',title:'Drivers and delivery teams',detail:'Use mapped pilot segments to assess route alternatives.'},
];

export default function Home(){return <div className="mr-landing">
  <section className="mr-hero" id="home" aria-labelledby="mr-hero-title">
    <div className="mr-hero-image" aria-hidden="true"/>
    <div className="mr-hero-overlay" aria-hidden="true"/>
    <div className="mr-track mr-hero-layout">
      <div className="mr-hero-copy">
        <p className="mr-badge"><span className="mr-pulse" aria-hidden="true"/> MONSOON-READY SMARTER TRAVEL</p>
        <h1 id="mr-hero-title">Avoid Waterlogged<br className="mr-desktop-break"/> Roads. <span>Plan with Evidence.</span></h1>
        <p className="mr-hero-lead">Compare route options using recent rainfall context, mapped streets and reviewed observations. See the trade-offs and uncertainties before you travel.</p>
        <div className="mr-actions">
          <Link className="mr-button mr-button-primary" href="/plan">Open live map <span aria-hidden="true">↗</span></Link>
          <Link className="mr-button mr-button-glass" href="#how-it-works"><span aria-hidden="true">▶</span> How it works</Link>
        </div>
        <div className="mr-hero-highlights" aria-label="Main capabilities">{highlights.map((item)=><div className="mr-highlight" key={item.label}><span className="mr-highlight-icon"><img src={imageRoot+item.icon} alt=""/></span><span>{item.label}</span></div>)}</div>
      </div>
    </div>
  </section>
  <div className="mr-metric-zone" aria-label="MonsoonRoute capabilities"><div className="mr-track"><div className="mr-metrics">{metrics.map((item)=><div className="mr-metric" key={item.title}><img src={imageRoot+item.icon} alt=""/><div><strong>{item.title}</strong><span>{item.detail}</span></div></div>)}</div></div></div>

  <section className="mr-section mr-problem" id="problem" aria-labelledby="mr-problem-heading"><div className="mr-track mr-split">
    <div className="mr-section-copy"><span className="mr-eyebrow">THE REAL-WORLD PROBLEM</span><h2 id="mr-problem-heading">Monsoon travel can be unpredictable.</h2><p>Sudden waterlogging can disrupt routes and delay journeys. Public weather information and local observations are useful, but they rarely provide complete street-by-street certainty.</p><p>MonsoonRoute brings available evidence and its limitations into one decision workflow.</p></div>
    <div className="mr-problem-grid">{problemCards.map(item=><article className="mr-picture-card" key={item.title}><img loading="lazy" src={imageRoot+item.image} alt={item.title}/><div><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div>
  </div></section>

  <section className="mr-section mr-solution" id="how-it-works" aria-labelledby="mr-solution-heading"><div className="mr-track mr-split mr-solution-grid">
    <div className="mr-section-copy"><span className="mr-eyebrow">HOW MONSOONROUTE WORKS</span><h2 id="mr-solution-heading">Evidence in. Clear route comparisons out.</h2><p>The pilot combines dated weather signals, a bounded road network and human-reviewed observations. Estimates describe relative exposure, not measured flood depth or guaranteed safe passage.</p><Link href="/methodology" className="mr-text-link">Review methods and limitations <span aria-hidden="true">↗</span></Link></div>
    <div className="mr-flow-card"><div className="mr-flow-inputs">
      <div><img src="/ui/cloud-rain.webp" alt=""/><span>Weather &amp; rainfall<br/>context</span></div>
      <div><img src="/ui/map-folded.webp" alt=""/><span>Mapped pilot<br/>roads</span></div>
      <div><img src="/ui/users.webp" alt=""/><span>Reviewed road<br/>observations</span></div>
    </div><div className="mr-flow-connector" aria-hidden="true"><span>↓</span></div><div className="mr-flow-core"><span className="mr-flow-core-icon"><img src="/ui/bar-chart.webp" alt=""/></span><div><strong>Evidence-aware comparison</strong><span>Relative scoring • bounded detours • uncertainty</span></div></div><div className="mr-flow-connector" aria-hidden="true"><span>↓</span></div><div className="mr-flow-outputs"><div><img src="/ui/flag-green.webp" alt=""/><span>Route alternatives</span></div><div><img src="/ui/clock.webp" alt=""/><span>Travel-time trade-offs</span></div></div></div>
  </div></section>

  <section className="mr-section mr-demo" id="live-map" aria-labelledby="mr-demo-heading"><div className="mr-track">
    <div className="mr-section-row"><div><span className="mr-eyebrow">LIVE PLANNING WORKFLOW</span><h2 id="mr-demo-heading">Explore real route evidence.</h2><p>Weather preview is not proof of street flooding. Open the planner to select supported road points and evaluate available route options.</p></div><Link className="mr-button mr-button-primary" href="/plan">Go to live planner <span aria-hidden="true">↗</span></Link></div>
    <div className="mr-preview"><div className="mr-preview-art"><img loading="lazy" src="/ui/road-delays.webp" alt="Traffic during monsoon rainfall"/><div><span className="mr-preview-label">CENTRAL DELHI PILOT</span><strong>Routes depend on published graph and available evidence.</strong><Link href="/plan">Open interactive map →</Link></div></div><div className="mr-preview-weather"><h3>Current rainfall preview</h3><p>Source-specific timestamps and limitations appear with the forecast.</p><WeatherPreview/></div></div>
  </div></section>

  <section className="mr-section mr-features" id="features" aria-labelledby="mr-features-heading"><div className="mr-track"><div className="mr-section-intro"><span className="mr-eyebrow">KEY FEATURES</span><h2 id="mr-features-heading">Designed for informed monsoon travel.</h2><p>Practical planning tools that keep evidence boundaries visible.</p></div><div className="mr-card-grid">{capabilities.map(item=><article className="mr-info-card" key={item.title}><div className="mr-info-icon"><img src={imageRoot+item.icon} alt=""/></div><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div></div></section>

  <section className="mr-section mr-audience" id="impact" aria-labelledby="mr-impact-heading"><div className="mr-track"><div className="mr-section-intro"><span className="mr-eyebrow">WHO IT HELPS</span><h2 id="mr-impact-heading">For people navigating the city.</h2><p>Make better-informed decisions about the routes available to you.</p></div><div className="mr-card-grid">{audiences.map(item=><article className="mr-info-card mr-audience-card" key={item.title}><div className="mr-info-icon"><img src={imageRoot+item.icon} alt=""/></div><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div></div></section>

  <section className="mr-last-cta" id="technology"><div className="mr-track"><div className="mr-cta-surface"><div className="mr-cta-copy"><span className="mr-eyebrow">MAKE AN INFORMED CHOICE</span><h2>Be prepared for the monsoon.</h2><p>Explore the mapped pilot, compare available routes and check conditions beyond any model estimate.</p><div className="mr-actions"><Link className="mr-button mr-button-primary" href="/plan">Explore routes <span aria-hidden="true">↗</span></Link><Link className="mr-button mr-button-glass" href="/methodology">Understand limitations</Link></div></div><div className="mr-cta-list"><span>✓ Dated rainfall context</span><span>✓ Evidence-aware alternatives</span><span>✓ Community observations after review</span><span>✓ Clear uncertainty boundaries</span></div></div></div></section>
 </div>}
