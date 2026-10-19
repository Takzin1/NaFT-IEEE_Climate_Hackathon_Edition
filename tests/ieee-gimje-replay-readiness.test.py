#!/usr/bin/env python3
"""Source-backed and hostile-input tests for the seasonal replay readiness map."""
import copy
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parent.parent
PATH=ROOT/"scripts/ieee-gimje-replay-readiness.py"
spec=importlib.util.spec_from_file_location("gimje_replay_readiness",PATH)
readiness=importlib.util.module_from_spec(spec)
spec.loader.exec_module(readiness)


class TestReadiness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.support=readiness.verified_source().create_report()
        cls.method=readiness.get_module("gimje_test_method",readiness.METHOD_PATH).load_policy()

    def build(self,support=None):
        return readiness.assemble(
            self.support if support is None else support,self.method)

    def test_full_originals_are_grouped_with_all_blockers_preserved(self):
        a=self.build()
        self.assertEqual(a,readiness.create_report())
        self.assertEqual(a["status"],"BLOCKED_AWAITING_PRIMARY_MEASUREMENT_AND_QC_EVIDENCE")
        self.assertEqual(a["original_file_sha256"],self.support["original_file_sha256"])
        original=a["overall_numeric_token_availability"]
        self.assertEqual(original["fields"],60)
        self.assertEqual(original["source_csv_rows"],8391)
        self.assertEqual(original["blank_flux_tokens"],6969)
        self.assertEqual(original["finite_numeric_literals"],1422)
        self.assertEqual(original["literal_zeros"],32)
        self.assertEqual(original["literal_negative_numbers"],31)
        self.assertEqual(len(a["by_year"]),3)
        self.assertEqual(len(a["by_water_management_literal"]),7)
        for kind in ("by_year","by_water_management_literal","by_year_and_literal_treatment"):
            for key in ("fields","source_csv_rows","finite_numeric_literals","blank_flux_tokens"):
                self.assertEqual(sum(x[key] for x in a[kind]),original[key])
        for summary in a["by_water_management_literal"]:
            self.assertFalse(summary["is_chamber_time_coverage"])
            self.assertFalse(summary["comparable_treatment_effect"])
            self.assertGreaterEqual(summary["numeric_token_availability_per_1000_csv_rows"],0)
            self.assertLessEqual(summary["numeric_token_availability_per_1000_csv_rows"],1000)
        self.assertEqual(len(a["required_evidence"]),9)
        self.assertTrue(all(x["current_state"]=="NOT_VERIFIED" for x in a["required_evidence"]))
        self.assertTrue(all(x["evidence_file_sha256"] is None for x in a["required_evidence"]))
        self.assertTrue(all(x["human_reviewer_attestation"] is None for x in a["required_evidence"]))
        self.assertIs(a["scientific_release_decision"]["time_weighted_seasonal_replay_eligible"],False)
        self.assertIsNone(a["scientific_release_decision"]["certified_tco2e"])
        self.assertNotIn("seasonal_ch4_tonnes",json.dumps(a))

    def test_zero_numeric_literals_are_not_equated_with_blank(self):
        fake={
            "year_literal":"2022","source_water_management_literal":"cf",
            "field_id_literal":"field-a",
            "csv_rows":6, "finite_flux_tokens_unreviewed":3,
            "blank_flux_tokens":2, "invalid_flux_tokens":1,
            "literal_numeric_zeros_unreviewed":1,
            "literal_negative_numbers_unreviewed":1,
            "distinct_numeric_DAT_count":3,
            "finite_tokens_without_valid_DAT":0,
            "repeated_DAT_rows":1,
            "pairs_with_elapsed_DAT_greater_than_one":2,
            "elapsed_DAT_distance_histogram":{"3":1,"4":1},
            "calibrated_measurement_QC":False,
            "seasonal_CH4":None,
            "raw_observation_days":None,
            "interpolated_flux_days":None,
        }
        group=readiness.group_summary("SYNTHETIC", [fake])
        self.assertEqual(group["source_csv_rows"],6)
        self.assertEqual(group["finite_numeric_literals"],3)
        self.assertEqual(group["blank_flux_tokens"],2)
        self.assertEqual(group["invalid_flux_tokens"],1)
        self.assertEqual(group["literal_zeros"],1)
        self.assertEqual(group["numeric_token_availability_per_1000_csv_rows"],500)
        self.assertFalse(group["is_chamber_time_coverage"])
        readiness.validated_group_record(fake,{"cf"})
        forged=copy.deepcopy(fake)
        forged["elapsed_DAT_distance_histogram"]={"8":2}
        readiness.validated_group_record(forged,{"cf"})

    def test_temporal_gap_histogram_inconsistency_fails_closed(self):
        row=copy.deepcopy(self.support["source_field_diagnostics"][0])
        row["elapsed_DAT_distance_histogram"]={"3":100000}
        with self.assertRaisesRegex(ValueError,"DISTANCE_PAIR_COUNT_MISMATCH"):
            readiness.validated_group_record(row,set(self.method["source_token_families"]["water_management"]))

    def test_unauthorized_integral_and_qc_claims_rejected(self):
        for key,value in [
            ("seasonal_CH4",45),("interpolated_flux_days",12),
            ("raw_observation_days",18),("calibrated_measurement_QC",True)
        ]:
            modified=copy.deepcopy(self.support)
            modified["source_field_diagnostics"][0][key]=value
            with self.subTest(key=key):
                with self.assertRaisesRegex(ValueError,"PREMATURE_SEASONAL_OR_COVERAGE_CLAIM|UNAPPROVED_FIELD_QC"):
                    self.build(modified)
        source=copy.deepcopy(self.support)
        source["review_gates"]["seasonal_CH4_integral_permitted"]=True
        with self.assertRaisesRegex(ValueError,"UPSTREAM_GATES_NOT_CLOSED"):
            self.build(source)

    def test_source_totals_field_identity_and_treatment_cannot_drift(self):
        cases=[
            ("DUPLICATE",lambda s:s["source_field_diagnostics"][1].update(
                field_id_literal=s["source_field_diagnostics"][0]["field_id_literal"]),
             "SOURCE_FIELD_ID_DUPLICATE_OR_MISSING"),
            ("TREATMENT",lambda s:s["source_field_diagnostics"][0].update(
                source_water_management_literal="MADE_UP"),
             "TREATMENT_CODE_OUTSIDE_PINNED_DICTIONARY"),
            ("ROW",lambda s:s["source_field_diagnostics"][0].update(csv_rows=123456),
             "ROW_PARTITION_MISMATCH"),
            ("ORIGINAL",lambda s:s["original_file_sha256"].update({"ch4.zip":"0"*64}),
             "ORIGINAL_DATA_IDENTITY_DRIFT"),
        ]
        for name,change,expected in cases:
            edited=copy.deepcopy(self.support)
            change(edited)
            with self.subTest(name=name):
                with self.assertRaisesRegex(ValueError,expected):
                    self.build(edited)

    def test_tampered_originals_rejected_before_readiness_generation(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=pathlib.Path(temp)
            original=readiness.ROOT/"research/ieee-observation-datasets-2026-10-19/originals/KR_GIMJE_DAILY_2022_2024"
            for filename in ("ch4.zip","input_fields_meta.xlsx","acquisition-receipt.json"):
                (folder/filename).write_bytes((original/filename).read_bytes())
            self.assertEqual(readiness.create_report(folder)["status"],
                             "BLOCKED_AWAITING_PRIMARY_MEASUREMENT_AND_QC_EVIDENCE")
            target=folder/"ch4.zip"
            target.write_bytes(target.read_bytes()+b"forged")
            with self.assertRaisesRegex(ValueError,"ORIGINAL_FILE_"):
                readiness.create_report(folder)


if __name__=="__main__":
    unittest.main()
