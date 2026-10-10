"""Verify previously exported ONNX digests and parity receipt without changing model state."""
from __future__ import annotations
import hashlib,json,pathlib,sys
ROOT=pathlib.Path(__file__).parent

def digest(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for part in iter(lambda:f.read(1<<20),b''):h.update(part)
 return h.hexdigest()

def main():
 folder=ROOT/'build';manifest=folder/'manifest.json'
 if not manifest.exists():raise ValueError('NO_EXPORTED_MODEL_RECEIPT')
 data=json.loads(manifest.read_text())
 for file,expected in [('model.onnx',data.get('sha256')),('processor.json',data.get('preprocessor_sha256'))]:
  if not isinstance(expected,str) or len(expected)!=64 or not (folder/file).exists() or digest(folder/file)!=expected:raise ValueError('MODEL_DIGEST_MISMATCH')
 if not data.get('parity_validated'):raise ValueError('PARITY_NOT_VERIFIED')
 print('EXPORT_DIGEST_PARITY_RECEIPT_OK; live model evaluation remains a separate release gate.')
if __name__=='__main__':
 try:main()
 except (ValueError,OSError) as e:print('MODEL_PARITY_BLOCKED: '+str(e),file=sys.stderr);raise SystemExit(2)
