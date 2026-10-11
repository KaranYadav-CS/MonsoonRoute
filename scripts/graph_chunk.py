"""Emit bounded, idempotent staging SQL for connector-backed graph imports."""
import argparse,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def literal(value):return "'"+str(value).replace("'","''")+"'"
def main():
    p=argparse.ArgumentParser();p.add_argument('phase',choices=['nodes','edges','turns']);p.add_argument('offset',type=int);p.add_argument('count',type=int);a=p.parse_args()
    graph=json.loads((ROOT/'artifacts/graph.json').read_text(encoding='utf-8'));manifest=json.loads((ROOT/'artifacts/graph-manifest.json').read_text(encoding='utf-8'));gid=literal(manifest['graph_id'])
    if a.phase=='nodes':
        data=[[n['id'],n['lon'],n['lat']] for n in graph['nodes'][a.offset:a.offset+a.count]]
        sql=f"insert into public.road_nodes(graph_id,node_id,geom) select {gid}::uuid,x->>0,gis.st_setsrid(gis.st_makepoint((x->>1)::double precision,(x->>2)::double precision),4326) from jsonb_array_elements({literal(json.dumps(data,separators=(',',':'),ensure_ascii=False))}::jsonb) x on conflict do nothing;"
    elif a.phase=='edges':
        data=[[e['id'],e['physical_key'],e['from'],e['to'],e['osm_way_id'],e.get('name'),e['highway'],e['geom'],e['length_m'],e['time_s'],e['hotspot_factor'],e['depression_factor'],e['underpass'],e['terrain_valid'],e.get('tags',{})] for e in graph['edges'][a.offset:a.offset+a.count]]
        sql=f"insert into public.road_edges(graph_id,edge_id,physical_key,from_node,to_node,osm_way_id,name,highway,geom,length_m,time_s,hotspot_factor,depression_factor,underpass,terrain_valid,tags) select {gid}::uuid,x->>0,x->>1,x->>2,x->>3,(x->>4)::bigint,x->>5,x->>6,gis.st_setsrid(gis.st_geomfromgeojson(jsonb_build_object('type','LineString','coordinates',x->7)),4326),(x->>8)::double precision,(x->>9)::double precision,(x->>10)::double precision,(x->>11)::double precision,(x->>12)::boolean,(x->>13)::boolean,x->14 from jsonb_array_elements({literal(json.dumps(data,separators=(',',':'),ensure_ascii=False))}::jsonb) x on conflict do nothing;"
    else:
        data=[[t['from_edge'],t['to_edge'],t['via_node']] for t in graph['turn_restrictions'][a.offset:a.offset+a.count]]
        sql=f"insert into public.turn_restrictions(graph_id,from_edge,to_edge,via_node,reason) select {gid}::uuid,x->>0,x->>1,x->>2,'osm_turn_restriction' from jsonb_array_elements({literal(json.dumps(data,separators=(',',':')))}::jsonb) x on conflict do nothing;"
    print(json.dumps({'query':sql,'count':len(data)}))
if __name__=='__main__':main()
