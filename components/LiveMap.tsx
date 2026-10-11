'use client';
import {useEffect,useRef} from 'react';
import {loadMapLibrary} from '@/lib/map-library';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {Map as MapType,GeoJSONSource} from 'maplibre-gl';
import type {RouteDecision} from '@/packages/engine/index';
type Point={lat:number;lon:number};
type Props={onPick?:(p:Point)=>void;demo:boolean;origin:Point;destination:Point;result:RouteDecision|null;horizon?:0|1|3};
const empty=():GeoJSON.FeatureCollection=>({type:'FeatureCollection',features:[]});
function journey(props:Props):GeoJSON.FeatureCollection {
 const features:GeoJSON.Feature[]=[props.origin,props.destination].map((p,i)=>({type:'Feature',properties:{type:i?'destination':'origin'},geometry:{type:'Point',coordinates:[p.lon,p.lat]}}));
 const r=props.result;if(r){features.push({type:'Feature',properties:{type:'baseline',closed:r.comparison.baseline_unavailable},geometry:r.baseline.geometry});if(r.recommendation)features.push({type:'Feature',properties:{type:'recommended'},geometry:r.recommendation.geometry});r.alternatives.forEach(a=>features.push({type:'Feature',properties:{type:'alternative'},geometry:a.geometry}));if(r.over_budget)features.push({type:'Feature',properties:{type:'over-budget'},geometry:r.over_budget.geometry})}
 return {type:'FeatureCollection',features};
}
export default function LiveMap(props:Props){
 const element=useRef<HTMLDivElement>(null),mapRef=useRef<MapType|null>(null),latest=useRef(props),ready=useRef(false),refreshRef=useRef<(()=>void)|null>(null);
 useEffect(()=>{latest.current=props;const map=mapRef.current;if(map&&ready.current)(map.getSource('journey') as GeoJSONSource)?.setData(journey(props))},[props]);
 useEffect(()=>{refreshRef.current?.()},[props.horizon,props.demo]);
 useEffect(()=>{
  let stopped=false,map:MapType|null=null,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|null=null;
  if(!element.current)return;
  void loadMapLibrary().then(async lib=>{
   if(stopped||!element.current)return;
   map=new lib.Map({container:element.current,style:'https://tiles.openfreemap.org/styles/liberty',center:[77.220,28.630],zoom:14.2,minZoom:11,maxZoom:19,attributionControl:{compact:true}});mapRef.current=map;
   map.addControl(new lib.NavigationControl({showCompass:false}),'top-right');
   const bounds:[number,number,number,number]=[77.200,28.610,77.240,28.650];
   const popup=(point:[number,number],title:string,detail:string)=>{const box=document.createElement('div'),heading=document.createElement('strong'),body=document.createElement('p');heading.textContent=title;body.textContent=detail;body.style.maxWidth='245px';box.append(heading,body);new lib.Popup({maxWidth:'280px'}).setLngLat(point).setDOMContent(box).addTo(map!)};
   map.on('click',event=>{
    const p={lat:Number(event.lngLat.lat.toFixed(6)),lon:Number(event.lngLat.lng.toFixed(6))};
    if(latest.current.onPick){if(p.lon<bounds[0]||p.lon>bounds[2]||p.lat<bounds[1]||p.lat>bounds[3]){popup([p.lon,p.lat],'Supported Central Delhi area','Choose a point inside the dashed boundary.');return}latest.current.onPick(p);return}
    if(!map||!ready.current)return;
    const found=map.queryRenderedFeatures(event.point,{layers:['road-evidence','network-roads']})[0];if(!found)return;const properties=found.properties||{};
    const score=properties.risk_index;const closed=properties.closed===true||properties.closed==='true';
    const info=closed?'Human-reviewed temporary closure.':typeof score==='number'?`Relative index ${Math.round(score*100)} / 100. Coverage ${Math.round(Number(properties.evidence_coverage||0)*100)}%. This is not a depth or passability measurement.`:'Zoom in to inspect recent weather and reviewed road evidence.';
    popup([p.lon,p.lat],String(properties.name||'Road segment'),info);
   });
   map.on('load',()=>{
    if(!map||stopped)return;
    map.addSource('pilot-boundary',{type:'geojson',data:{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[bounds[0],bounds[1]],[bounds[2],bounds[1]],[bounds[2],bounds[3]],[bounds[0],bounds[3]],[bounds[0],bounds[1]]]]}}});
    map.addLayer({id:'pilot-boundary-fill',type:'fill',source:'pilot-boundary',paint:{'fill-color':'#0f766e','fill-opacity':.035}});map.addLayer({id:'pilot-boundary-line',type:'line',source:'pilot-boundary',paint:{'line-color':'#0f766e','line-width':2,'line-dasharray':[4,3]}});
    map.addSource('network',{type:'geojson',data:empty()});map.addLayer({id:'network-roads',type:'line',source:'network',paint:{'line-color':'#55717b','line-width':1.5,'line-opacity':.3}});
    map.addSource('road-evidence',{type:'geojson',data:empty()});map.addLayer({id:'road-evidence',type:'line',source:'road-evidence',paint:{'line-color':['case',['==',['get','closed'],true],'#172b40',['==',['get','risk_index'],null],'#7c8d98',['>=',['get','risk_index'],.75],'#b91c1c',['>=',['get','risk_index'],.5],'#c65b28',['>=',['get','risk_index'],.25],'#bd8d16','#358a82'],'line-width':3,'line-opacity':.72}});
    map.addSource('journey',{type:'geojson',data:journey(latest.current)});
    map.addLayer({id:'route-outline',type:'line',source:'journey',filter:['in',['get','type'],['literal',['baseline','recommended','alternative','over-budget']]],paint:{'line-color':'#fff','line-width':9,'line-opacity':.95}});
    map.addLayer({id:'routes',type:'line',source:'journey',filter:['in',['get','type'],['literal',['baseline','recommended','alternative','over-budget']]],paint:{'line-color':['match',['get','type'],'recommended','#087e74','alternative','#8b5cf6','over-budget','#b45309','#164e63'],'line-width':['case',['==',['get','type'],'recommended'],6,4.5]}});
    map.addLayer({id:'journey-pins',type:'circle',source:'journey',filter:['in',['get','type'],['literal',['origin','destination']]],paint:{'circle-radius':9,'circle-color':['match',['get','type'],'origin','#087e74','#c65b28'],'circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    ready.current=true;element.current?.setAttribute('data-map-ready','true');
    void fetch('/api/v1/config').then(r=>r.json()).then(j=>{if(!stopped&&j.data?.roads_geojson_url&&map?.getSource('network'))(map.getSource('network') as GeoJSONSource).setData(j.data.roads_geojson_url)}).catch(()=>{});
    const refresh=()=>{
     if(stopped||!map||latest.current.demo){(map?.getSource('road-evidence') as GeoJSONSource)?.setData(empty());return}
     clearTimeout(timer);timer=setTimeout(()=>{if(!map)return;controller?.abort();controller=new AbortController();const b=map.getBounds();
      const bbox=[Math.max(bounds[0],b.getWest()),Math.max(bounds[1],b.getSouth()),Math.min(bounds[2],b.getEast()),Math.min(bounds[3],b.getNorth())];if(bbox[0]>=bbox[2]||bbox[1]>=bbox[3])return;
      void fetch('/api/v1/segments?bbox='+bbox.map(n=>n.toFixed(6)).join(',')+'&horizon_hours='+(latest.current.horizon??0),{signal:controller.signal,cache:'no-store'}).then(async r=>r.ok?r.json():null).then(j=>{if(!stopped&&j?.data&&map?.getSource('road-evidence'))(map.getSource('road-evidence') as GeoJSONSource).setData(j.data)}).catch(()=>{});
     },400);
    };refreshRef.current=refresh;map.on('moveend',refresh);refresh();
   });
  });
  return()=>{stopped=true;clearTimeout(timer);controller?.abort();ready.current=false;refreshRef.current=null;map?.remove();mapRef.current=null};
 },[]);
 return <div className="map" ref={element} role="application" aria-label="Central Delhi streets, supported pilot boundary, road evidence and calculated routes"><div className="mapHint">{props.demo?'LABELED SYNTHETIC EXERCISE':'OPENSTREETMAP · CENTRAL DELHI PILOT'} · Keyboard coordinates are available beside the map.</div></div>;
}
