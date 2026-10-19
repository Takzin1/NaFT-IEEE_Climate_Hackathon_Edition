#!/usr/bin/env python3
import copy
import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parent.parent
def load(name,path):
    s=importlib.util.spec_from_file_location(name,ROOT/"scripts"/path)
    o=importlib.util.module_from_spec(s)
    s.loader.exec_module(o)
    return o
gate=load("two_source_gate","ieee-independent-two-source-docking-gate.py")
p=load("pinned_py_decimal","ieee-independent-gasfluxes-decimal.py")
h=load("harvard_source","ieee-independent-harvard-raw-trace.py")

class TestTwoSource(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original=p.replay()
        cls.harvard=h.analyze()
        cls.rank=gate.small_json(gate.RANKS)
        cls.gas={
          "schema":"naft-ieee-gasfluxes-independent-three-way-compare-v1",
          "status":"FIVE_EXTERNAL_GOLDEN_SERIES_REPRODUCED_BY_TWO_INDEPENDENT_CALCULATORS",
          "selected_source_sha256":cls.original["selected_source_sha256"],
          "reference_outputs_reproduced":5,
          "python_decimal_executed":True,
          "node_normal_equations_executed":True,
          "upstream_R_code_executed":False,
          "limits":{"Gimje_observation_validation":False,"certified_tco2e":None},
        }
    def test_all_real_bytes_compose_without_gimje_claim(self):
        out=gate.inspect(self.gas,self.harvard,self.rank)
        self.assertEqual(out["source_count"],2)
        self.assertEqual([x["rank"] for x in out["intake_ranks"]],["A-","B+"])
        self.assertEqual(out["intake_ranks"][0]["published_external_R_golden_series_replayed"],5)
        self.assertEqual(out["intake_ranks"][1]["matching_chamber_events"],0)
        self.assertIsNone(out["combined_conclusion"]["certified_tco2e"])
        self.assertFalse(out["combined_conclusion"]["seasonal_CH4_calculated"])

    def test_fake_grade_approval_and_source_mismatch_rejected(self):
        for field,value in [
          ("source_event_match_count",1),
          ("chamber_flux_approved",True),
          ("original_raw_git_blob","0"*40)]:
            altered=copy.deepcopy(self.rank)
            altered["candidates"][1][field]=value
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError,"GRADE_EVIDENCE_NOT_SOURCE_BOUND"):
                    gate.inspect(self.gas,self.harvard,altered)
        altered=copy.deepcopy(self.rank)
        altered["safety_gates"]["independent_human_QC_attestation"]=True
        with self.assertRaisesRegex(ValueError,"UNAUTHORIZED_INTAKE_PROMOTION"):
            gate.inspect(self.gas,self.harvard,altered)

    def test_forged_chamber_support_and_false_oracle_rejected(self):
        for path,value in [
          (("source","key_event_overlaps"),["fabricated-event"]),
          (("source","literal_alarm_status_counts"),{"0":35}),
          (("human_acceptance_gates","chamber_flux_eligible"),True)]:
            altered=copy.deepcopy(self.harvard)
            altered[path[0]][path[1]]=value
            with self.subTest(path=path):
                with self.assertRaisesRegex(ValueError,"INDEPENDENT_HARVARD_QC_RELEASE_BOUNDARY"):
                    gate.inspect(self.gas,altered,self.rank)
        altered=copy.deepcopy(self.gas)
        altered["limits"]["certified_tco2e"]=1
        with self.assertRaisesRegex(ValueError,"INDEPENDENT_ALGORITHM_ORACLE_NOT_READY"):
            gate.inspect(altered,self.harvard,self.rank)

if __name__=="__main__":
    unittest.main()
