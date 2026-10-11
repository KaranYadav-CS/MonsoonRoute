"""Compile the captured OSM source, attach real terrain, and version public assets."""
import datetime, hashlib, json, math, pathlib, urllib.request, urllib.parse, xml.etree.ElementTree as ET
from collections import deque
from build_graph import compile_osm, canonical, BBOX, haversine

ROOT=pathlib.Path(__file__).resolve().parents[1]

def compress_geometry(graph):
    """Shape points are geometry, not intersections; retain every legal junction."""
    pieces={};adjacent={};ways_at={};node_map={n['id']:n for n in graph['nodes']}
    for edge in graph['edges']:pieces.setdefault(edge['physical_key'],[]).append(edge)
    for key,edges in pieces.items():
        for node in (edges[0]['from'],edges[0]['to']):
            adjacent.setdefault(node,[]).append(key);ways_at.setdefault(node,set()).add(edges[0]['osm_way_id'])
    anchors={n for n,p in adjacent.items() if len(p)!=2 or len(ways_at[n])!=1}
    anchors.update(t['via_node'] for t in graph['turn_restrictions'])
    from pyproj import Transformer
    forward=Transformer.from_crs(4326,32643,always_xy=True);inverse=Transformer.from_crs(32643,4326,always_xy=True)
    unseen=set(pieces);compiled=[];mapping={};pending=deque((n,k) for n in sorted(anchors) for k in sorted(adjacent[n]))
    while unseen:
        while pending and pending[0][1] not in unseen:pending.popleft()
        if pending:start,key=pending.popleft()
        else:key=min(unseen);start=pieces[key][0]['from']
        first=pieces[key][0]
        node=start;chain=[];length=0;geom=[];path_keys=[]
        while key in unseen:
            piece=pieces[key];e=piece[0];next_node=e['to'] if e['from']==node else e['from']
            coords=e['geom'] if e['from']==node else list(reversed(e['geom']))
            chain.append((node,next_node,piece));path_keys.append(key);length+=e['length_m'];geom.extend(coords if not geom else coords[1:]);unseen.remove(key)
            node=next_node
            if node in anchors or node==start:break
            options=[k for k in adjacent[node] if k in unseen]
            if len(options)!=1:break
            candidate=options[0]
            key=candidate
        if start==node:
            # Closed rings stay split, so no self-loop enters the graph.
            for a,b,piece in chain:
                for e in piece:compiled.append(e);mapping[e['id']]=e['id']
            continue
        identity=str(first['osm_way_id'])+':'+hashlib.sha256('|'.join(sorted(path_keys)).encode()).hexdigest()[:20]
        projected=[forward.transform(*p) for p in geom];distances=[0.0]
        for a,b in zip(projected,projected[1:]):distances.append(distances[-1]+math.hypot(b[0]-a[0],b[1]-a[1]))
        total=distances[-1];splits=max(1,math.ceil(total/100));step=total/splits
        def at(distance):
            if distance>=total:return geom[-1]
            index=next(i for i in range(len(distances)-1) if distances[i]<=distance<=distances[i+1])
            fraction=(distance-distances[index])/(distances[index+1]-distances[index] or 1)
            a,b=projected[index],projected[index+1]
            return list(inverse.transform(a[0]+fraction*(b[0]-a[0]),a[1]+fraction*(b[1]-a[1])))
        chunk_nodes=[start]+['osmshape:'+identity+':'+str(i) for i in range(1,splits)]+[node]
        for i,n in enumerate(chunk_nodes[1:-1],1):
            lon,lat=at(i*step);node_map[n]={'id':n,'lat':round(lat,8),'lon':round(lon,8)}
        chunks=[]
        for i in range(splits):
            coordinates=[at(i*step)]+[geom[j] for j,d in enumerate(distances) if i*step<d<(i+1)*step]+[at((i+1)*step)]
            coordinates=[list(p) for p in coordinates];coordinates[0]=[node_map[chunk_nodes[i]]['lon'],node_map[chunk_nodes[i]]['lat']];coordinates[-1]=[node_map[chunk_nodes[i+1]]['lon'],node_map[chunk_nodes[i+1]]['lat']]
            segment_length=sum(haversine((a[1],a[0]),(b[1],b[0])) for a,b in zip(coordinates,coordinates[1:]))
            chunks.append((coordinates,segment_length))
        for reverse in (False,True):
            directed=[]
            for a,b,piece in chain:
                found=next((e for e in piece if e['from']==(b if reverse else a) and e['to']==(a if reverse else b)),None)
                if not found:break
                directed.append(found)
            if len(directed)!=len(chain):continue
            for i,(coordinates,segment_length) in enumerate(chunks):
                physical=identity+':'+str(i);edge=dict(directed[0]);edge.update(id=physical+(':r' if reverse else ':f'),physical_key=physical,
                    **{'from':chunk_nodes[i+1] if reverse else chunk_nodes[i],'to':chunk_nodes[i] if reverse else chunk_nodes[i+1]},
                    geom=list(reversed(coordinates)) if reverse else coordinates,length_m=round(segment_length,3),
                    time_s=round(segment_length*sum(e['time_s']-2 for e in directed)/length+2,6))
                compiled.append(edge)
            for original in directed:
                split=splits-1 if original['to']==node or original['from']==node else 0
                mapping[original['id']]=identity+':'+str(split)+(':r' if reverse else ':f')
    used={e['from'] for e in compiled}|{e['to'] for e in compiled}
    restrictions=[{**t,'from_edge':mapping[t['from_edge']],'to_edge':mapping[t['to_edge']]} for t in graph['turn_restrictions']]
    graph.update(nodes=sorted([node_map[n] for n in used],key=lambda n:n['id']),edges=sorted(compiled,key=lambda e:e['id']),turn_restrictions=restrictions)
    if len(graph['nodes'])>15000 or len(graph['edges'])>21000:raise ValueError(f"NORMALIZED_GRAPH_EXCEEDS_CONTRACT nodes={len(graph['nodes'])} edges={len(graph['edges'])}")
    return graph

def main():
    source=ROOT/'data/osm/central-delhi.json'; payload=json.loads(source.read_text(encoding='utf-8')); capture=json.loads(source.with_suffix('.manifest.json').read_text(encoding='utf-8'))
    if hashlib.sha256(source.read_bytes()).hexdigest()!=capture['sha256']:raise ValueError('SOURCE_DIGEST_MISMATCH')
    xml=ET.Element('osm',version='0.6')
    for item in payload['elements']:
        kind=item['type']; attrs={'id':str(item['id'])}
        if kind=='node':attrs.update(lat=str(item['lat']),lon=str(item['lon']))
        el=ET.SubElement(xml,kind,attrs)
        for node in item.get('nodes',[]):ET.SubElement(el,'nd',ref=str(node))
        for member in item.get('members',[]):ET.SubElement(el,'member',type=member['type'],ref=str(member['ref']),role=member['role'])
        for key,value in item.get('tags',{}).items():ET.SubElement(el,'tag',k=key,v=value)
    path=source.with_suffix('.osm');ET.ElementTree(xml).write(path,encoding='utf-8',xml_declaration=True)
    graph,manifest=compile_osm(path,capture['source_timestamp'],allow_oversize=True);graph=compress_geometry(graph)
    manifest.update(node_count=len(graph['nodes']),edge_count=len(graph['edges']))
    manifest['source_sha256']=capture['sha256'];manifest['source_url']=capture['source_url'];manifest['query']=capture['query']
    manifest['retrieved_at']=capture['retrieved_at'];manifest['transform_version']='release-graph-v1';manifest['scope_reduction']='Predeclared inner pilot';manifest['max_directed_edges']=21000
    # Discover the actual public Copernicus tile key instead of assuming a filename.
    url='https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com/?'+urllib.parse.urlencode({'list-type':'2','prefix':'Copernicus_DSM_COG_10_N28_00_E077_00','max-keys':'50'})
    listing=ET.fromstring(urllib.request.urlopen(url,timeout=20).read(1_000_000))
    keys=[x.text for x in listing.iter() if x.tag.endswith('}Key') and x.text.endswith('_DEM.tif') and '/AUXFILES/' not in x.text and '/PREVIEW/' not in x.text]
    terrain_count=0
    if len(keys)!=1:raise ValueError('TERRAIN_TILE_DISCOVERY_FAILED')
    import rasterio, numpy as np
    tile_url='https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com/'+keys[0]
    local=ROOT/'data/terrain/pilot-window.tif';local.parent.mkdir(parents=True,exist_ok=True)
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
        with rasterio.open(tile_url) as ds:
            window=rasterio.windows.from_bounds(77.178,28.588,77.257,28.667,ds.transform).round_offsets().round_lengths()
            arr=ds.read(1,window=window,masked=True);transform=ds.window_transform(window)
            profile=ds.profile;profile.update(width=arr.shape[1],height=arr.shape[0],transform=transform)
            with rasterio.open(local,'w',**profile) as out:out.write(arr.filled(ds.nodata or -9999),1)
    with rasterio.open(local) as ds:
        for edge in graph['edges']:
            if edge['underpass'] or edge['tags'].get('bridge') not in (None,'no'):continue
            a,b=edge['geom'][0],edge['geom'][-1]; mid=((a[0]+b[0])/2,(a[1]+b[1])/2)
            count=max(2,math.ceil(edge['length_m']/30)+1)
            samples=[(a[0]+(b[0]-a[0])*i/(count-1),a[1]+(b[1]-a[1])*i/(count-1)) for i in range(count)]
            heights=np.array([float(v[0]) for v in ds.sample(samples)])
            row,col=ds.index(*mid);r=6
            neighborhood=ds.read(1,window=rasterio.windows.Window(max(0,col-r),max(0,row-r),2*r+1,2*r+1),masked=True).compressed()
            if len(neighborhood) and np.isfinite(heights).all() and np.all(heights>-500):
                edge['depression_factor']=round(float(np.clip((np.median(neighborhood)-np.percentile(heights,10))/2,0,1)),6)
                edge['terrain_valid']=True;terrain_count+=1
    manifest['terrain_status']='COPERNICUS_GLO30_ATTACHED';manifest['terrain_source_url']=tile_url
    manifest['terrain_sha256']=hashlib.sha256(local.read_bytes()).hexdigest();manifest['terrain_valid_edges']=terrain_count
    manifest['hotspot_status']='NO_INDEPENDENTLY_REVIEWED_HOTSPOTS';manifest['limitations']=['Coarse surface elevation; no road water depth','No curated historic hotspot points','Static duration excludes traffic','OSM access/turn data can be incomplete']
    # Real road-junction anchors, selected across the pilot; no fabricated POI entrances.
    outgoing={};nodes={n['id']:n for n in graph['nodes']}
    for edge in graph['edges']:outgoing.setdefault(edge['from'],[]).append(edge)
    candidates=[(node,edges) for node,edges in outgoing.items() if len(edges)>=3 and any(e.get('name') for e in edges) and BBOX[0]<=nodes[node]['lon']<=BBOX[2] and BBOX[1]<=nodes[node]['lat']<=BBOX[3]]
    landmarks=[]
    for i in range(5):
        for j in range(5):
            lon=BBOX[0]+(i+.5)*(BBOX[2]-BBOX[0])/5;lat=BBOX[1]+(j+.5)*(BBOX[3]-BBOX[1])/5
            local_candidates=[(n,e) for n,e in candidates if BBOX[0]+i*(BBOX[2]-BBOX[0])/5<=nodes[n]['lon']<=BBOX[0]+(i+1)*(BBOX[2]-BBOX[0])/5 and BBOX[1]+j*(BBOX[3]-BBOX[1])/5<=nodes[n]['lat']<=BBOX[1]+(j+1)*(BBOX[3]-BBOX[1])/5]
            if not local_candidates:continue
            node,edges=min(local_candidates,key=lambda item:(haversine((lat,lon),(nodes[item[0]]['lat'],nodes[item[0]]['lon'])),item[0]))
            names=sorted(set(e['name'] for e in edges if e.get('name')))
            landmarks.append({'id':'junction-'+hashlib.sha256(node.encode()).hexdigest()[:16],'name':' / '.join(names[:2]),'point':{'lat':nodes[node]['lat'],'lon':nodes[node]['lon']},'kind':'road_junction_anchor'})
    landmarks=landmarks[:20]
    graph['sha256']=hashlib.sha256(canonical({k:v for k,v in graph.items() if k!='sha256'})).hexdigest()
    manifest['compiled_graph_sha256']=graph['sha256'];manifest['publish_ready']=True
    (ROOT/'artifacts/graph.json').write_bytes(canonical(graph));(ROOT/'artifacts/graph-manifest.json').write_bytes(canonical(manifest));(ROOT/'artifacts/landmarks.json').write_bytes(canonical(landmarks))
    public=ROOT/'public/pilot'/graph['sha256'];public.mkdir(parents=True,exist_ok=True)
    features=[{'type':'Feature','id':e['id'],'properties':{'edge_id':e['id'],'name':e.get('name'),'physical_key':e['physical_key']},'geometry':{'type':'LineString','coordinates':e['geom']}} for e in graph['edges']]
    (public/'roads.geojson').write_bytes(canonical({'type':'FeatureCollection','features':features}));(public/'landmarks.json').write_bytes(canonical(landmarks))
    print(json.dumps({'nodes':len(graph['nodes']),'edges':len(graph['edges']),'turn_restrictions':len(graph['turn_restrictions']),'terrain_edges':terrain_count,'landmarks':len(landmarks),'graph_sha256':graph['sha256']}))

if __name__=='__main__':main()
