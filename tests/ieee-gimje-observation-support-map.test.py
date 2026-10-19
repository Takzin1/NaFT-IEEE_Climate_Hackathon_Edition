#!/usr/bin/env python3
"""Synthetic and pinned-source tests for the CH4 observation-presence mapper."""
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = ROOT / "scripts/ieee-gimje-observation-support-map.py"
spec = importlib.util.spec_from_file_location("gimje_observation_support", PATH)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class TestObservationSupport(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.method = audit.import_method()

    def test_pinned_real_60_fields_and_scientific_blockers(self):
        first = audit.create_report()
        self.assertEqual(first, audit.create_report())
        self.assertEqual(first["status"], "OBSERVATION_PRESENCE_ONLY_NOT_SAMPLING_SUPPORT")
        self.assertEqual(first["field_count"], 60)
        self.assertEqual(first["totals"]["csv_rows"], 8391)
        self.assertEqual(first["totals"]["blank_flux_tokens"], 6969)
        self.assertEqual(first["totals"]["finite_flux_tokens_unreviewed"], 1422)
        self.assertEqual(first["totals"]["invalid_flux_tokens"], 0)
        self.assertEqual(first["totals"]["finite_tokens_without_valid_DAT"], 0)
        self.assertEqual(first["totals"]["repeated_DAT_rows"], 0)
        self.assertTrue(first["review_gates"]["source_fingerprints_verified"])
        self.assertFalse(first["review_gates"]["measurement_timing_and_support_defined"])
        self.assertFalse(first["review_gates"]["seasonal_CH4_integral_permitted"])
        self.assertIsNone(first["review_gates"]["certified_tco2e"])
        self.assertEqual(len(first["source_field_diagnostics"]), 60)
        for field in first["source_field_diagnostics"]:
            self.assertIsNone(field["seasonal_CH4"])
            self.assertIsNone(field["raw_observation_days"])
            self.assertIsNone(field["interpolated_flux_days"])
            self.assertFalse(field["calibrated_measurement_QC"])
            self.assertGreaterEqual(field["csv_rows"], field["finite_flux_tokens_unreviewed"])
            self.assertGreaterEqual(field["distinct_numeric_DAT_count"], 0)
        self.assertNotIn("reduction_percent", json.dumps(first))

    def test_synthetic_sparse_rows_and_explicit_zero(self):
        rows = (b"DAT,tavg,course_type,ch4_flux,rain_mm\n"
                b"0,25,cf,,0\n"
                b"1,25,cf,0,0\n"
                b"2,25,cf,NaN,0\n"
                b"5,25,cf,-0.1,0\n"
                b"8,25,cf,1.4,0\n"
                b"8,25,cf,,0\n")
        r = audit.classify_csv("ch4/synthetic.csv", rows, self.method)
        self.assertEqual(r["csv_rows"], 6)
        self.assertEqual(r["blank_flux_tokens"], 2)
        self.assertEqual(r["invalid_flux_tokens"], 1)
        self.assertEqual(r["finite_flux_tokens_unreviewed"], 3)
        self.assertEqual(r["literal_numeric_zeros_unreviewed"], 1)
        self.assertEqual(r["literal_negative_numbers_unreviewed"], 1)
        self.assertEqual(r["repeated_DAT_rows"], 1)
        self.assertEqual(r["distinct_numeric_DAT_count"], 3)
        self.assertEqual(r["first_numeric_DAT"], 1)
        self.assertEqual(r["last_numeric_DAT"], 8)
        self.assertEqual(r["elapsed_DAT_distance_histogram"], {"3": 1, "4": 1})
        self.assertEqual(r["pairs_with_elapsed_DAT_greater_than_one"], 2)
        self.assertEqual(r["max_elapsed_DAT_distance"], 4)
        self.assertIsNone(r["seasonal_CH4"])

    def test_synthetic_invalid_dat_does_not_create_false_interval(self):
        data = (b"DAT,tavg,course_type,ch4_flux,rain_mm\n"
                b"invalid,25,cf,0.1,0\n"
                b"10,25,cf,0.2,0\n"
                b"12,25,cf,0.3,0\n")
        r = audit.classify_csv("ch4/test.csv", data, self.method)
        self.assertEqual(r["finite_tokens_without_valid_DAT"], 1)
        self.assertEqual(r["elapsed_DAT_distance_histogram"], {"2": 1})
        self.assertEqual(r["first_numeric_DAT"], 10)

    def test_malformed_rows_and_nonfinite_tokens_fail_safe(self):
        with self.assertRaisesRegex(ValueError, "UNEXPECTED_CSV_HEADER"):
            audit.classify_csv("ch4/bad.csv", b"DAT,flux\n1,2\n", self.method)
        with self.assertRaisesRegex(ValueError, "MALFORMED_CSV_ROW"):
            audit.classify_csv(
                "ch4/bad.csv", b"DAT,tavg,course_type,ch4_flux,rain_mm\n1,2\n",
                self.method)
        with self.assertRaisesRegex(ValueError, "UNSAFE_CSV_LENGTH_OR_NUL"):
            audit.classify_csv("ch4/bad.csv", b"\x00", self.method)
        r = audit.classify_csv(
            "ch4/empty.csv", b"DAT,tavg,course_type,ch4_flux,rain_mm\n"
            b"2,23,cf,Infinity,1\n", self.method)
        self.assertEqual(r["invalid_flux_tokens"], 1)
        self.assertIsNone(r["max_elapsed_DAT_distance"])

    def test_changed_original_bytes_do_not_pass_source_gate(self):
        with tempfile.TemporaryDirectory() as d:
            source = pathlib.Path(d)
            original = audit.ROOT / (
                "research/ieee-observation-datasets-2026-10-19/originals/"
                "KR_GIMJE_DAILY_2022_2024")
            for name in ("ch4.zip", "input_fields_meta.xlsx", "acquisition-receipt.json"):
                (source / name).write_bytes((original / name).read_bytes())
            self.assertEqual(audit.create_report(source)["field_count"], 60)
            zipfile = source / "ch4.zip"
            zipfile.write_bytes(zipfile.read_bytes()+b"tamper")
            with self.assertRaisesRegex(ValueError, "ORIGINAL_FILE_"):
                audit.create_report(source)


if __name__ == "__main__":
    unittest.main()
