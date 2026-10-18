"""Independent Python Decimal test oracle, never a J-Credit/JCM approval claim."""
import json,copy,subprocess,unittest
from decimal import Decimal as D,ROUND_HALF_UP
from pathlib import Path
R=Path(__file__).resolve().parents[1]
F=R/'research/asia-mrv-2026-10-18/ipcc-jcm-independent-cases.json'
PIN={
 'CF':('1500000','1.22','1.00','1.00','1.21','1.48','102','226.44'),
 'MD':('1500000','1.22','0.55','1.00','1.21','0.81','102','123.93'),
 'rainfed':('900000','1.22','0.54','0.89','1.00','0.59','102','54.16'),
 'upland':('450000','1.22','0.00','0.89','1.00','0.00','102','0.00'),
 'deepwater':('150000','1.22','0.06','2.41','1.00','0.18','220','5.94')}
COLS=('area_ha_year','efc','sfw','sfp','sfo','published_adjusted_ef','season_days','published_gg')
UD={('DIRECT_MEASUREMENT',3):D('.05'),('DIRECT_MEASUREMENT',4):D('.10'),
 ('DIRECT_MEASUREMENT',5):D('.10'),('COUNTRY_FACTOR_PLUS_MEASUREMENT',5):D('.15')}
def ipcc(f):
 assert f['schema']=='naft-ipcc-ph-independent-fixtures-1' and f['research_only']
 assert f['ipcc']['policy']=='ROUND_ADJUSTED_EF_2DP_THEN_MULTIPLY'
 rows=f['ipcc']['rows'];assert len(rows)==5 and set(x['id'] for x in rows)==set(PIN)
 total=raw=D(0);byrow={}
 for r in rows:
  assert all(D(r[k])==D(v) for k,v in zip(COLS,PIN[r['id']]))
  ef=D(r['efc'])*D(r['sfw'])*D(r['sfp'])*D(r['sfo'])
  adj=ef.quantize(D('.01'),rounding=ROUND_HALF_UP)
  assert adj==D(r['published_adjusted_ef'])
  v=D(r['area_ha_year'])*adj*D(r['season_days'])/D(1000000)
  assert v.quantize(D('.01'),rounding=ROUND_HALF_UP)==D(r['published_gg'])
  total+=v;raw+=D(r['area_ha_year'])*ef*D(r['season_days'])/D(1000000)
  byrow[r['id']]=(adj,v)
 assert total.quantize(D('.01'),rounding=ROUND_HALF_UP)==D(f['ipcc']['published_total_gg'])
 return total,raw,byrow
def ph(f,case):
 b=f['ph']['base']
 assert b['country']=='PH' and b['methodology_id']=='PH_AM004@1.0' and b['data_status']=='SYNTHETIC'
 assert set(b['reference_tco2e'])==set(b['project_tco2e'])=={'CH4','N2O','PUMP_CO2'}
 assert all(v is True for v in b['boundary'].values())
 delta=sum((D(str(b['reference_tco2e'][g]))-D(str(b['project_tco2e'][g])) for g in ('CH4','N2O','PUMP_CO2')),D(0))
 return delta*(1-UD[(case['approach'],case['measurement_interval_years'])])
class TestIndependentOracle(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.data=json.loads(F.read_text())
  p=subprocess.run(['node','scripts/asia-independent-replay.mjs'],cwd=R,capture_output=True,text=True,timeout=30)
  if p.returncode:raise RuntimeError(p.stderr)
  cls.out=json.loads(p.stdout)
 def test_ipcc_published(self):
  total,raw,_=ipcc(self.data)
  self.assertEqual(total,D('410.472'))
  self.assertEqual(total,D(self.out['ipcc']['rounded_stage_gg_ch4']))
  self.assertEqual(total.quantize(D('.01')),D('410.47'))
  self.assertIsNone(self.out['ipcc']['official_inventory_or_credit'])
 def test_ipcc_unrounded(self):
  total,raw,byrow=ipcc(self.data)
  self.assertEqual(raw,D('409.7277036'))
  self.assertEqual(raw,D(self.out['ipcc']['no_intermediate_rounding_gg_ch4']))
  self.assertEqual(total-raw,D(self.out['ipcc']['rounding_stage_difference_gg_ch4']))
  for row in self.out['ipcc']['row_results']:
   ef,computed=byrow[row['id']]
   self.assertEqual(ef,D(row['adjusted_ef_2dp']))
   self.assertEqual(computed,D(row['annual_gg_from_rounded_ef']))
 def test_ph_four_deductions(self):
  for c,j in zip(self.data['ph']['schedules'],self.out['ph_synthetic']):
   self.assertEqual(ph(self.data,c),D(c['expected_tco2e']))
   self.assertEqual(ph(self.data,c),D(j['after_deduction_tco2e']))
   self.assertEqual(UD[c['approach'],c['measurement_interval_years']],D(j['ud']))
   self.assertIsNone(j['official_output'])
 def test_ph_optional_reference_pump(self):
  self.assertTrue(self.out['optional_reference']['omitted'])
  self.assertEqual(D(self.out['optional_reference']['after_deduction_tco2e']),D('47.5'))
  self.assertIsNone(self.out['optional_reference']['official_output'])
 def test_ph_ar5_mass_conversion(self):
  c=self.data['ph']['mass_conversion']
  independent=D(c['ch4_kg'])*D(28)/D(1000)+D(c['n2o_n_kg'])*D(44)/D(28)*D(265)/D(1000)+D(str(c['pump_tco2']))
  self.assertEqual(independent,D('42.86'))
  self.assertEqual(independent,D(self.out['ph_mass_conversion']['total_tco2e']))
 def test_mutated_ipcc_area(self):
  f=copy.deepcopy(self.data);f['ipcc']['rows'][0]['area_ha_year']='1600000'
  with self.assertRaises(AssertionError):ipcc(f)
 def test_mutated_ipcc_factor(self):
  f=copy.deepcopy(self.data);f['ipcc']['rows'][0]['sfw']='1.10'
  with self.assertRaises(AssertionError):ipcc(f)
 def test_duplicated_ipcc_row(self):
  f=copy.deepcopy(self.data);f['ipcc']['rows'][1]['id']='CF'
  with self.assertRaises(AssertionError):ipcc(f)
 def test_ph_missing_project_pump(self):
  f=copy.deepcopy(self.data);del f['ph']['base']['project_tco2e']['PUMP_CO2']
  with self.assertRaises(AssertionError):ph(f,f['ph']['schedules'][0])
 def test_ph_missing_n2o(self):
  f=copy.deepcopy(self.data);del f['ph']['base']['project_tco2e']['N2O']
  with self.assertRaises(AssertionError):ph(f,f['ph']['schedules'][0])
 def test_ph_wrong_country(self):
  f=copy.deepcopy(self.data);f['ph']['base']['country']='JP'
  with self.assertRaises(AssertionError):ph(f,f['ph']['schedules'][0])
 def test_ipcc_zero_case(self):
  self.assertEqual(ipcc(self.data)[2]['upland'][1],D(0))
if __name__=='__main__':unittest.main(verbosity=2)
