#!/usr/bin/env python3
"""Upstream method reference tests: actual source plus synthetic hostile inputs."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODULE_PATH = ROOT / "scripts/ieee-gimje-reference-method-gates.py"
spec = importlib.util.spec_from_file_location("gimje_method_gates", MODULE_PATH)
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


class TestReferenceMethod(unittest.TestCase):
    def test_actual_60_fields_source_pinned_and_missingness_is_not_zero(self):
        result = tool.create_report()
        self.assertEqual(result, tool.create_report())
        self.assertEqual(result["field_count"], 60)
        self.assertEqual(result["status"], "SOURCE_PINNED_RESEARCH_DIAGNOSTICS_NOT_EMISSIONS")
        self.assertEqual(result["summary"]["rows"], 8391)
        self.assertEqual(result["summary"]["ch4_blank_count"], 6969)
        self.assertEqual(result["summary"]["ch4_numeric_token_count_unreviewed"] +
                         result["summary"]["ch4_invalid_token_count"], 8391 - 6969)
        self.assertEqual(result["original_file_sha256"]["ch4.zip"],
                         "719b148d1a4f08e31bc146f412c920ae1472ca1a3a4d6dd81d882c1ef79fe813")
        self.assertEqual(result["gates"]["candidate_field_identity"], "STRING_ONLY_NOT_FIELD_CONFIRMED")
        self.assertIsNone(result["gates"]["certified_tco2e"])
        self.assertIs(result["gates"]["seasonal_emissions_computable"], False)
        self.assertIs(result["gates"]["date_reconstruction_scientifically_approved"], False)
        self.assertEqual(result["water_management_literal_counts_unreviewed"], {
            "cf": 21, "md_14days": 9, "md_14days+awd": 9,
            "md_21days": 9, "md_21days+awd": 6,
            "md_28days": 3, "md_28days+awd": 3,
        })
        self.assertEqual(result["planting_date_candidate_counts"], {
            "2022-05-19":18, "2023-05-25":15, "2024-05-20":27
        })
        for field in result["fields"]:
            self.assertEqual(field["scientifically_approved"], False)
            self.assertEqual(field["water_management_interpretation_approved"], False)
            self.assertEqual(field["seasonal_ch4_g_m2"], None)
            self.assertIn(field["planting_date_status"], (
                "CANDIDATE_1900_SYSTEM_NOT_CALENDAR_APPROVED", "YEAR_OR_SERIAL_NOT_INTEGER",
                "DATE_SERIAL_OUT_OF_REVIEW_RANGE", "DATE_SERIAL_YEAR_MISMATCH"))
        self.assertNotIn("estimated_reduction", json.dumps(result))

    def test_excel_serial_candidates_are_not_authoritative(self):
        expected=[
            ("44700","2022","2022-05-19"),
            ("45071","2023","2023-05-25"),
            ("45432","2024","2024-05-20")
        ]
        for serial,year,iso in expected:
            dt,state=tool.source_date_serial(serial,year)
            self.assertEqual(dt.isoformat(),iso)
            self.assertIn("CANDIDATE",state)
        for serial,year in [("0","2022"),("44700","2024"),("-3","2022"),
                            ("44700.0","2022"),("","2023"),("44700","2030")]:
            dt,state=tool.source_date_serial(serial,year)
            self.assertIsNone(dt)
            self.assertNotIn("CANDIDATE",state)

    def test_author_stage_boundaries_explicit_in_port(self):
        pairs=[(0,"rooting"),(10,"rooting"),(11,"tillering"),
               (45,"tillering"),(46,"reproductive"),(90,"reproductive"),
               (91,"ripening"),(140,"ripening")]
        for dat,label in pairs:
            self.assertEqual(tool.stage_for_dat(dat),label)

    def test_synthetic_csv_qc_blank_invalid_and_duplicate_are_distinct(self):
        raw=(b"DAT,tavg,course_type,ch4_flux,rain_mm\n"
             b"0,25,cf,,1\n"     # blank is NOT zero
             b"1,25,cf,0,1\n"    # literal numeric zero IS a record
             b"1,25,md_14days,NaN,1\n"
             b"invalid,25,cf,Infinity,1\n"
             b"120,25,cf,1.2e-3,1\n")
        result=tool.stage_diagnostics("ch4/synthetic.csv",raw,date(2022,5,19),date(2022,10,5))
        self.assertEqual(result["rows"],5)
        self.assertEqual(result["ch4_blank_count"],1)
        self.assertEqual(result["ch4_invalid_token_count"],2)
        self.assertEqual(result["ch4_numeric_token_count_unreviewed"],2)
        self.assertEqual(result["dat_invalid_or_blank_count"],1)
        self.assertEqual(result["dat_duplicate_count"],1)
        self.assertEqual(result["upstream_reference_stage_counts_not_validation"]["rooting"],3)
        self.assertIsNone(result["seasonal_ch4_g_m2"])
        with self.assertRaisesRegex(ValueError,"CSV_HEADER_DRIFT"):
            tool.stage_diagnostics("ch4/x.csv", b"date,flux\n2022,1\n",None,None)
        with self.assertRaisesRegex(ValueError,"CSV_ROW_INVALID"):
            tool.stage_diagnostics("ch4/x.csv",b"DAT,tavg,course_type,ch4_flux,rain_mm\n1,2\n",None,None)

    def test_no_untrusted_remote_source_and_tampering_is_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            folder=pathlib.Path(directory)
            base=tool.BASE/"originals/KR_GIMJE_DAILY_2022_2024"
            for name in ("ch4.zip","input_fields_meta.xlsx","acquisition-receipt.json"):
                (folder/name).write_bytes((base/name).read_bytes())
            report=tool.create_report(folder)
            self.assertEqual(report["field_count"],60)
            name=folder/"ch4.zip"
            name.write_bytes(name.read_bytes()+b"forged")
            with self.assertRaisesRegex(ValueError,"ORIGINAL_FILE_"):
                tool.create_report(folder)

    def test_policy_pins_upstream_license_and_no_certification(self):
        c=tool.load_policy()
        self.assertEqual(c["upstream_software"]["license"],"MIT")
        self.assertEqual(c["upstream_software"]["ported_code"],False)
        self.assertTrue(all(r["scientifically_approved"] is False for r in c["rules"]))
        self.assertTrue(c["source_token_families"]["ch4_flux_units_accepted_for_MRV"] is False)
        self.assertEqual(tool.parse_numeric_literal("")[0],"MISSING")
        self.assertEqual(tool.parse_numeric_literal("NaN")[0],"INVALID_OR_UNDEFINED")
        self.assertEqual(tool.parse_numeric_literal("0")[0],"NUMERIC_TOKEN_NOT_QC_APPROVED")


if __name__ == "__main__":
    unittest.main()
