"""Deterministic OSM XML graph compiler for the Central Delhi pilot.

Only compiles a separately reviewed, legitimately obtained .osm source file. Never
fetches data, fabricates road topology or enables a graph automatically.
"""
from __future__ import annotations
import argparse,hashlib,json,math,pathlib,re,xml.etree.ElementTree as ET
from dataclasses import dataclass

BBOX=(77.200,28.610,77.240,28.650)
DRIVABLE={'motorway','trunk','primary','secondary','tertiary','residential','unclassified','service','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link','living_street'}
SPEED={'motorway':50,'trunk':50,'primary':35,'secondary':30,'tertiary':25,'residential':20,'service':10,'living_street':10,'unclassified':25}


def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
def haversine(a,b):
    rad=math.pi/180;dl=(b[1]-a[1])*rad;dp=(b[0]-a[0])*rad
    x=math.sin(dp/2)**2+math.cos(a[0]*rad)*math.cos(b[0]*rad)*math.sin(dl/2)**2
    return 2*6371008.8*math.asin(min(1,math.sqrt(x)))
def supported(lat,lon):return BBOX[0]<=lon<=BBOX[2] and BBOX[1]<=lat<=BBOX[3]

def parse_source(path:pathlib.Path):
    if not path.exists() or path.stat().st_size>75_000_000:raise ValueError('SOURCE_MISSING_OR_TOO_LARGE')
    with path.open('rb') as source:head=source.read(10000)
    if b'<!DOCTYPE' in head or b'<!ENTITY' in head:raise ValueError('DTD_OR_ENTITY_NOT_ALLOWED')
    nodes={};ways=[];relations=[]
    try:
        for _,elem in ET.iterparse(str(path),events=('end',)):
            if elem.tag=='node':
                lat=float(elem.attrib['lat']);lon=float(elem.attrib['lon'])
                if BBOX[0]-.010<=lon<=BBOX[2]+.010 and BBOX[1]-.010<=lat<=BBOX[3]+.010:nodes[elem.attrib['id']]=(lat,lon)
                elem.clear()
            elif elem.tag=='way':
                tags={x.attrib['k']:x.attrib['v'] for x in elem.findall('tag')}
                access=tags.get('motorcar',tags.get('motor_vehicle',tags.get('access','yes')))
                if tags.get('highway') in DRIVABLE and tags.get('area')!='yes' and access not in ('no','private'):
                    ways.append((elem.attrib['id'],[x.attrib['ref'] for x in elem.findall('nd')],tags))
                elem.clear()
            elif elem.tag=='relation':
                tags={x.attrib['k']:x.attrib['v'] for x in elem.findall('tag')}
                if tags.get('type')=='restriction':
                    members=[(x.attrib.get('type'),x.attrib.get('role'),x.attrib.get('ref')) for x in elem.findall('member')]
                    relations.append((elem.attrib['id'],tags,members))
                elem.clear()
    except (ET.ParseError,KeyError,ValueError) as e:raise ValueError('OSM_XML_INVALID') from e
    return nodes,sorted(ways,key=lambda x:int(x[0])),relations

def compile_osm(path:pathlib.Path,captured_at:str,*,allow_oversize=False):
    from datetime import datetime
    try:datetime.fromisoformat(captured_at.replace('Z','+00:00'))
    except ValueError as e:raise ValueError('CAPTURE_TIMESTAMP_INVALID') from e
    source_sha=hashlib.sha256(path.read_bytes()).hexdigest()
    src,ways,relations=parse_source(path)
    nodes={};edges=[];first_last={};warnings=[];excluded=set()
    for rel_id,tags,members in relations:
        if any(':conditional' in k for k in tags) or any(m[0]=='way' and m[1]=='via' for m in members):
            excluded.update(m[2] for m in members if m[0]=='way')
            warnings.append({'relation_id':rel_id,'reason':'UNSUPPORTED_RESTRICTION_WAYS_EXCLUDED'})
    def add_node(k,p):nodes[k]={'id':k,'lat':round(p[0],8),'lon':round(p[1],8)}
    for way_id,refs,tags in ways:
        if way_id in excluded or any(':conditional' in k for k in tags):continue
        direction=tags.get('oneway:motorcar',tags.get('oneway:motor_vehicle',tags.get('oneway')))
        if direction not in (None,'yes','true','1','-1','no','false','0'):
            warnings.append({'way_id':way_id,'reason':'UNKNOWN_DIRECTION_EXCLUDED'});continue
        highway=tags['highway'];speed=SPEED.get(highway.replace('_link',''),25)
        numeric=re.search(r'\d+(?:\.\d+)?',tags.get('maxspeed',''))
        if numeric:
            claimed=float(numeric.group());speed=min(speed,claimed*(1.609344 if 'mph' in tags['maxspeed'] else 1))
        speed=max(5,min(80,speed))
        reverse=direction=='-1'
        oneway=reverse or direction in ('yes','true','1') or (direction is None and (tags.get('junction')=='roundabout' or highway in ('motorway','motorway_link')))
        for i,(start,end) in enumerate(zip(refs,refs[1:])):
            if start not in src or end not in src or start==end:continue
            a,b=src[start],src[end];distance=haversine(a,b)
            if distance<2 or distance>10000:continue
            subdivisions=math.ceil(distance/95)
            keys=[]
            for k in range(subdivisions+1):
                key=f'osm:{start}' if k==0 else f'osm:{end}' if k==subdivisions else f'osmseg:{way_id}:{i}:{k}'
                interp=(a[0]+(b[0]-a[0])*k/subdivisions,a[1]+(b[1]-a[1])*k/subdivisions)
                add_node(key,interp);keys.append(key)
            dirs=[list(reversed(keys))] if reverse else [keys]
            if not oneway:dirs.append(list(reversed(keys)))
            for path_keys in dirs:
                for j,(fr,to) in enumerate(zip(path_keys,path_keys[1:])):
                    p,q=nodes[fr],nodes[to];length=haversine((p['lat'],p['lon']),(q['lat'],q['lon']))
                    if length>105:raise ValueError('RESAMPLED_EDGE_TOO_LONG')
                    identity=f'{way_id}:{i}:{fr}:{to}'
                    edge={'id':identity,'from':fr,'to':to,'length_m':round(length,3),'time_s':round(length/(speed*1000/3600),3),
                          'hotspot_factor':0,'depression_factor':None,'underpass':tags.get('tunnel') not in (None,'no','false','0'),
                          'terrain_valid':False,'physical_key':f'{way_id}:{i}:{min(fr,to)}:{max(fr,to)}',
                          'osm_way_id':int(way_id),'name':tags.get('name'), 'highway':highway,
                          'tags':{k:v for k,v in tags.items() if k in ('name','highway','oneway','surface','bridge','tunnel','layer')},
                          'geom':[[p['lon'],p['lat']],[q['lon'],q['lat']]]}
                    edge['time_s']=round(length/(speed*1000/3600)+2,6)
                    edges.append(edge);first_last.setdefault(way_id,[]).append(edge)
    # Keep the largest actual weak component; proximity never joins carriageways.
    adjacent={}
    for edge in edges:
        adjacent.setdefault(edge['from'],set()).add(edge['to']);adjacent.setdefault(edge['to'],set()).add(edge['from'])
    unseen=set(adjacent);components=[]
    while unseen:
        start=min(unseen);stack=[start];component=set()
        while stack:
            node=stack.pop()
            if node in component:continue
            component.add(node);unseen.discard(node);stack.extend(adjacent[node]-component)
        components.append(component)
    retained=max(components,key=lambda c:(len(c),min(c))) if components else set()
    edges=[e for e in edges if e['from'] in retained and e['to'] in retained]
    nodes={k:v for k,v in nodes.items() if k in retained}
    first_last={w:[e for e in es if e['from'] in retained and e['to'] in retained] for w,es in first_last.items()}
    if not edges or (not allow_oversize and (len(nodes)>15000 or len(edges)>20000)):raise ValueError(f'GRAPH_BOUNDS_UNSUPPORTED nodes={len(nodes)} edges={len(edges)}')
    turn_restrictions=[];seen=set()
    for rel_id,tags,members in relations:
        if any(m[2] in excluded for m in members if m[0]=='way') or 'motorcar' in tags.get('except','').split(';'):continue
        if any(m[0]=='way' and m[1]=='via' for m in members):
            warnings.append({'relation_id':rel_id,'reason':'VIA_WAY_UNSUPPORTED'});continue
        frm=next((m[2] for m in members if m[0]=='way' and m[1]=='from'),None)
        to=next((m[2] for m in members if m[0]=='way' and m[1]=='to'),None)
        via=next((m[2] for m in members if m[0]=='node' and m[1]=='via'),None)
        rt=tags.get('restriction:motorcar',tags.get('restriction:motor_vehicle',tags.get('restriction','')));via_key=f'osm:{via}'
        if not frm or not to or not via or not (rt.startswith('no_') or rt.startswith('only_')):
            warnings.append({'relation_id':rel_id,'reason':'RESTRICTION_UNSUPPORTED'});continue
        incoming=[e for e in first_last.get(frm,[]) if e['to']==via_key]
        to_edges=[e for e in first_last.get(to,[]) if e['from']==via_key]
        outgoing=[e for e in edges if e['from']==via_key]
        if not incoming or not to_edges:
            warnings.append({'relation_id':rel_id,'reason':'RESTRICTION_OUTSIDE_NETWORK'});continue
        forbidden=[e for e in (outgoing if rt.startswith('only_') else to_edges) if rt.startswith('no_') or e not in to_edges]
        for f in incoming:
            for t in forbidden:
                marker=(f['id'],t['id'])
                if marker not in seen:
                    seen.add(marker);turn_restrictions.append({'from_edge':f['id'],'to_edge':t['id'],'via_node':via_key})
    payload={'version':'osm-pilot-'+source_sha[:12],'nodes':sorted(nodes.values(),key=lambda x:x['id']),
             'edges':sorted(edges,key=lambda x:x['id']),
             'turn_restrictions':sorted(turn_restrictions,key=lambda x:(x['from_edge'],x['to_edge']))}
    digest=hashlib.sha256(canonical(payload)).hexdigest()
    manifest={'schema_version':'1.0','kind':'osm_review_required','source_sha256':source_sha,'compiled_graph_sha256':digest,'captured_at':captured_at,
              'osm_contributors':'https://www.openstreetmap.org/copyright','license':'ODbL 1.0','node_count':len(nodes),
              'edge_count':len(edges),'turn_restriction_count':len(turn_restrictions),'unresolved_restrictions':warnings,
              'terrain_status':'NOT_ATTACHED','hotspot_status':'NOT_ATTACHED','supported_bbox':list(BBOX),'publish_ready':False}
    return {**payload,'sha256':digest},manifest

def verify_graph(graph):
    nodes={x['id'] for x in graph.get('nodes',[])}
    if not nodes:raise ValueError('NO_SOURCE_NODES')
    ids=set()
    for e in graph.get('edges',[]):
        if e['id'] in ids or e['from'] not in nodes or e['to'] not in nodes or e['from']==e['to']:raise ValueError('GRAPH_TOPOLOGY_INVALID')
        if not 0<float(e['length_m'])<=105 or not 0<float(e['time_s']):raise ValueError('GRAPH_EDGE_INVALID')
        ids.add(e['id'])
    if not ids:raise ValueError('NO_SOURCE_EDGES')
    return len(nodes),len(ids)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('input',type=pathlib.Path,help='Owner-reviewed OSM XML or already compiled graph.json')
    p.add_argument('--captured-at',help='Actual source capture ISO timestamp (required for OSM)')
    p.add_argument('--license-reviewed',action='store_true',help='Acknowledges ODbL and source provenance review')
    p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('artifacts/graph.json'))
    args=p.parse_args()
    if args.input.suffix.lower()=='.osm':
        if not args.license_reviewed or not args.captured_at:p.error('OSM requires --license-reviewed and --captured-at')
        graph,manifest=compile_osm(args.input,args.captured_at)
        args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_bytes(canonical(graph))
        args.output.with_name('graph-manifest.json').write_bytes(canonical(manifest))
        print(json.dumps({'graph_sha256':graph['sha256'],'publish_ready':False,'node_count':len(graph['nodes']),'edge_count':len(graph['edges'])}))
    else:
        graph=json.loads(args.input.read_text());n,e=verify_graph(graph)
        args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_bytes(canonical(graph))
        print(json.dumps({'node_count':n,'edge_count':e,'source':'external_artifact','publish_ready':False}))
if __name__=='__main__':main()
