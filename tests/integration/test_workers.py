import sys,unittest,json,io,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'services/weather'))
sys.path.insert(0,str(ROOT/'services/vision'))
from adapters import parse_payload,WeatherValidationError
from sanitize import sanitize_image,InvalidImage
from PIL import Image
class WorkerContracts(unittest.TestCase):
 def data(self):
  row={'latitude':28.6,'longitude':77.2,'hourly_units':{'precipitation':'mm'},'hourly':{'time':[1791633600,1791637200,1791640800],'precipitation':[0,4,3]}}
  return json.dumps([row for _ in range(9)]).encode()
 def test_nine_cells(self):self.assertEqual(len(parse_payload(self.data())[0]),27)
 def test_missing_cell(self):
  rows=json.loads(self.data());rows.pop()
  with self.assertRaises(WeatherValidationError):parse_payload(json.dumps(rows).encode())
 def test_bad_units(self):
  rows=json.loads(self.data());rows[0]['hourly_units']['precipitation']='inch'
  with self.assertRaises(WeatherValidationError):parse_payload(json.dumps(rows).encode())
 def test_bad_rain(self):
  rows=json.loads(self.data());rows[0]['hourly']['precipitation'][0]=999
  with self.assertRaises(WeatherValidationError):parse_payload(json.dumps(rows).encode())
 def test_bad_timestep(self):
  rows=json.loads(self.data());rows[0]['hourly']['time'][1]+=3
  with self.assertRaises(WeatherValidationError):parse_payload(json.dumps(rows).encode())
 def test_image_metadata_removed(self):
  im=Image.new('RGB',(30,30),'blue');buf=io.BytesIO();im.save(buf,format='JPEG',exif=b'not-user-identifying-marker')
  clean=sanitize_image(buf.getvalue());self.assertTrue(clean.startswith(b'\xff\xd8'))
  self.assertNotIn(b'not-user-identifying-marker',clean)
 def test_reject_bad_image(self):
  with self.assertRaises(InvalidImage):sanitize_image(b'not-an-image')
 def test_reject_oversized_image(self):
  with self.assertRaises(InvalidImage):sanitize_image(b'x'*3145729)
if __name__=='__main__':unittest.main()
