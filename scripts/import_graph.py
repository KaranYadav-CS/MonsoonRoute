"""Offline, reviewable transactional PostGIS import SQL writer.

No hosted database access is attempted here. Operators review the generated SQL
and apply it only after source provenance, DEM and hotspot coverage sign-off.
"""
from __future__ import annotations
import argparse,hashlib,json,pathlib,re,uuid,datetime
from build_graph import canonical,verify_graph

def literal(value):
    if value is None:return 'null'
    if isinstance(value,bool):return 'true' if value else 'false'
    if isinstance(value,(float,int)) and not isinstance(value,bool):
        import math
        if not math.isfinite(value):raise ValueError('NONFINITE_SQL_INPUT')
        return str(value)
    if isinstance(value,(list,dict)):return literal(json.dumps(value,separators=(',',':'),ensure_ascii=False))+'::jsonb'
    return "'"+str(value).replace("'","''")+"'"

def make_sql(graph,manifest,*,reviewed:bool=False):
    verify_graph(graph)
    digest=hashlib.sha256(canonical({k:v for k,v in graph.items() if k!='sha256'})).hexdigest()
    if digest!=graph.get('sha256') or manifest.get('compiled_graph_sha256')!=digest:raise ValueError('GRAPH_DIGEST_MISMATCH')
    if not reviewed:raise ValueError('HUMAN_PROVENANCE_APPROVAL_REQUIRED')
    if manifest.get('kind')!='osm_review_required' or not re.fullmatch('[a-f0-9]{64}',manifest.get('source_sha256','')):raise ValueError('OSM_PROVENANCE_MISSING')
    version=str(uuid.uuid4());artifact=str(uuid.uuid4());stamp=manifest['captured_at']
    lines=['begin;','set local statement_timeout = \'120s\';',"select pg_advisory_xact_lock(hashtext('monsoonroute:graph-import'));"]
    lines.append('insert into public.source_artifacts(id,source_id,retrieved_at,source_timestamp,sha256,license_review,metadata) values ('+
        ','.join(map(literal,[artifact,'osm',datetime.datetime.now(datetime.timezone.utc).isoformat(),stamp,manifest['source_sha256'],'approved',{'license':'ODbL 1.0','captured_at':stamp,'source_sha256':manifest['source_sha256']}]))+');')
    lines.append('insert into public.graph_versions(id,city_id,source_artifact_id,sha256,captured_at,node_count,edge_count,manifest,state) values ('+
        ','.join(map(literal,[version,'delhi-central',artifact,digest,stamp,len(graph['nodes']),len(graph['edges']),manifest,'staging']))+');')
    for node in graph['nodes']:
        point=f"gis.st_setsrid(gis.st_makepoint({literal(node['lon'])},{literal(node['lat'])}),4326)"
        lines.append(f"insert into public.road_nodes(graph_id,node_id,geom) values ({literal(version)},{literal(node['id'])},{point});")
    for edge in graph['edges']:
        geom='gis.st_geomfromgeojson('+literal(json.dumps({'type':'LineString','coordinates':edge['geom']},separators=(',',':')))+')'
        way=edge.get('osm_way_id')
        if not isinstance(way,int):raise ValueError('OSM_WAY_ID_MISSING')
        cols=['graph_id','edge_id','physical_key','from_node','to_node','osm_way_id','name','highway','geom','length_m','time_s','hotspot_factor','depression_factor','underpass','terrain_valid','tags']
        vals=[version,edge['id'],edge['physical_key'],edge['from'],edge['to'],way,edge.get('name'),edge.get('highway'),None,edge['length_m'],edge['time_s'],edge['hotspot_factor'],edge['depression_factor'],edge['underpass'],edge['terrain_valid'],edge.get('tags') or {}]
        args=[geom if c=='geom' else literal(v) for c,v in zip(cols,vals)]
        lines.append('insert into public.road_edges('+','.join(cols)+') values ('+','.join(args)+');')
    for turn in graph['turn_restrictions']:
        lines.append('insert into public.turn_restrictions(graph_id,from_edge,to_edge,via_node,reason) values ('+
                     ','.join(map(literal,[version,turn['from_edge'],turn['to_edge'],turn['via_node'],'osm_turn_restriction']))+');')
    lines.extend([f"update public.graph_versions set state='published' where id={literal(version)};",
                  f"update public.cities set active_graph_id={literal(version)} where id='delhi-central';",
                  'commit;'])
    return '\n'.join(lines)+'\n',{'graph_id':version,'source_artifact_id':artifact,'sha256':digest,'source_kind':'reviewed_osm','requires_operator_review':True}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('graph',type=pathlib.Path)
    p.add_argument('--manifest',type=pathlib.Path,required=True)
    p.add_argument('--approve-provenance',action='store_true')
    p.add_argument('--out',type=pathlib.Path,default=pathlib.Path('artifacts/graph-import.sql'))
    a=p.parse_args();graph=json.loads(a.graph.read_text());manifest=json.loads(a.manifest.read_text())
    sql,meta=make_sql(graph,manifest,reviewed=a.approve_provenance)
    a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(sql)
    a.out.with_suffix('.manifest.json').write_text(json.dumps(meta,sort_keys=True,indent=2)+'\n')
    print(json.dumps({'script_path':str(a.out),'sql_sha256':hashlib.sha256(sql.encode()).hexdigest(),'state':'GENERATED_NOT_EXECUTED'}))
if __name__=='__main__':main()
