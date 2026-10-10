"""Pinned CPU ONNX advisory inference. Never auto-approves a report or closes a road."""
from __future__ import annotations
import hashlib,json,math,io,os
from pathlib import Path
class VisionUnavailable(RuntimeError):pass

def _verify(path:str,expected:str,kind:str):
    if len(expected)!=64 or any(c not in '0123456789abcdef' for c in expected):raise VisionUnavailable(kind+'_HASH_NOT_PINNED')
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''):h.update(part)
    if h.hexdigest()!=expected:raise VisionUnavailable(kind+'_HASH_MISMATCH')

def predict(jpeg:bytes,model_path:str,processor_path:str,manifest_path:str|None=None)->dict:
    try:
        import numpy as np
        import onnxruntime as ort
        from PIL import Image,ImageOps
    except ImportError as e:raise VisionUnavailable('MODEL_RUNTIME_NOT_INSTALLED') from e
    path=manifest_path or os.getenv('MODEL_MANIFEST_PATH','')
    if not path or not Path(path).is_file():raise VisionUnavailable('MODEL_MANIFEST_MISSING')
    manifest=json.loads(Path(path).read_text())
    if not manifest.get('parity_validated') or not manifest.get('runtime_benchmark_validated') or not manifest.get('evaluation_approved'):
        raise VisionUnavailable('MODEL_RELEASE_NOT_APPROVED')
    _verify(model_path,manifest.get('sha256') or '', 'MODEL')
    _verify(processor_path,manifest.get('preprocessor_sha256') or '', 'PROCESSOR')
    cfg=json.loads(Path(processor_path).read_text())
    if cfg.get('method')!='siglip2-processor-approved' or cfg.get('channel_order')!='RGB' or cfg.get('resize_mode')!='squash':raise VisionUnavailable('PREPROCESSOR_NOT_VERIFIED')
    size=cfg.get('size')
    mean=cfg.get('image_mean');std=cfg.get('image_std')
    if not isinstance(size,int) or not 224<=size<=512 or not isinstance(mean,list) or not isinstance(std,list) or len(mean)!=3 or len(std)!=3 or any(not 0<x<=1 for x in std):raise VisionUnavailable('PROCESSOR_CONFIG_INVALID')
    try:
        with Image.open(io.BytesIO(jpeg)) as im:
            im=ImageOps.exif_transpose(im).convert('RGB').resize((size,size),Image.Resampling.BICUBIC)
            pixels=np.asarray(im,dtype=np.float32).transpose(2,0,1)/255.0
        pixels=(pixels-np.asarray(mean,dtype=np.float32)[:,None,None])/np.asarray(std,dtype=np.float32)[:,None,None]
        pixels=np.ascontiguousarray(pixels[None,:,:,:])
        session=ort.InferenceSession(model_path,providers=['CPUExecutionProvider'],sess_options=ort.SessionOptions())
        ins=session.get_inputs();outs=session.get_outputs()
        if len(ins)!=1 or ins[0].name!='pixel_values' or not outs:raise VisionUnavailable('MODEL_INPUT_CONTRACT_INVALID')
        logits=session.run([outs[0].name],{'pixel_values':pixels})[0]
        if logits.shape[0]!=1 or logits.ndim!=2 or not np.isfinite(logits).all():raise VisionUnavailable('MODEL_OUTPUT_INVALID')
        labels=manifest.get('id2label')
        if not isinstance(labels,dict) or len(labels)!=int(logits.shape[1]):raise VisionUnavailable('MODEL_LABEL_CONTRACT_INVALID')
        vec=logits[0].astype(np.float64);v=np.exp(vec-vec.max());prob=v/v.sum()
        i=int(np.argmax(prob));label=labels.get(str(i))
        if not isinstance(label,str):raise VisionUnavailable('MODEL_LABEL_MISSING')
        return {'model_used':True,'advisory_class':label,'advisory_probability':round(float(prob[i]),5),
                'model_sha256':manifest['sha256'],'disclaimer':'Image-only classification is unverified road evidence and requires human review.'}
    except VisionUnavailable:raise
    except Exception as e:raise VisionUnavailable('INFERENCE_FAILED') from e
