'use client';
import {useEffect,useRef} from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {Map as MaplibreMap,Marker as MaplibreMarker} from 'maplibre-gl';
type Point={lat:number;lon:number};
export default function PilotPointPicker({point,onPick}:{point:Point|null;onPick:(p:Point)=>void}){
 const element=useRef<HTMLDivElement>(null),map=useRef<MaplibreMap|null>(null),marker=useRef<MaplibreMarker|null>(null);
 const change=useRef(onPick);
 useEffect(()=>{change.current=onPick},[onPick]);
 useEffect(()=>{if(!element.current)return;let disposed=false;let instance:MaplibreMap|null=null;
  void import('maplibre-gl').then(({default:lib})=>{
   if(disposed||!element.current)return;
   instance=new lib.Map({container:element.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[77.215,28.630],zoom:13.3,minZoom:11,maxZoom:17,attributionControl:{compact:true}});
   map.current=instance;
   instance.addControl(new lib.NavigationControl({showCompass:false}),'top-right');
   instance.on('click',e=>change.current({lat:Number(e.lngLat.lat.toFixed(6)),lon:Number(e.lngLat.lng.toFixed(6))}));
  }).catch(()=>{});
  return()=>{disposed=true;instance?.remove();map.current=null;marker.current=null};
 },[]);
 useEffect(()=>{const m=map.current;if(!m||!point)return;void import('maplibre-gl').then(({default:lib})=>{
  if(map.current!==m)return;
  if(!marker.current)marker.current=new lib.Marker({color:'#098a84'}).setLngLat([point.lon,point.lat]).addTo(m);
  else marker.current.setLngLat([point.lon,point.lat]);
 })},[point]);
 return <div className="pilotMapFrame"><div ref={element} className="map" role="application" aria-label="Real Central Delhi map: click to select observation location"/><p className="small muted">Real OpenStreetMap streets. Click to place your observation. Keyboard users can enter coordinates below. This map does not show verified flooding.</p></div>;
}
