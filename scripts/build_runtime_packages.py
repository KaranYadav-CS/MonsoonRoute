"""Reproducible source-only deployment archives. No secret or model weight is included."""
import hashlib,json,pathlib,zipfile,io
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'.state/packages';OUT.mkdir(parents=True,exist_ok=True)
def package(name,files):
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for destination,source in files.items():
            data=source.read_bytes();entry=zipfile.ZipInfo(destination,date_time=(2026,10,11,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;z.writestr(entry,data)
    blob=buffer.getvalue();(OUT/(name+'.zip')).write_bytes(blob);return {'name':name,'sha256':hashlib.sha256(blob).hexdigest(),'bytes':len(blob)}
def main():
    receipts=[]
    for name in ('weather','maintenance'):
        files={p.name:p for p in (ROOT/'services'/name).glob('*.py')};files['backend.py']=ROOT/'services/common/backend.py';receipts.append(package(name,files))
    # Dependency-free source input; the existing bounded Linux builder adds CPU wheels.
    files={'handler.py':ROOT/'services/vision/queue_worker.py','model_runtime.py':ROOT/'services/vision/experimental_private_lambda.py','backend.py':ROOT/'services/common/backend.py','sanitize.py':ROOT/'services/vision/sanitize.py'}
    receipts.append(package('vision-source',files));print(json.dumps(receipts))
if __name__=='__main__':main()
