"""Generate a deterministic, explicitly SYNTHETIC topology and derived GeoJSON.

No coordinates, road classes or flood assertions are sourced from OSM. For UI/engine tests only.
"""
from __future__ import annotations
import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'
PUBLIC=ROOT/'public'/'pilot'/'synthetic'
STEPS=6
LAT0,LON0=28.6232,77.2090
DELTA=.00038

def canonical(data):return json.dumps(data,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()

def build():
    nodes=[];edges=[]
    for r in range(STEPS):
        for c in range(STEPS):
            nodes.append({'id':f'p{r}-{c}','lat':round(LAT0+r*DELTA,7),'lon':round(LON0+c*DELTA,7)})
    lookup={n['id']:n for n in nodes}
    def add(fr,to):
        a,b=lookup[fr],lookup[to]
        r1,c1=map(int,fr[1:].split('-'));r2,c2=map(int,to[1:].split('-'))
        central=2<=min(r1,r2)<=3 and 1<=min(c1,c2)<=4
        high=central and (r1 in (2,3) or c1 in (2,3))
        underpass=(r1==3 and c1==3) or (r2==3 and c2==3)
        length=round(((a['lat']-b['lat'])*111320)**2+((a['lon']-b['lon'])*97730)**2,2)**.5
        length=round(length,3)
        edges.append({'id':f'{fr}__{to}','from':fr,'to':to,'length_m':length,
          'time_s':round(length/8.5*(1.15 if central else 1),3),
          'hotspot_factor':.87 if high else (.20 if central else .03),
          'depression_factor':.7 if high else .15,
          'underpass':underpass,'terrain_valid':False,
          'physical_key':'_'.join(sorted([fr,to])),
          'geom':[[a['lon'],a['lat']],[b['lon'],b['lat']]]})
    for r in range(STEPS):
        for c in range(STEPS):
            if c+1<STEPS:
                a,b=f'p{r}-{c}',f'p{r}-{c+1}';add(a,b);add(b,a)
            if r+1<STEPS:
                a,b=f'p{r}-{c}',f'p{r+1}-{c}';add(a,b);add(b,a)
    base={'version':'synthetic-grid-v1','nodes':nodes,'edges':edges,'turn_restrictions':[]}
    digest=hashlib.sha256(canonical(base)).hexdigest();graph={**base,'sha256':digest}
    OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
    (OUT/'synthetic-graph.json').write_bytes(canonical(graph))
    geo={'type':'FeatureCollection','features':[{'type':'Feature','id':e['id'],'properties':{'id':e['id'],'name':'Synthetic link '+e['id'],'risk_class':'illustrative'},'geometry':{'type':'LineString','coordinates':e['geom']}} for e in edges]}
    (PUBLIC/'roads.geojson').write_bytes(canonical(geo))
    landmarks=[{'id':n['id'],'name':'Grid point '+n['id'],'point':{'lat':n['lat'],'lon':n['lon']}} for n in nodes if n['id'] in ('p0-0','p0-5','p5-0','p5-5','p2-2','p3-3')]
    (PUBLIC/'landmarks.json').write_bytes(canonical(landmarks))
    frame={'id':'synthetic-grid','title':'Synthetic grid — routing logic exercise','kind':'synthetic','effective_at':'2026-10-10T12:00:00Z','graph_sha256':digest,'graph_path':'artifacts/synthetic-graph.json','weather':{'r1_past':16,'r3_past':26,'r1_future':8,'r3_future':16,'retrieved_at':'2026-10-10T12:00:00Z','source_issued_at':None},'disclaimer':'Artificial topology and hypothetical rainfall; not road measurements, not navigational guidance.'}
    (OUT/'synthetic-scenario.json').write_bytes(canonical(frame))
    return {'sha256':digest,'nodes':len(nodes),'edges':len(edges)}
if __name__=='__main__':print(json.dumps(build(),sort_keys=True))
