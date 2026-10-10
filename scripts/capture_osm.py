"""Deterministic OSM capture requires owner-reviewed source/license and manifest."""
import argparse,json,hashlib,pathlib,sys

def main():
 p=argparse.ArgumentParser();p.add_argument('--input',required=True,help='Externally sourced, documented OSM PBF/XML');p.add_argument('--license-reviewed',action='store_true');a=p.parse_args()
 f=pathlib.Path(a.input)
 if not a.license_reviewed:raise SystemExit('LICENSE_REVIEW_REQUIRED: inspect ODbL provenance and source before graph extraction')
 if not f.exists():raise SystemExit('SOURCE_FILE_NOT_FOUND')
 h=hashlib.sha256(f.read_bytes()).hexdigest()
 print(json.dumps({'sha256':h,'bytes':f.stat().st_size,'state':'captured_not_extracted','license_reviewed':True}))
if __name__=='__main__':main()
