"""Pinned offline model-to-ONNX exporter with source and preprocessing parity gates.

Requires owner-supplied, license-reviewed safetensors snapshot. Does not auto-download
public model HEAD, use remote custom code, promote unverified scores, or claim accuracy.
"""
from __future__ import annotations
import argparse,hashlib,json,pathlib,re,sys,time,os

def sha256(path:pathlib.Path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def export_model(model_dir:pathlib.Path,revision:str,out_dir:pathlib.Path):
    if not re.fullmatch(r'[0-9a-f]{40}',revision):raise ValueError('IMMUTABLE_SOURCE_REVISION_REQUIRED')
    if not (model_dir/'model.safetensors').exists() and not list(model_dir.glob('model-*-of-*.safetensors')):
        raise ValueError('REVIEWED_SAFETENSORS_MISSING')
    if not (model_dir/'config.json').is_file() or not (model_dir/'preprocessor_config.json').is_file():raise ValueError('SOURCE_METADATA_MISSING')
    import numpy as np
    import torch
    import onnxruntime as ort
    from transformers import AutoModelForImageClassification,AutoImageProcessor
    from PIL import Image
    processor=AutoImageProcessor.from_pretrained(str(model_dir),trust_remote_code=False,local_files_only=True)
    if not getattr(processor,'do_resize',False) or getattr(processor,'do_center_crop',False):raise ValueError('UNSUPPORTED_CENTER_CROP_PREPROCESSOR')
    size=processor.size
    if not isinstance(size,dict) or size.get('height')!=size.get('width') or not isinstance(size.get('height'),int):
        raise ValueError('SQUARE_PROCESSOR_REQUIRED')
    side=size['height']
    if side<224 or side>512 or getattr(processor,'do_rescale',False) is not True or getattr(processor,'do_normalize',False) is not True or float(getattr(processor,'rescale_factor',0))!=1/255:
        raise ValueError('UNSUPPORTED_PREPROCESSOR_CONTRACT')
    mean=list(processor.image_mean);std=list(processor.image_std)
    if len(mean)!=3 or len(std)!=3 or any(float(x)<=0 for x in std):raise ValueError('NORMALIZATION_INVALID')
    # Explicitly fail if the processor uses patchification or any other non-NCHW surface.
    image=Image.new('RGB',(side,side),(53,112,178))
    pixels=processor(images=image,return_tensors='pt')['pixel_values']
    if len(pixels.shape)!=4 or tuple(pixels.shape)!=(1,3,side,side):raise ValueError('UNSUPPORTED_PIXEL_TENSOR_SHAPE')
    if int(getattr(processor,'resample',-1))!=3:raise ValueError('RESAMPLE_MODE_UNSUPPORTED')
    model=AutoModelForImageClassification.from_pretrained(str(model_dir),use_safetensors=True,trust_remote_code=False,local_files_only=True)
    model.eval().to('cpu')
    class Wrapper(torch.nn.Module):
        def __init__(self,inner):super().__init__();self.inner=inner
        def forward(self,pixel_values):return self.inner(pixel_values=pixel_values).logits
    wrapped=Wrapper(model)
    out_dir.mkdir(parents=True,exist_ok=True);onnx=out_dir/'model.onnx';preprocessor=out_dir/'processor.json'
    cfg={'method':'siglip2-processor-approved','channel_order':'RGB','resize_mode':'squash',
         'size':side,'image_mean':mean,'image_std':std,'rescale_factor':1/255,
         'source_revision':revision}
    preprocessor.write_text(json.dumps(cfg,sort_keys=True,separators=(',',':')))
    with torch.inference_mode():
        baseline=wrapped(pixels).numpy()
        torch.onnx.export(wrapped,pixels,str(onnx),input_names=['pixel_values'],output_names=['logits'],
              opset_version=18,do_constant_folding=True,dynamic_axes={'pixel_values':{0:'batch'},'logits':{0:'batch'}})
    session=ort.InferenceSession(str(onnx),providers=['CPUExecutionProvider']);actual=session.run(['logits'],{'pixel_values':pixels.numpy()})[0]
    if baseline.shape!=actual.shape or not np.isfinite(actual).all() or not np.allclose(actual,baseline,rtol=.003,atol=.003):raise ValueError('ONNX_PARITY_FAILED')
    ids={str(k):str(v) for k,v in model.config.id2label.items()}
    manifest={'model_id':'prithivMLmods/Flood-Image-Detection','revision':revision,'format':'onnx',
      'status':'EXPORTED_UNAPPROVED','sha256':sha256(onnx),'preprocessor_sha256':sha256(preprocessor),
      'id2label':ids,'parity_validated':True,'parity_max_abs_error':float(np.max(np.abs(baseline-actual))),
      'runtime_benchmark_validated':False,'evaluation_approved':False,'risk_influence':'NONE',
      'source_sha256':sha256(model_dir/'config.json'),'license_review':'REQUIRES_INDEPENDENT_SIGNOFF',
      'note':'Preprocessing parity and held-out evaluation require separate operational acceptance.'}
    (out_dir/'manifest.json').write_text(json.dumps(manifest,sort_keys=True,indent=2)+'\n')
    return manifest

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--model-dir',type=pathlib.Path,required=True)
    p.add_argument('--revision',required=True)
    p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('models/build'))
    a=p.parse_args()
    try:
        m=export_model(a.model_dir,a.revision,a.output)
        print(json.dumps({'onnx_sha256':m['sha256'],'parity_validated':m['parity_validated'],'status':m['status'],'evaluation_approved':False}))
    except (ValueError,ImportError,OSError) as e:
        print('EXPORT_BLOCKED: '+str(e),file=sys.stderr);raise SystemExit(2)
if __name__=='__main__':main()
