"""Deterministic local Lambda staging; wheels installed at deploy time (never vendored as source)."""
from pathlib import Path
import shutil,hashlib,json
ROOT=Path(__file__).resolve().parents[1]
for name in ('weather','vision','maintenance'):
    src=ROOT/'services'/name;dst=src/'build'
    dst.mkdir(exist_ok=True)
    for p in sorted(src.glob('*.py')):shutil.copy2(p,dst/p.name)
    shutil.copy2(ROOT/'services/common/backend.py',dst/'backend.py')
    if (src/'requirements.txt').exists():shutil.copy2(src/'requirements.txt',dst/'requirements.txt')
    # pip dependencies are resolved by SAM/packaging at deploy time only.
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(dst.glob('*.py'))}
    (dst/'SOURCE_SHA256.json').write_text(json.dumps(hashes,indent=2)+'\n')
    print(f'{name} packaged: {len(hashes)} Python files')
