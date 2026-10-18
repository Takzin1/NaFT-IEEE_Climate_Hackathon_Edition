"""Independent Python Decimal oracle for NaFT synthetic time-series flux integration.
Source is synthetic; hash equality does not authenticate any actual scientific paper.
"""
import csv, hashlib, io, json, subprocess, unittest
from datetime import datetime, timezone
from decimal import Decimal as D
from pathlib import Path
P=Path(__file__).resolve().parents[1]
R=P/'research/japan-field-raw-flux-2026-10-19'
CSV=R/'synthetic-flux.csv'; MAN=R/'synthetic-manifest.json'
HEAD=['start_utc','end_utc','flux_mg_m2_day','qc_status']
def parse_date(s):
 assert s.endswith('Z') and len(s)==20
 d=datetime.strptime(s,'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
 assert d.strftime('%Y-%m-%dT%H:%M:%SZ')==s
 return d
def independently_integrate(data,manifest):
 assert hashlib.sha256(data).hexdigest()==manifest['csv_sha256']
 assert manifest['unit']=='mg_CH4_m2_day' and manifest['gap_fill_policy']=='FORBID'
 assert manifest['data_class']=='SYNTHETIC'
 text=data.decode('utf-8',errors='strict')
 assert text.endswith('\n') and '\r' not in text
 rows=list(csv.DictReader(io.StringIO(text),strict=True))
 assert rows and list(rows[0])==HEAD
 prev=parse_date(manifest['observation_start_utc'])
 total=D(0)
 for item in rows:
  assert item['qc_status']=='OBSERVED'
  first=parse_date(item['start_utc']);end=parse_date(item['end_utc'])
  assert first==prev and end>first
  seconds=D(str((end-first).total_seconds()))
  assert seconds<=D(7*86400)
  total+=D(item['flux_mg_m2_day'])*seconds/D(86400)
  prev=end
 assert prev==parse_date(manifest['observation_end_utc'])
 return total,total*D('0.01')
class TestRawFluxIndependent(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.m=json.loads(MAN.read_text())
  cls.data=CSV.read_bytes()
  p=subprocess.run(['node','scripts/replay-japan-raw-flux.mjs','--manifest',str(MAN),'--csv',str(CSV)],
                   cwd=P,text=True,capture_output=True,timeout=15)
  if p.returncode:raise RuntimeError(p.stderr)
  cls.js=json.loads(p.stdout)
 def test_integral_matches_independent_decimal(self):
  total,perha=independently_integrate(self.data,self.m)
  self.assertEqual(total,D('2.25'))
  self.assertEqual(total,D(self.js['integrated_mg_ch4_m2']))
  self.assertEqual(perha,D(self.js['integrated_kg_ch4_ha']))
 def test_signed_negative_flux_retained(self):
  self.assertIn(b'-0.500000',self.data)
  self.assertEqual(self.js['record_count'],3)
 def test_sha_is_not_publisher_attestation(self):
  self.assertTrue(self.js['sha256_matches_supplied_manifest'])
  self.assertFalse(self.js['original_publisher_attested'])
  self.assertIsNone(self.js['approved_jcredit_tco2e'])
  self.assertIsNone(self.js['physical_model_reproduction'])
 def test_missing_qc_rejected(self):
  bad=self.data.replace(b'OBSERVED',b'IMPUTED',1)
  amended={**self.m,'csv_sha256':hashlib.sha256(bad).hexdigest()}
  with self.assertRaises(AssertionError):independently_integrate(bad,amended)
 def test_missing_interval_rejected(self):
  bad=self.data.replace(b'2026-06-02T00:00:00Z,2026-06-02T12:00:00Z',
                        b'2026-06-02T01:00:00Z,2026-06-02T12:00:00Z')
  amended={**self.m,'csv_sha256':hashlib.sha256(bad).hexdigest()}
  with self.assertRaises(AssertionError):independently_integrate(bad,amended)
 def test_mutated_data_rejected_with_original_manifest(self):
  self.assertNotEqual(hashlib.sha256(self.data+b'X').hexdigest(),self.m['csv_sha256'])
 def test_partial_observation_not_assumed_complete(self):
  self.assertEqual(self.js['coverage'],'FULL_EXPLICIT_INTERVALS_NO_GAP_FILL')
  self.assertEqual(self.js['window_start_utc'],'2026-06-01T00:00:00Z')
  self.assertEqual(self.js['window_end_utc'],'2026-06-03T00:00:00Z')
 def test_uncertainty_not_fabricated(self):
  self.assertIsNone(self.js['measurement_uncertainty'])
  self.assertIsNone(self.js['statistical_confidence_interval'])
  self.assertIsNone(self.js['residual_causal_allocation'])
if __name__=='__main__':unittest.main(verbosity=2)
