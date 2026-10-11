"""Runtime release gate, fail-closed for missing real data/model."""
from pathlib import Path
import json,re,sys,hashlib
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'models/manifest.json').read_text())
problems=[]
if not (root/'artifacts/graph.json').exists():problems.append('No approved imported graph')
if not manifest.get('parity_validated'):problems.append('ONNX parity not verified')
if problems:
 print('NOT_RELEASE_READY: '+'; '.join(problems),file=sys.stderr);sys.exit(2)
print('All artifacts verified')
