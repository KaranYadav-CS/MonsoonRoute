import importlib.util,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location("export_pinned",ROOT/"models"/"export_pinned.py")
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class Contract(unittest.TestCase):
    def test_source_contract_and_failures(self):
        c={"model_type":"siglip","architectures":["SiglipForImageClassification"],"id2label":{"0":"Flooded Scene","1":"Non Flooded"},"vision_config":{"image_size":224}}
        p={"image_processor_type":"SiglipImageProcessor","size":{"height":224,"width":224},"resample":2,"do_resize":True,"do_rescale":True,"do_normalize":True,"rescale_factor":1/255,"image_mean":[.5]*3,"image_std":[.5]*3}
        module.validate(c,p)
        with self.assertRaisesRegex(ValueError,"PINNED_224"):
            module.validate({**c,"vision_config":{"image_size":512}},p)
        with self.assertRaisesRegex(ValueError,"PINNED_BILINEAR"):
            module.validate(c,{**p,"resample":3})
if __name__=="__main__":unittest.main()
