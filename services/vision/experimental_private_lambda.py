"""Private MonsoonRoute model inference. IAM invoke only; no road-closure automation."""
import os,io,json,hashlib,time,re
from pathlib import Path

BUCKET="monsoonroute-prod-artifacts-043063712559-ap-south-1"
DIGEST="2517f3dfb5d82dc21a0729733fff7756eaca0b4b22026d153189501169a84d76"
PROCESSOR_DIGEST="3fb871613311dfae8c5641d034c0302fd69248c363b282b293709c49771ee696"
PREFIX="models/sha256/"+DIGEST+"/"
OBJECT_SIZE_MAX=3_145_728
def sha(path):
 h=hashlib.sha256()
 with open(path,"rb") as f:
  for chunk in iter(lambda:f.read(2*1024*1024),b""):h.update(chunk)
 return h.hexdigest()
def model_session():
 import boto3,onnxruntime as ort
 cache=Path("/tmp/model.onnx")
 processor=Path("/tmp/processor.json")
 s3=boto3.client("s3",region_name="ap-south-1")
 for filename,target,expected in [("model.onnx",cache,DIGEST),("processor.json",processor,PROCESSOR_DIGEST)]:
  if not target.exists() or sha(target)!=expected:
   tmp=target.with_suffix(".loading")
   with tmp.open("wb") as out:
    s3.download_fileobj(BUCKET,PREFIX+filename,out)
   if sha(tmp)!=expected:
    tmp.unlink(missing_ok=True)
    raise RuntimeError("MODEL_ARTIFACT_CHECKSUM_INVALID")
   os.replace(tmp,target)
 config=json.loads(processor.read_text())
 if config.get("size")!=224 or config.get("resample")!="bilinear" or config.get("channel_order")!="RGB" or config.get("image_mean")!=[0.5]*3 or config.get("image_std")!=[0.5]*3:
  raise RuntimeError("MODEL_PROCESSOR_CONTRACT_INVALID")
 options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
 session=ort.InferenceSession(str(cache),sess_options=options,providers=["CPUExecutionProvider"])
 inputs=session.get_inputs()
 if len(inputs)!=1 or inputs[0].name!="pixel_values" or inputs[0].shape!=[1,3,224,224]:
  raise RuntimeError("MODEL_INPUT_SIGNATURE_INVALID")
 return session
SESSION=None
def predict(data):
 import numpy as np
 from PIL import Image,ImageOps,UnidentifiedImageError
 global SESSION
 if len(data)>OBJECT_SIZE_MAX or not data:raise ValueError("IMAGE_SIZE_REJECTED")
 Image.MAX_IMAGE_PIXELS=4_000_000
 try:
  with Image.open(io.BytesIO(data)) as im:
   if im.format not in ("PNG","JPEG","WEBP") or im.width*im.height>4_000_000 or getattr(im,'n_frames',1)>1:raise ValueError("IMAGE_FORMAT_REJECTED")
   pix=ImageOps.exif_transpose(im).convert("RGB").resize((224,224),Image.Resampling.BILINEAR)
   a=np.asarray(pix,dtype=np.float32).transpose(2,0,1)
 except (UnidentifiedImageError,OSError) as exc:raise ValueError("IMAGE_DECODE_REJECTED") from exc
 a=np.ascontiguousarray((a/255.0-0.5)/0.5,dtype=np.float32)[None,:,:,:]
 if SESSION is None:SESSION=model_session()
 start=time.perf_counter()
 pred=SESSION.run(None,{"pixel_values":a})[0]
 elapsed=round((time.perf_counter()-start)*1000,2)
 if pred.shape!=(1,2) or not np.isfinite(pred).all():raise RuntimeError("INFERENCE_OUTPUT_INVALID")
 scores=pred[0].astype(np.float64)
 prob=np.exp(scores-scores.max());prob/=prob.sum()
 cls=int(prob.argmax())
 labels=("Flooded Scene","Non Flooded")
 flooded=float(prob[0]);advisory='flooded_scene_likely' if flooded>=.8 else 'non_flooded_scene_likely' if flooded<=.2 else 'uncertain'
 return {"schema_version":"1.0","model_id":"prithivMLmods/Flood-Image-Detection","class_label":labels[cls],"uncalibrated_probability":float(prob[cls]),"scores":{"flooded_scene":flooded,"non_flooded":float(prob[1])},"advisory":advisory,"calibrated":False,"location_verified":False,"depth_estimated":False,"prediction_duration_ms":elapsed,"latency_ms":elapsed,"artifact_sha256":DIGEST,"model_sha256":DIGEST,"model_revision":"1fb5408d3b778c92c79b3a7894517ce794ad21f7","evaluation_approved":False,"routing_usable":False,"disclaimer":"Image-only advisory; no validated road depth, passability or automatic closure."}
def lambda_handler(event,context):
 import boto3
 if not isinstance(event,dict):raise ValueError("REQUEST_INVALID")
 mode=event.get("mode")
 if mode=="self_test":
  from PIL import Image
  im=Image.new("RGB",(224,224),(20,110,190));buf=io.BytesIO();im.save(buf,format="PNG");data=buf.getvalue()
  res=predict(data);res["input_kind"]="deterministic_synthetic_smoke";return res
 if mode!="classify_private_s3":raise ValueError("ACTION_NOT_ALLOWED")
 key=event.get("key")
 if not isinstance(key,str) or not re.fullmatch(r"(?:inference-fixtures/[a-zA-Z0-9_-]{1,80}\.(?:jpg|jpeg|png|webp)|user-analysis/[a-f0-9]{32}\.jpg)",key):
  raise ValueError("OBJECT_KEY_REJECTED")
 s3=boto3.client("s3",region_name="ap-south-1")
 response=s3.get_object(Bucket=BUCKET,Key=key)
 if response.get("ContentLength",0)>OBJECT_SIZE_MAX:raise ValueError("OBJECT_TOO_LARGE")
 data=response["Body"].read(OBJECT_SIZE_MAX+1)
 res=predict(data);res["input_kind"]="private_s3_object";res["input_sha256"]=hashlib.sha256(data).hexdigest()
 return res
