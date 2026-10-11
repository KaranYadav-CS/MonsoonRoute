"""Pinned offline SigLIP image classifier export; numerical parity only, never accuracy."""
from __future__ import annotations
import hashlib,json,pathlib,time,sys
ID="prithivMLmods/Flood-Image-Detection"
REV="1fb5408d3b778c92c79b3a7894517ce794ad21f7"
FILES=["config.json","preprocessor_config.json","model.safetensors"]
def digest(p):
    h=hashlib.sha256()
    with open(p,"rb") as f:
        for b in iter(lambda:f.read(4*1024*1024),b""):h.update(b)
    return h.hexdigest()
def validate(c,p):
    if c.get("architectures")!=["SiglipForImageClassification"] or c.get("model_type")!="siglip":raise ValueError("INVALID_ARCH")
    if {str(k):str(v) for k,v in c["id2label"].items()}!={"0":"Flooded Scene","1":"Non Flooded"}:raise ValueError("INVALID_CLASS_MAPPING")
    if c["vision_config"]["image_size"]!=224 or p.get("size")!={"height":224,"width":224}:raise ValueError("PINNED_224_REQUIRED")
    if p.get("image_processor_type")!="SiglipImageProcessor" or p.get("resample")!=2:raise ValueError("PINNED_BILINEAR_REQUIRED")
    for k in ["do_resize","do_rescale","do_normalize"]:
        if p.get(k) is not True:raise ValueError("PINNED_PROCESSOR_FLAG_"+k)
    if abs(p.get("rescale_factor",0)-1/255)>1e-12 or p.get("image_mean")!=[.5]*3 or p.get("image_std")!=[.5]*3:raise ValueError("PINNED_NORMALIZATION_REQUIRED")
def picture(i):
    import numpy as np
    from PIL import Image
    w,h=[224,256,341,512,678][i%5],[224,319,448,256,512][i%5]
    y,x=np.mgrid[:h,:w]
    noise=np.random.default_rng(20261011+i).integers(0,30,(h,w,3),dtype=np.uint8)
    z=np.empty((h,w,3),dtype=np.uint8)
    z[:,:,0]=(x*(i+1)+y)%255
    z[:,:,1]=(y*(i+2)+17)%255
    z[:,:,2]=((x+y)*2+i)%255
    return Image.fromarray(((z.astype(np.uint16)+noise)%256).astype(np.uint8),"RGB")
def input_tensor(image):
    import numpy as np
    from PIL import Image,ImageOps
    im=ImageOps.exif_transpose(image).convert("RGB").resize((224,224),Image.Resampling.BILINEAR)
    return np.ascontiguousarray((np.asarray(im,dtype=np.float32).transpose(2,0,1)/255-.5)[None]/.5,dtype=np.float32)
def main():
    import numpy as np, torch, onnx, onnxruntime as ort, transformers
    from huggingface_hub import hf_hub_download
    from transformers import AutoImageProcessor,AutoModelForImageClassification
    started=time.monotonic()
    src=pathlib.Path("models/source");src.mkdir(parents=True,exist_ok=True)
    for name in FILES:hf_hub_download(ID,filename=name,revision=REV,local_dir=str(src),token=False)
    c=json.loads((src/"config.json").read_text());p=json.loads((src/"preprocessor_config.json").read_text())
    validate(c,p);torch.set_num_threads(2)
    proc=AutoImageProcessor.from_pretrained(str(src),local_files_only=True,trust_remote_code=False)
    mod=AutoModelForImageClassification.from_pretrained(str(src),local_files_only=True,trust_remote_code=False,use_safetensors=True,attn_implementation="eager").eval().cpu()
    class Wrap(torch.nn.Module):
        def __init__(self,m):super().__init__();self.m=m
        def forward(self,pixel_values):return self.m(pixel_values=pixel_values).logits
    mod=Wrap(mod).eval()
    out=pathlib.Path("models/build");out.mkdir(parents=True,exist_ok=True)
    modelpath=out/"model.onnx"
    sample=proc(images=picture(0),return_tensors="pt")["pixel_values"]
    if tuple(sample.shape)!=(1,3,224,224):raise ValueError("TENSOR_SHAPE_MISMATCH")
    with torch.no_grad():torch.onnx.export(mod,sample,str(modelpath),input_names=["pixel_values"],output_names=["logits"],opset_version=17,dynamo=False,do_constant_folding=True)
    onnx.checker.check_model(onnx.load(str(modelpath),load_external_data=False))
    session=ort.InferenceSession(str(modelpath),providers=["CPUExecutionProvider"])
    if len(session.get_inputs())!=1 or list(session.get_inputs()[0].shape)!=[1,3,224,224]:raise ValueError("ONNX_INPUT_SHAPE_FAILED")
    tensor_err=0.;logit_err=0.
    for i in range(20):
        img=picture(i)
        hf=proc(images=img,return_tensors="np")["pixel_values"]
        ours=input_tensor(img)
        tensor_err=max(tensor_err,float(np.max(np.abs(hf-ours))))
        with torch.inference_mode():baseline=mod(torch.from_numpy(hf.copy())).numpy()
        observed=session.run(["logits"],{"pixel_values":ours})[0]
        if baseline.shape!=(1,2) or observed.shape!=(1,2) or not np.isfinite(observed).all():raise ValueError("LOGIT_SHAPE_FAILED")
        logit_err=max(logit_err,float(np.max(np.abs(baseline-observed))))
    if tensor_err>1e-5:raise ValueError("PREPROCESSOR_PARITY_FAIL")
    if logit_err>1e-3:raise ValueError("ONNX_LOGIT_PARITY_FAIL")
    recipe={"method":"siglip2-processor-approved","channel_order":"RGB","resize_mode":"squash","resample":"bilinear","size":224,"image_mean":[.5]*3,"image_std":[.5]*3,"rescale_factor":1/255,"source_revision":REV}
    (out/"processor.json").write_text(json.dumps(recipe,sort_keys=True,separators=(",",":")))
    receipt={"model_id":ID,"revision":REV,"source_sha256":{k:digest(src/k) for k in FILES},"sha256":digest(modelpath),"preprocessor_sha256":digest(out/"processor.json"),"fixed_shape":[1,3,224,224],"opset":17,"id2label":c["id2label"],"fixtures_tested":20,"fixture_type":"deterministically_generated_synthetic_parity_only","tensor_max_abs_error":tensor_err,"logits_max_abs_error":logit_err,"parity_validated":True,"runtime_benchmark_validated":False,"evaluation_approved":False,"status":"NUMERICAL_PARITY_ONLY","duration_seconds":round(time.monotonic()-started,2),"versions":{"torch":torch.__version__,"numpy":np.__version__,"onnx":onnx.__version__,"onnxruntime":ort.__version__,"transformers":transformers.__version__}}
    (out/"manifest.json").write_text(json.dumps(receipt,sort_keys=True,indent=2)+"\n")
    print(json.dumps({"model_sha256":receipt["sha256"],"revision":REV,"fixtures":20,"tensor_error":tensor_err,"logit_error":logit_err,"release_approved":False}))
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("MODEL_EXPORT_FAILED:"+str(e)[:240],file=sys.stderr);raise
