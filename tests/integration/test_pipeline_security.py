"""Worker failure and fixture safety properties. No cloud connections are made."""
import sys,json,unittest,hashlib,os
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2]
for directory in ['services/common','services/vision','services/weather','services/maintenance']:
 sys.path.insert(0,str(ROOT/directory))
import importlib.util
_spec=importlib.util.spec_from_file_location("monsoonroute_vision_worker",ROOT/"services/vision/handler.py")
vision_handler=importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vision_handler)
from adapters import parse_payload,WeatherValidationError
from backend import request,BackendError
class SecurityProperties(unittest.TestCase):
 def test_worker_rejects_unknown_message_fields(self):
  with self.assertRaises(ValueError):vision_handler.parse_message({'body':json.dumps({'schema_version':'1.0','job_id':'not-uuid','report_id':'not-uuid','skip_auth':True})})
 def test_worker_rejects_uuid(self):
  with self.assertRaises(ValueError):vision_handler.parse_message({'body':json.dumps({'schema_version':'1.0','job_id':'not-uuid','report_id':'not-uuid'})})
 def test_worker_failures_are_retried(self):
  record={'messageId':'r1','body':json.dumps({'schema_version':'1.0','job_id':'ce5af0f5-8ee9-4485-a43b-7e67b8ec92c8','report_id':'17a566e5-22f6-4b0e-8c8c-86bc9a7b1a59'})}
  with patch.dict(os.environ,{'VISION_ENABLED':'false'}):self.assertEqual(vision_handler.lambda_handler({'Records':[record]},None),{'batchItemFailures':[{'itemIdentifier':'r1'}]})
 def test_backend_rejects_attacker_url_before_credentials(self):
  with self.assertRaisesRegex(BackendError,'BACKEND_PATH_INVALID'):request('GET','http://evil.invalid/rest/v1/reports')
 def test_no_production_model_claim(self):
  manifest=json.loads((ROOT/'models/manifest.json').read_text());self.assertFalse(manifest['parity_validated']);self.assertFalse(manifest['runtime_benchmark_validated'])
 def test_fixture_is_immutable_and_synthetic(self):
  fixture=json.loads((ROOT/'artifacts/synthetic-scenario.json').read_text());graph=json.loads((ROOT/'artifacts/synthetic-graph.json').read_text())
  self.assertEqual(fixture['kind'],'synthetic');self.assertEqual(fixture['graph_sha256'],graph['sha256']);self.assertIn('not',fixture['disclaimer'].lower())
  self.assertEqual(hashlib.sha256(json.dumps({k:v for k,v in graph.items() if k!='sha256'},sort_keys=True,separators=(',',':')).encode()).hexdigest(),graph['sha256'])
 def test_weather_rows_include_coordinates(self):
  sample=[{'latitude':28.6,'longitude':77.2,'hourly_units':{'precipitation':'mm'},'hourly':{'time':[1791633600,1791637200],'precipitation':[0,2]}} for _ in range(9)]
  frames,_=parse_payload(json.dumps(sample).encode());self.assertIn('requested_lat',frames[0]);self.assertIn('provider_lon',frames[0]);self.assertEqual(len(frames),18)
if __name__=='__main__':unittest.main()
