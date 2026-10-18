"""Original-peer-reviewed aggregate reproduction, independent of JS BigInt implementation.
This is NOT a daily flux reconstruction, causal apportionment, or Japan J-Credit certification.
"""
import json
import subprocess
import unittest
from decimal import Decimal as D, ROUND_HALF_UP
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data/japan-original-field-observation-aggregates.json'
PIN_YAGI={1991:(D('14.8'),D('8.63')),1993:(D('9.49'),D('5.18'))}
PIN_NISHIMURA={'CH4':(D('3180'),D('-51'),D('3128'),D('1')),
               'N2O':(D('2.6'),D('57.7'),D('60.2'),D('0.1'))}
def observation_check(f):
 assert f['schema']=='naft-jp-original-published-observation-1'
 assert f['published_reported_aggregates_not_raw_measurements']
 byid={s['id']:s for s in f['studies']}
 assert len(byid)==2
 a=byid['YAGI_1996']
 assert a['doi']=='10.1029/96GB00517' and a['environment']['match_verified'] is False
 assert len(a['contrasts'])==2
 yr={}
 for r in a['contrasts']:
  year=r['year']
  assert year in PIN_YAGI and year not in yr
  b,p=PIN_YAGI[year]
  assert D(r['baseline_g_ch4_m2'])==b and D(r['alternative_g_ch4_m2'])==p
  assert r['baseline_regime']=='CONTINUOUS_FLOOD'
  assert r['alternative_regime']=='INTERMITTENT_DRAINAGE'
  yr[year]=((b-p)*D(10),(b-p)*D(100)/b)
 c=byid['NISHIMURA_2004']
 assert c['doi']=='10.1029/2003GB002207' and c['year']==2002
 assert c['environment']['environment_match_verified'] is False
 assert len(c['cumulative'])==2
 periods={}
 for r in c['cumulative']:
  assert r['gas'] in PIN_NISHIMURA and r['gas'] not in periods
  crop,fallow,annual,resolution=PIN_NISHIMURA[r['gas']]
  assert all(D(r[k])==value for k,value in
             [('crop_period',crop),('fallow_period',fallow),
              ('annual',annual),('printed_resolution_mg_m2',resolution)])
  residual=annual-(crop+fallow)
  assert abs(residual)<=resolution*D('1.5')
  periods[r['gas']]=(crop+fallow,residual,annual*D('0.01'))
 return yr,periods

class TestPublishedAggregateOracle(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.raw=json.loads(DATA.read_text())
  cls.expected=observation_check(cls.raw)
  r=subprocess.run(['node','scripts/japan-field-observation-replay.mjs'],
                   cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=25)
  if r.returncode:raise RuntimeError(r.stderr)
  cls.js=json.loads(r.stdout)
 def test_original_data_not_raw(self):
  self.assertFalse(self.js['actual_field_environment_reproduced'])
  self.assertFalse(self.js['methodology_certified'])
 def test_yagi_1991_absolute(self):
  self.assertEqual(self.expected[0][1991][0],D('61.7'))
  self.assertEqual(D(self.js['yagi']['results'][0]['within_year_contrast_kg_ch4_ha']),D('61.7'))
 def test_yagi_1993_absolute(self):
  self.assertEqual(self.expected[0][1993][0],D('43.1'))
  self.assertEqual(D(self.js['yagi']['results'][1]['within_year_contrast_kg_ch4_ha']),D('43.1'))
 def test_yagi_percentage(self):
  for r in self.js['yagi']['results']:
   self.assertEqual(D(r['relative_contrast_percent']),
      self.expected[0][r['calendar_year']][1].quantize(D('.000001'),rounding=ROUND_HALF_UP))
   self.assertIsNone(r['environment_attribution_percent'])
 def test_nishimura_crop_fallow(self):
  for r in self.js['nishimura']['results']:
   calc,residual,kg_ha=self.expected[1][r['gas']]
   self.assertEqual(D(r['independently_summed_mg_m2']),calc)
   self.assertEqual(D(r['reported_minus_summed_mg_m2']),residual)
   self.assertEqual(D(r['reported_annual_kg_basis_ha']),kg_ha)
 def test_nishimura_n2o_n_not_n2o(self):
  n=next(x for x in self.js['nishimura']['results'] if x['gas']=='N2O')
  self.assertEqual(n['mass_basis'],'mg_N2O_N_m2')
  self.assertEqual(D(n['reported_annual_kg_n2o_ha']),D('60.2')*D('0.01')*D(44)/D(28))
 def test_nishimura_ch4_negative_fallow(self):
  a=next(x for x in self.js['nishimura']['results'] if x['gas']=='CH4')
  self.assertEqual(a['fallow_period_mg_m2'],'-51')
  self.assertEqual(D(a['rounding_bound_mg_m2']),D('1.5'))
 def test_original_1991_changed_rejected(self):
  changed=json.loads(json.dumps(self.raw))
  changed['studies'][0]['contrasts'][0]['baseline_g_ch4_m2']='20'
  with self.assertRaises(AssertionError):observation_check(changed)
 def test_original_2002_n2o_changed_rejected(self):
  changed=json.loads(json.dumps(self.raw))
  changed['studies'][1]['cumulative'][1]['annual']='61.5'
  with self.assertRaises(AssertionError):observation_check(changed)
 def test_cross_year_duplicate_rejected(self):
  changed=json.loads(json.dumps(self.raw))
  changed['studies'][0]['contrasts'][1]['year']=1991
  with self.assertRaises(AssertionError):observation_check(changed)
 def test_no_environment_proof(self):
  self.assertFalse(self.raw['future_source']['original_bytes_downloaded'])
  self.assertEqual(self.raw['future_source']['status'],'SOURCE_METADATA_VERIFIED_FILE_IMPORT_PENDING')
 def test_synthetic_area_rate_decomposition(self):
  a,b,ra,rb=D('2'),D('1'),D('100'),D('90')
  diff=a*ra-b*rb
  a_part=(a-b)*(ra+rb)/D(2)
  r_part=(ra-rb)*(a+b)/D(2)
  result=self.js['synthetic_area_rate_accounting']
  self.assertEqual(D(result['total_difference_kg_ch4']),diff)
  self.assertEqual(D(result['area_contribution_kg_ch4']),a_part)
  self.assertEqual(D(result['rate_contribution_kg_ch4']),r_part)
  self.assertEqual(diff,a_part+r_part)
  self.assertIsNone(result['causal_attribution'])
  self.assertFalse(result['field_environment_recreated'])

if __name__=='__main__':unittest.main(verbosity=2)
