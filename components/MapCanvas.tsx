'use client';
import {useEffect,useRef} from 'react';
import type {RouteDecision} from '@/packages/engine/index';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {Map as MaplibreMap,GeoJSONSource} from 'maplibre-gl';
type Point={lat:number;lon:number};
const empty=():GeoJSON.FeatureCollection=>({type:'FeatureCollection',features:[]});
function features(origin:Point,destination:Point,result:RouteDecision|null):GeoJSON.FeatureCollection{
  const markers:GeoJSON.Feature[]=[origin,destination].map((p,i)=>({type:'Feature',properties:{label:i?'Destination':'Origin',type:i?'destination':'origin'},geometry:{type:'Point',coordinates:[p.lon,p.lat]}}));
  if(result){if(result.baseline?.geometry?.coordinates?.length)markers.push({type:'Feature',properties:{label:'Fastest baseline',type:'baseline'},geometry:result.baseline.geometry});if(result.recommendation?.geometry?.coordinates?.length)markers.push({type:'Feature',properties:{label:'Lower relative index',type:'recommended'},geometry:result.recommendation.geometry})}
  return {type:'FeatureCollection',features:markers};
}
export default function MapCanvas({onPick,demo,origin,destination,result}:{onPick?:(p:Point)=>void;demo:boolean;origin:Point;destination:Point;result:RouteDecision|null}){
  const container=useRef<HTMLDivElement>(null);const mapRef=useRef<MaplibreMap|null>(null);const pick=useRef(onPick);useEffect(()=>{pick.current=onPick},[onPick]);
  useEffect(()=>{if(!container.current)return;let cancelled=false;let map:MaplibreMap|null=null;import('maplibre-gl').then(({default:lib})=>{
    if(cancelled||!container.current)return;
    map=new lib.Map({container:container.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[77.2100,28.6243],zoom:14.5,minZoom:11,maxZoom:17,attributionControl:true});mapRef.current=map;
    map.addControl(new lib.NavigationControl({showCompass:false}),'top-right');map.on('click',e=>pick.current?.({lat:e.lngLat.lat,lon:e.lngLat.lng}));map.on('load',()=>{
      if(!map||cancelled)return;map.addSource('pilot-roads',{type:'geojson',data:empty()});map.addLayer({id:'pilot-roads',type:'line',source:'pilot-roads',paint:{'line-color':'#198d86','line-width':4,'line-opacity':.75}});
      map.addSource('journey',{type:'geojson',data:empty()});map.addLayer({id:'fastest',type:'line',source:'journey',filter:['==',['get','type'],'baseline'],paint:{'line-color':'#1a4262','line-width':7,'line-opacity':.95}});map.addLayer({id:'recommended',type:'line',source:'journey',filter:['==',['get','type'],'recommended'],paint:{'line-color':'#e57b4c','line-width':6,'line-opacity':.95,'line-dasharray':[2,1]}});map.addLayer({id:'pins',type:'circle',source:'journey',filter:['in',['get','type'],['literal',['origin','destination']]],paint:{'circle-radius':9,'circle-color':['match',['get','type'],'origin','#0a9188','#e77750'],'circle-stroke-color':'#fff','circle-stroke-width':3}});
      (map.getSource('journey') as GeoJSONSource).setData(features(origin,destination,result));
      if(demo)fetch('/pilot/synthetic/roads.geojson',{cache:'force-cache'}).then(r=>r.ok?r.json():null).then(data=>{if(data&&!cancelled&&map?.getSource('pilot-roads'))(map.getSource('pilot-roads') as GeoJSONSource).setData(data)}).catch(()=>{});
    });
  });return()=>{cancelled=true;map?.remove();mapRef.current=null}},[]);
  useEffect(()=>{const m=mapRef.current;if(!m||!m.getSource('journey'))return;(m.getSource('journey') as GeoJSONSource).setData(features(origin,destination,result))},[origin,destination,result]);
  useEffect(()=>{const m=mapRef.current;if(!m||!m.getSource('pilot-roads'))return;const s=m.getSource('pilot-roads') as GeoJSONSource;if(!demo){s.setData(empty());return}fetch('/pilot/synthetic/roads.geojson').then(r=>r.ok?r.json():null).then(data=>{if(data&&mapRef.current?.getSource('pilot-roads'))s.setData(data)}).catch(()=>{})},[demo]);
  return <div ref={container} className="map" role="application" aria-label={demo?'OpenStreetMap basemap with synthetic grid route overlay; not navigational':'Real Central Delhi street basemap for selecting endpoints; flood-risk routing currently unavailable'}><div className="mapHint">{demo?'REAL STREET BASEMAP + SYNTHETIC ROUTE OVERLAY — NOT FOR NAVIGATION':'REAL OSM STREET BASEMAP — LIVE FLOOD RISK UNAVAILABLE'} · Use the coordinate fields for keyboard access.</div></div>;
}
