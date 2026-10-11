"""Synthetic fixture only. Never call fixtures observed flood evidence."""
import hashlib,json,pathlib
from datetime import datetime,timezone
r=pathlib.Path(__file__).resolve().parents[1]
fixture={'schema_version':'1.0','kind':'synthetic','title':'Engineering topology exercise','effective_at':'2026-10-10T12:00:00+00:00','weather':{'r1_past':8,'r3_past':12,'r1_future':5,'r3_future':10},'disclaimer':'No Delhi road geometry or rainfall observation is represented; not a live routing graph.'}
b=json.dumps(fixture,sort_keys=True,separators=(',',':')).encode();sha=hashlib.sha256(b).hexdigest();out=r/'public/scenarios'/sha;out.mkdir(parents=True,exist_ok=True);(out/'synthetic-engineering-fixture.json').write_bytes(b)
print(f'generated synthetic scenario sha256={sha}')
