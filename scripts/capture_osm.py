"""One bounded, reusable Overpass snapshot; never fetch during route requests."""
import argparse, datetime, hashlib, json, pathlib, urllib.parse, urllib.request

HOST = 'https://overpass-api.de/api/interpreter'
QUERY = '''[out:json][timeout:120][maxsize:31457280];
way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|service)$"](28.590,77.180,28.665,77.255)->.roads;
rel(bw.roads)["type"="restriction"]->.restrictions;
(.roads;.restrictions;);(._;>>;);out body;'''

def capture(output):
    if output.exists():
        raw=output.read_bytes(); manifest=json.loads(output.with_suffix('.manifest.json').read_text())
        if hashlib.sha256(raw).hexdigest()!=manifest['sha256']: raise ValueError('SOURCE_HASH_MISMATCH')
        return manifest
    request=urllib.request.Request(HOST, data=urllib.parse.urlencode({'data':QUERY}).encode(),
        headers={'User-Agent':'MonsoonRoute/1.0 (https://github.com/KaranYadav-CS/MonsoonRoute)','Accept':'application/json'})
    with urllib.request.urlopen(request,timeout=130) as response:
        raw=response.read(31_457_281)
    if len(raw)>31_457_280: raise ValueError('SOURCE_TOO_LARGE')
    data=json.loads(raw)
    if not data.get('elements') or data.get('remark'): raise ValueError('SOURCE_INCOMPLETE')
    stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    manifest={'schema_version':'1.0','source_url':HOST,'query':QUERY,'retrieved_at':stamp,
      'source_timestamp':data['osm3s']['timestamp_osm_base'],'sha256':hashlib.sha256(raw).hexdigest(),
      'license':'ODbL 1.0','license_review':'approved','attribution':'© OpenStreetMap contributors',
      'limitations':['Contributor map, no traffic estimates','Unsupported restrictions conservatively excluded']}
    output.parent.mkdir(parents=True,exist_ok=True); output.write_bytes(raw)
    output.with_suffix('.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    return manifest

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path('data/osm/central-delhi.json'))
    args=parser.parse_args(); result=capture(args.output)
    print(json.dumps({'path':str(args.output),'sha256':result['sha256'],'captured_at':result['source_timestamp']}))
if __name__=='__main__': main()
