#!/usr/bin/env python3
"""Actual licensed third-party fixture and negative trust-boundary regression."""
import copy
from decimal import Decimal
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parent.parent
def load(name,filename):
    spec=importlib.util.spec_from_file_location(name,ROOT/"scripts"/filename)
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m
oracle=load("gasfluxes_decimal","ieee-independent-gasfluxes-decimal.py")
compare=load("gasfluxes_compare","ieee-independent-gasfluxes-compare.py")


class TestIndependentRReference(unittest.TestCase):
    def test_source_fixture_replays_first_five_upstream_R_goldens(self):
        output=oracle.replay()
        self.assertEqual(output["status"],"INDEPENDENT_DECIMAL_REPLAY_MATCHED_PUBLISHED_R_GOLDEN_VALUES")
        self.assertEqual(output["selected_source_sha256"],compare.SHA)
        self.assertEqual(len(output["series"]),5)
        self.assertEqual([x["id"] for x in output["series"]],compare.IDS)
        self.assertEqual(sum(x["samples"] for x in output["series"]),20)
        self.assertEqual([x["linear_f0_benchmark_value"].startswith("-") for x in output["series"]],[False,True,True,True,False])
        self.assertFalse(output["upstream_R_code_executed"])
        self.assertFalse(output["Gimje_field_validation"])
        self.assertIsNone(output["certified_tco2e"])

    def test_tampering_source_rows_does_not_silently_change_reference(self):
        raw=oracle.DATA.read_bytes()
        with self.assertRaisesRegex(ValueError,"PINNED_BENCHMARK_HASH_MISMATCH"):
            oracle.read_rows(raw.replace(b"0.331782303",b"0.431782303"),oracle.load_manifest()["dataset"]["fixture_sha256"])
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/"f.csv"
            path.write_bytes(raw+b";new line")
            with self.assertRaisesRegex(ValueError,"PINNED_BENCHMARK_HASH_MISMATCH"):
                oracle.replay(data=path)

    def test_nonfinite_and_duplicate_time_rejected(self):
        grouped=oracle.read_rows(oracle.DATA.read_bytes(),oracle.load_manifest()["dataset"]["fixture_sha256"])
        dup=copy.deepcopy(grouped)
        item=list(dup["ID1"][1])
        item[2]=dup["ID1"][0][2]
        dup["ID1"][1]=tuple(item)
        with self.assertRaisesRegex(ValueError,"DUPLICATE_OBSERVATION_TIME"):
            oracle.decimal_replay(dup)
        bad=copy.deepcopy(grouped)
        item=list(bad["ID2"][0])
        item[1]=Decimal("0")
        bad["ID2"][0]=tuple(item)
        with self.assertRaisesRegex(ValueError,"INCONSISTENT_CHAMBER_VOLUME_OR_AREA"):
            oracle.decimal_replay(bad)
        with self.assertRaisesRegex(ValueError,"NONFINITE_NUMERIC"):
            oracle.decimal_field("Infinity")

    def test_reference_manifest_source_and_license_are_pinned(self):
        manifest=oracle.load_manifest()
        self.assertEqual(manifest["dataset"]["source_license"],"GPL-2.0-or-later")
        self.assertEqual(manifest["dataset"]["full_source_blob_sha"],"ff5e9982b5c24583342ce6e358aae368b6a710ea")
        self.assertEqual(manifest["reference"]["test_blob_sha"],"410dd826565f137fc5c7abfff16c3d06b935aa51")
        self.assertEqual([x["id"] for x in manifest["reference"]["expected_linear_f0_by_series"]],compare.IDS)

    def test_independent_comparator_rejects_forged_certification_and_numeric_drift(self):
        left=oracle.replay()
        right={
            "schema":"naft-ieee-independent-gasfluxes-node-v1",
            "status":"INDEPENDENT_NODE_REPLAY_MATCHED_PUBLISHED_R_GOLDEN_VALUES",
            "selected_source_sha256":compare.SHA,
            "source_git_commit":left["source_git_commit"],
            "upstream_R_code_executed":False,
            "series":[{
                "id":x["id"],"samples":4,
                "linear_f0_benchmark_value":float(x["linear_f0_benchmark_value"]),
                "linear_C0_benchmark_intercept":float(x["linear_C0_benchmark_intercept"]),
                "scientific_QC_approved":False
            } for x in left["series"]],
            "Gimje_field_validation":False,
            "official_mrv_eligibility":False,
            "measurement_unit_certified":False,
            "certified_tco2e":None,
        }
        self.assertEqual(compare.check(left,right)["reference_outputs_reproduced"],5)
        r=copy.deepcopy(right)
        r["series"][0]["linear_f0_benchmark_value"]+=0.01
        with self.assertRaisesRegex(ValueError,"INDEPENDENT_IMPLEMENTATIONS_DISAGREE"):
            compare.check(left,r)
        r=copy.deepcopy(right)
        r["official_mrv_eligibility"]=True
        with self.assertRaisesRegex(ValueError,"FALSE_CERTIFICATION_ATTEMPT"):
            compare.check(left,r)
        r=copy.deepcopy(right)
        r["series"][2]["scientific_QC_approved"]=True
        with self.assertRaisesRegex(ValueError,"UNAPPROVED_OR_PARTIAL_SERIES"):
            compare.check(left,r)


if __name__=="__main__":
    unittest.main()
