"""Guard signed-by-nobody provenance against silent elevation of verified bytes to verified science.
The GitHub Action run is the evidence of ephemeral MD5 verification; no original is stored here.
"""
import json,re,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REG=ROOT/'research/asia-source-dock-2026-10-19/source-index.json'
REPORT=ROOT/'research/asia-source-dock-2026-10-19/verified-ephemeral-acquisition.json'
class ProvenanceTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.reg=json.loads(REG.read_text('utf8'))
  cls.proof=json.loads(REPORT.read_text('utf8'))
 def test_six_verified_ephemeral_files(self):
  p=self.proof
  self.assertEqual(p['schema'],'naft-ephemeral-upstream-byte-verification-v1')
  self.assertEqual(len(p['files']),6)
  self.assertEqual(p['verified_ephemeral_file_count'],6)
  self.assertTrue(p['github_action_run_url'].startswith('https://github.com/Takzin1/NaFT/actions/runs/'))
 def test_checksums_match_publisher_index(self):
  mapping={(s['id'],f['filename']):f for s in self.reg['sources'] for f in s.get('files',[])}
  for item in self.proof['files']:
   self.assertEqual(item['published_md5'],mapping[item['dataset_id'],item['filename']]['md5_published'])
   self.assertTrue(re.fullmatch(r'[a-f0-9]{64}',item['downloaded_sha256']))
   self.assertTrue(re.fullmatch(r'[a-f0-9]{32}',item['published_md5']))
   self.assertEqual(item['integrity_status'],'PUBLISHER_MD5_MATCHED_IN_EPHEMERAL_RUN')
 def test_never_promote_originals_to_certified_use(self):
  self.assertFalse(self.proof['data_license_independently_reviewed'])
  self.assertFalse(self.proof['original_bytes_available_in_repo'])
  self.assertFalse(self.proof['formal_calculation_or_certification_allowed'])
  for s in self.reg['sources']:
   self.assertIsNone(s['original_sha256'])
   self.assertFalse(s['downloaded_original_bytes'])
   self.assertIsNone(s['redistribution_permitted'])
  for x in self.proof['files']:
   self.assertFalse(x['license_reviewed'])
   self.assertFalse(x['source_specific_adapter_approved'])
 def test_china_unit_modes_not_conflated(self):
  china={x['filename']:x for x in self.proof['files'] if x['dataset_id']=='CN_RICE_EDDY_EAST_2023'}
  self.assertEqual(china['Supporting information data1.csv']['structural_findings']['mass_basis'],'CH4_MOLECULAR')
  self.assertEqual(china['Supporting information data2.csv']['structural_findings']['mass_basis'],'CH4_C')
  self.assertIn('CH4-umol/m2/s',china['Supporting information data1.csv']['structural_findings']['header'])
  self.assertIn('CH4-gC/m2/day',china['Supporting information data2.csv']['structural_findings']['header'])
 def test_gimje_dat_requires_date_mapping(self):
  gimje=[x for x in self.proof['files'] if x['filename']=='ch4.zip'][0]
  self.assertEqual(gimje['structural_findings']['header'],
                   ['DAT','tavg','course_type','ch4_flux','rain_mm'])
  self.assertIn('TRANSPLANT_DATES',gimje['structural_findings']['required_review'])
if __name__=='__main__':unittest.main(verbosity=2)
