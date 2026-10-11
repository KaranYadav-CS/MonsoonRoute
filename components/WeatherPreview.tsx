'use client';
import {useEffect,useState} from 'react';
type Cell={cellId:number;precipitationNext3hMm:number;samples:number};
type Payload={source:string;retrievedAt:string;cells:Cell[];disclaimer:string;forecastWindowHours:number};
export default function WeatherPreview(){
  const [data,setData]=useState<Payload|null>(null);
  const [state,setState]=useState<'loading'|'ready'|'unavailable'>('loading');
  useEffect(()=>{
    const controller=new AbortController();
    const t=window.setTimeout(()=>{
      void fetch('/api/v1/weather-preview',{signal:controller.signal}).then(async response=>{
        const value=await response.json();
        if(!response.ok||value?.cells?.length!==9)throw Error('WEATHER_UNAVAILABLE');
        setData(value);setState('ready');
      }).catch(()=>{if(!controller.signal.aborted)setState('unavailable')});
    },0);
    return ()=>{window.clearTimeout(t);controller.abort()};
  },[]);
  return <section className="panel" aria-label="Live rainfall forecast preview">
    <div className="resultTop"><h2>Real rainfall forecast · Central Delhi</h2><span className="indicator">Forecast only</span></div>
    <p className="muted small">Nine fixed Open-Meteo grid cells, next three hours. Weather is not road flooding evidence.</p>
    {state==='loading'&&<p role="status">Retrieving verified rainfall data…</p>}
    {state==='unavailable'&&<p role="status" className="notice warning">Rainfall service unavailable. No readings are being estimated locally.</p>}
    {state==='ready'&&data&&<><p className="small">Source: {data.source} · Retrieved {new Date(data.retrievedAt).toLocaleString()}</p>
    <div className="grid3">{data.cells.map(cell=><div className="resultRoute" key={cell.cellId}><span className="muted small">Grid cell {cell.cellId+1}</span><div><strong>{cell.precipitationNext3hMm.toFixed(1)} mm</strong> <span className="small">forecast / 3h</span></div><span className="muted small">{cell.samples} hourly estimates</span></div>)}</div>
    <p className="notice warning small">{data.disclaimer}</p></>}
  </section>;
}
