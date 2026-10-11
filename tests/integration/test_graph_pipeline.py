"""Executable graph/compiler contract tests using only purpose-built synthetic XML."""
import sys,tempfile,json,unittest,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
from build_graph import compile_osm,canonical,verify_graph
from import_graph import make_sql
OSM='''<?xml version="1.0"?><osm version="0.6">
<node id="1" lat="28.6300" lon="77.2100"/>
<node id="2" lat="28.6300" lon="77.2105"/>
<node id="3" lat="28.6305" lon="77.2105"/>
<way id="101"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/><tag k="oneway" v="yes"/></way>
<way id="102"><nd ref="2"/><nd ref="3"/><tag k="highway" v="residential"/><tag k="name" v="Example Road"/></way>
<relation id="50"><member type="way" role="from" ref="101"/><member type="node" role="via" ref="2"/><member type="way" role="to" ref="102"/><tag k="type" v="restriction"/><tag k="restriction" v="no_right_turn"/></relation></osm>'''
class GraphContract(unittest.TestCase):
 def compile(self):
  with tempfile.TemporaryDirectory() as d:
   f=Path(d)/'fixture.osm';f.write_text(OSM)
   return compile_osm(f,'2026-10-10T12:00:00Z')
 def test_direction_and_turns(self):
  g,m=self.compile();self.assertTrue(g['turn_restrictions']);self.assertTrue(any(x['from'].startswith('osm:1') and x['to']=='osm:2' for x in g['edges']));self.assertFalse(any(x['from']=='osm:2' and x['to']=='osm:1' for x in g['edges']));verify_graph(g)
 def test_digest_and_provenance(self):
  g,m=self.compile();self.assertEqual(g['sha256'],hashlib.sha256(canonical({k:v for k,v in g.items() if k!='sha256'})).hexdigest());self.assertFalse(m['publish_ready']);self.assertEqual(m['license'],'ODbL 1.0')
 def test_requires_human_approval(self):
  g,m=self.compile()
  with self.assertRaisesRegex(ValueError,'HUMAN_PROVENANCE_APPROVAL_REQUIRED'):make_sql(g,m)
 def test_import_transaction(self):
  g,m=self.compile();sql,meta=make_sql(g,m,reviewed=True)
  self.assertTrue(sql.startswith('begin;'));self.assertTrue(sql.rstrip().endswith('commit;'));self.assertIn("set state='published'",sql);self.assertIn('public.turn_restrictions',sql)
  self.assertEqual(meta['sha256'],g['sha256'])
 def test_bad_graph_sha_rejected(self):
  g,m=self.compile();g['sha256']='0'*64
  with self.assertRaisesRegex(ValueError,'GRAPH_DIGEST_MISMATCH'):make_sql(g,m,reviewed=True)
 def test_invalid_xml_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   f=Path(d)/'source.osm';f.write_text('<!DOCTYPE root [<!ENTITY x "z">]><osm>&x;</osm>')
   with self.assertRaisesRegex(ValueError,'DTD_OR_ENTITY_NOT_ALLOWED'):compile_osm(f,'2026-10-10T12:00:00Z')
if __name__=='__main__':unittest.main()
