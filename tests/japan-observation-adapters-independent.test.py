"""Independent Decimal oracle: synthetic CH4 interval means, never actual field observations.
The oracle implements its own UTC coverage and unit conversions (does not import JS).
"""
from pathlib import Path
from datetime import datetime,timezone
from decimal import Decimal as D, ROUND_HALF_UP
import csv,hashlib,io,json,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
ROOT_FIX=ROOT/'research/japan-observation-adapters-2026-10-19'
SUPPORTED={
 'INTERVAL_MG_CH4_M2_DAY_V1':('mg_CH4_m2_day','INTERVAL_MEAN_FLUX_RATE',604800,None),
 'DAILY_G_CH4_M2_DAY_V1':('g_CH4_m2_day','DAILY_INTERVAL_MEAN_FLUX_RATE',86400,86400),
 'EDDY_NMOL_CH4_M2_S_V1':('nmol_CH4_m2_s','EDDY_INTERVAL_MEAN_FLUX_RATE',3600,None),
 'EDDY_UMOL_CH4_M2_S_V1':('umol_CH4_m2_s','EDDY_INTERVAL_MEAN_FLUX_RATE',3600,None),
 'DAILY_G_CH4_C_M2_DAY_V1':('g_CH4_C_m2_day','DAILY_INTERVAL_MEAN_FLUX_RATE',86400,86400)}
PRECISION=D('0.000000001')
def date(s):
 assert len(s)==20 and s.endswith('Z')
 v=datetime.strptime(s,'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
 assert v.strftime('%Y-%m-%dT%H:%M:%SZ')==s
 return v
def independent(csv_bytes,meta):
 assert hashlib.sha256(csv_bytes).hexdigest()==meta['csv_sha256']
 assert meta['schema']=='naft-observation-series-v2'
 assert meta['data_class']=='SYNTHETIC'
 assert meta['gap_fill_policy']=='FORBID'
 assert meta['gas']=='CH4' and meta['mass_basis']==('CH4_C' if meta['adapter_id']=='DAILY_G_CH4_C_M2_DAY_V1' else 'CH4_MOLECULAR')
 assert not meta['original_publisher_bytes_verified']
 assert not meta['conditions_independently_matched']
 adapter=meta['adapter_id'];unit,sem,maxsec,exact=SUPPORTED[adapter]
 assert meta['unit']==unit and meta['sampling_semantics']==sem
 content=csv_bytes.decode('utf-8',errors='strict')
 assert content.endswith('\n') and '\r' not in content
 rows=list(csv.DictReader(io.StringIO(content),strict=True))
 assert rows and list(rows[0])==['start_utc','end_utc','value','qc_status']
 lo=date(meta['observation_start_utc']);end=date(meta['observation_end_utc'])
 current=lo;measured=excluded=unrepresented=0;amount=D(0);filled=0
 for row in rows:
  frm=date(row['start_utc']);to=date(row['end_utc'])
  gap=int((frm-current).total_seconds())
  assert gap>=0
  unrepresented+=gap
  sec=int((to-frm).total_seconds())
  assert sec>0 and sec<=maxsec and to<=end
  if exact is not None:assert sec==exact
  qc=row['qc_status']
  if qc in ('OBSERVED_GOOD','OBSERVED_ACCEPTABLE'):
   val=D(row['value'])
   if adapter=='EDDY_UMOL_CH4_M2_S_V1':
    amount+=val*D(sec)*D('16.04')/D('1000')
   elif adapter=='DAILY_G_CH4_C_M2_DAY_V1':
    amount+=val*D(sec)*D(1000)*D(16)/D(12)/D(86400)
   elif adapter=='EDDY_NMOL_CH4_M2_S_V1':
    amount+=val*D(sec)*D('16.04')/D('1000000')
   elif adapter=='DAILY_G_CH4_M2_DAY_V1':
    amount+=val*D(sec)*D(1000)/D(86400)
   else:amount+=val*D(sec)/D(86400)
   measured+=sec
  else:
   assert qc in ('MISSING','IMPUTED_RESEARCH') and row['value']==''
   excluded+=sec
   if qc=='IMPUTED_RESEARCH':filled+=1
  current=to
 unrepresented+=int((end-current).total_seconds())
 seconds=int((end-lo).total_seconds())
 assert measured+excluded+unrepresented==seconds
 status=('NO_OBSERVATION' if measured==0 else
         'COMPLETE_OBSERVED' if measured==seconds else 'PARTIAL_OBSERVED')
 def q(x):return x.quantize(PRECISION,rounding=ROUND_HALF_UP)
 return {
 'coverage_status':status,
 'observed_integral':None if not measured else q(amount),
 'observed_integral_per_ha':None if not measured else q(amount*D('0.01')),
 'coverage_pct':(D(100)*D(measured)/D(seconds)).quantize(D('0.000001'),rounding=ROUND_HALF_UP),
 'observed_seconds':measured,'excluded_qc_seconds':excluded,'unrepresented_gap_seconds':unrepresented,
 'imputed_rows_excluded':filled}
class TestAdaptersIndependent(unittest.TestCase):
 def call_js(self,key):
  p=subprocess.run(['node','scripts/replay-japan-observation-adapters.mjs',key],
     cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=20)
  if p.returncode:raise RuntimeError(p.stderr)
  return json.loads(p.stdout)
 def data(self,key):
  return ((ROOT_FIX/(key+'.csv')).read_bytes(),
     json.loads((ROOT_FIX/(key+'.manifest.json')).read_text()))
 def test_daily_partial(self):
  file,manifest=self.data('daily');calc=independent(file,manifest);js=self.call_js('daily')
  self.assertEqual(calc['coverage_status'],'PARTIAL_OBSERVED')
  self.assertEqual(calc['observed_integral'],D('1.250000000'))
  self.assertEqual(calc['observed_integral'],D(js['observed_only_integral_mg_ch4_m2']))
  self.assertEqual(calc['observed_integral_per_ha'],D(js['observed_only_integral_kg_ch4_ha']))
  self.assertEqual(calc['coverage_pct'],D(js['measured_coverage_percent']))
  self.assertIsNone(js['full_window_total_mg_ch4_m2'])
  self.assertIsNone(js['certified_tco2e'])
 def test_eddy_molar(self):
  file,manifest=self.data('eddy');calc=independent(file,manifest);js=self.call_js('eddy')
  self.assertEqual(calc['observed_integral'],D('0.144360000'))
  self.assertEqual(calc['observed_integral'],D(js['observed_only_integral_mg_ch4_m2']))
  self.assertEqual(calc['observed_integral_per_ha'],D(js['observed_only_integral_kg_ch4_ha']))
  self.assertEqual(js['coverage_status'],'COMPLETE_OBSERVED')
 def test_interval_v1_parity(self):
  file,manifest=self.data('interval');calc=independent(file,manifest);js=self.call_js('interval')
  self.assertEqual(calc['observed_integral'],D('2.250000000'))
  self.assertEqual(calc['observed_integral'],D(js['observed_only_integral_mg_ch4_m2']))
  self.assertEqual(js['full_window_total_mg_ch4_m2'],js['observed_only_integral_mg_ch4_m2'])
 def test_umol_conversion(self):
  file,manifest=self.data('umol');calc=independent(file,manifest);js=self.call_js('umol')
  self.assertEqual(calc['observed_integral'],D('14.436000000'))
  self.assertEqual(calc['observed_integral'],D(js['observed_only_integral_mg_ch4_m2']))
  self.assertEqual(calc['observed_integral_per_ha'],D(js['observed_only_integral_kg_ch4_ha']))
  self.assertEqual(js['input_mass_basis'],'CH4_MOLECULAR')
 def test_daily_ch4_c_conversion(self):
  file,manifest=self.data('carbon');calc=independent(file,manifest);js=self.call_js('carbon')
  self.assertEqual(calc['observed_integral'],D('16.000000000'))
  self.assertEqual(calc['observed_integral'],D(js['observed_only_integral_mg_ch4_m2']))
  self.assertEqual(calc['observed_integral_per_ha'],D(js['observed_only_integral_kg_ch4_ha']))
  self.assertEqual(js['input_mass_basis'],'CH4_C')
 def test_no_publisher_authenticity(self):
  for key in ('daily','eddy','interval'):
   js=self.call_js(key)
   self.assertEqual(js['status'],'RESEARCH_UNATTESTED')
   self.assertFalse(js['publisher_bytes_independently_attested'])
   self.assertFalse(js['environment_conditions_independently_verified'])
   self.assertFalse(js['gap_fill_applied'])
   self.assertIsNone(js['uncertainty_interval'])
 def test_corrupt_sha(self):
  file,manifest=self.data('daily')
  self.assertNotEqual(hashlib.sha256(file+b'alteration').hexdigest(),manifest['csv_sha256'])
 def test_missing_explicit_no_fill(self):
  file,manifest=self.data('daily')
  rows=list(csv.DictReader(io.StringIO(file.decode('utf8'))))
  self.assertEqual(rows[1]['qc_status'],'MISSING')
  self.assertEqual(rows[1]['value'],'')
  self.assertEqual(independent(file,manifest)['excluded_qc_seconds'],86400)
 def test_invalid_eddy_unit_rejected(self):
  file,manifest=self.data('eddy');manifest['unit']='kg_CH4_m2_day'
  with self.assertRaises(AssertionError):independent(file,manifest)
 def test_mismatch_time_rejected(self):
  file,manifest=self.data('daily')
  mutate=file.replace(b'2026-06-03T00:00:00Z,2026-06-04T00:00:00Z',
       b'2026-06-03T01:00:00Z,2026-06-04T00:00:00Z')
  manifest['csv_sha256']=hashlib.sha256(mutate).hexdigest()
  with self.assertRaises(AssertionError):independent(mutate,manifest)
 def test_negative_flux_kept(self):
  file,manifest=self.data('eddy')
  self.assertIn(b'-5.000000',file)
  self.assertGreater(independent(file,manifest)['observed_integral'],D(0))
if __name__=='__main__':unittest.main(verbosity=2)
