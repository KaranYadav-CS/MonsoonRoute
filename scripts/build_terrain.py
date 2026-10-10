"""Optional Copernicus DEM GeoTIFF sample derivation; never infers road-water depth.

Requires a legitimate, owner-reviewed DEM raster. No empty-data substitution.
"""
from __future__ import annotations
import argparse,json,pathlib,math,hashlib

def build(graph:dict,dem:pathlib.Path):
    import rasterio
    from rasterio.warp import transform as project
    edges=[]
    with rasterio.open(dem) as src:
        if not src.crs or src.count<1:raise ValueError('DEM_CRS_UNSUPPORTED')
        for edge in graph['edges']:
            # At most 3 samples per edge; DEM is surface elevation only and does NOT
            # encode underpass/bridge deck height or flood height.
            coords=edge['geom'];start,end=coords[0],coords[-1]
            pts=[(start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t) for t in (0,.5,1)]
            xs,ys=project('EPSG:4326',src.crs,[a for a,b in pts],[b for a,b in pts])
            values=[float(row[0]) for row in src.sample(list(zip(xs,ys)))]
            valid=[math.isfinite(x) and x!=src.nodata and -500<x<9000 for x in values]
            # If coverage or grade is unknown, the terrain factor is explicitly null.
            if all(valid):
                depression=max(0,min(1,(min(values[0],values[2])-values[1])/4.0))
                edge={**edge,'depression_factor':round(depression,4),'terrain_valid':True}
            else:edge={**edge,'depression_factor':None,'terrain_valid':False}
            edges.append(edge)
    return {**graph,'edges':edges}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--graph',type=pathlib.Path,required=True)
    parser.add_argument('--dem',type=pathlib.Path,required=True)
    parser.add_argument('--license-reviewed',action='store_true')
    parser.add_argument('--out',type=pathlib.Path,default=pathlib.Path('artifacts/terrain-graph.json'))
    a=parser.parse_args()
    if not a.license_reviewed:parser.error('Copernicus DEM license and raster provenance review required')
    graph=json.loads(a.graph.read_text());result=build(graph,a.dem)
    base={k:v for k,v in result.items() if k!='sha256'}
    sha=hashlib.sha256(json.dumps(base,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    result['sha256']=sha;a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(result,sort_keys=True,separators=(',',':')))
    print(json.dumps({'new_graph_sha256':sha,'terrain_valid_count':sum(e['terrain_valid'] for e in result['edges']),'publish_ready':False}))
if __name__=='__main__':main()
