#!/usr/bin/env python3
"""Gimje structure audit tests: original positive and synthetic hostile formats."""
import importlib.util
import io
import json
import pathlib
import stat
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CODE = ROOT / "scripts/ieee-gimje-structure-preflight.py"
spec = importlib.util.spec_from_file_location("gimje_structure", CODE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def archive(members):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as zipout:
        for name, content in members.items():
            zipout.writestr(name, content)
    return stream.getvalue()


def valid_csv():
    return (b"DAT,tavg,course_type,ch4_flux,rain_mm\n"
            b"1,25,A,0.1,2\n"
            b"2,24,A,,0\n")


def valid_zip():
    return archive({"ch4/site" + str(i) + ".csv": valid_csv() for i in range(60)})


def valid_workbook(external=False):
    ns = mod.MAIN_NS
    rel = mod.REL_NS
    pack = mod.PACK_NS
    root = ('<workbook xmlns="' + ns + '" xmlns:r="' + rel + '">'
            '<sheets><sheet name="Fields" sheetId="1" r:id="rId1"/></sheets></workbook>')
    relationships = ('<Relationships xmlns="' + pack + '">'
                     '<Relationship Id="rId1" Type="worksheet" '
                     'Target="worksheets/sheet1.xml"/>'
                     + ('<Relationship Id="bad" TargetMode="External" '
                        'Target="https://example.org/payload"/>' if external else "")
                     + '</Relationships>')
    worksheet = ('<worksheet xmlns="' + ns + '"><sheetData>'
                 '<row r="1"><c r="A1" t="inlineStr"><is><t>field_id</t></is></c>'
                 '<c r="B1" t="inlineStr"><is><t>transplant_date</t></is></c></row>'
                 '<row r="2"><c r="A2" t="inlineStr"><is><t>FIELD_TEST</t></is></c></row>'
                 '</sheetData></worksheet>')
    return archive({"xl/workbook.xml": root,
                    "xl/_rels/workbook.xml.rels": relationships,
                    "xl/worksheets/sheet1.xml": worksheet})


class StructuralPreflightTests(unittest.TestCase):
    def test_committed_originals_and_reproducibility(self):
        report = mod.create_report()
        again = mod.create_report()
        self.assertEqual(report, again)
        self.assertEqual(report["chamber_csv_archive"]["csv_members"], 60)
        self.assertEqual(report["source_file_sha256"]["ch4.zip"],
                         "719b148d1a4f08e31bc146f412c920ae1472ca1a3a4d6dd81d882c1ef79fe813")
        self.assertEqual(report["source_file_sha256"]["input_fields_meta.xlsx"],
                         "6c609759ab25bc84cb909830800be4bac086e42a51ac43a11c4367a9c52b1298")
        self.assertEqual(report["status"], "SOURCE_BYTES_MATCHED_STRUCTURE_PARSED_QC_UNREVIEWED")
        self.assertEqual(report["field_metadata_workbook"]["sheet_count"] >= 1, True)
        self.assertIsNone(report["trust"]["certified_tco2e"])
        self.assertFalse(report["trust"]["dat_calendar_mapping_approved"])
        self.assertFalse(report["trust"]["validated_observed_ghg_flux"])
        members = report["chamber_csv_archive"]["members"]
        self.assertEqual(members, sorted(members, key=lambda x: x["member"]))
        self.assertEqual(len({r["original_member_sha256"] for r in members}) >= 1, True)
        self.assertGreater(report["chamber_csv_archive"]["csv_data_rows_total"], 0)
        # Data and missingness diagnostics are published; NO conversion to UTC/CH4 totals.
        self.assertNotIn("calculated_methane_reduction", json.dumps(report))

    def test_synthetic_clean_and_missing_value_counts(self):
        result = mod.scan_ch4_zip(valid_zip())
        self.assertEqual(result["csv_members"], 60)
        self.assertEqual(result["csv_data_rows_total"], 120)
        self.assertEqual(result["members"][0]["blank_cells_by_column"]["ch4_flux"], 1)
        self.assertEqual(result["members"][0]["duplicate_DAT_tokens"], 0)
        workbook = mod.scan_workbook(valid_workbook())
        self.assertEqual(workbook["sheet_count"], 1)
        self.assertEqual(workbook["sheets"][0]["populated_row_elements"], 2)
        self.assertEqual(workbook["sheets"][0]["first_row_cells"][0]["literal"], "field_id")

    def test_nonnumeric_diagnostics_do_not_infer_qc(self):
        raw = b"DAT,tavg,course_type,ch4_flux,rain_mm\n1,NaN,A,1.0,0\n1,24,A,inf,3\n"
        result = mod.scan_csv_member("ch4/test.csv", raw)
        self.assertEqual(result["non_numeric_cells_by_expected_numeric_column"]["tavg"], 1)
        self.assertEqual(result["non_numeric_cells_by_expected_numeric_column"]["ch4_flux"], 1)
        self.assertEqual(result["duplicate_DAT_tokens"], 1)

    def test_reject_untrusted_archive_members(self):
        for name in ("../evil.csv", "/absolute.csv", "ch4\\backslash.csv"):
            with self.subTest(name=name):
                with self.assertRaisesRegex(ValueError, "ARCHIVE_ENTRY_UNSAFE"):
                    mod.archive_members(archive({name: valid_csv()}))
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as z:
            attr = zipfile.ZipInfo("ch4/symlink.csv")
            attr.external_attr = (stat.S_IFLNK | 0o777) << 16
            z.writestr(attr, "../elsewhere")
        with self.assertRaisesRegex(ValueError, "ARCHIVE_ENTRY_UNSAFE"):
            mod.archive_members(stream.getvalue())

    def test_reject_malformed_csv_and_missing_members(self):
        with self.assertRaisesRegex(ValueError, "CHAMBER_CSV_MEMBER_SET"):
            mod.scan_ch4_zip(archive({"ch4/single.csv": valid_csv()}))
        wrong = b"date,flux\n1,2\n"
        with self.assertRaisesRegex(ValueError, "CSV_UNEXPECTED_HEADER"):
            mod.scan_csv_member("ch4/bad.csv", wrong)
        with self.assertRaisesRegex(ValueError, "CSV_ROW_WIDTH"):
            mod.scan_csv_member("ch4/bad.csv",
                                b"DAT,tavg,course_type,ch4_flux,rain_mm\n1,2\n")
        with self.assertRaisesRegex(ValueError, "CSV_INVALID_UTF8"):
            mod.scan_csv_member("ch4/bad.csv", b"\xff")

    def test_reject_external_workbook_links_and_xml_entities(self):
        with self.assertRaisesRegex(ValueError, "XLSX_EXTERNAL_RELATIONSHIP"):
            mod.scan_workbook(valid_workbook(external=True))
        malicious = archive({
            "xl/workbook.xml": '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>',
            "xl/_rels/workbook.xml.rels": '<Relationships/>'
        })
        with self.assertRaisesRegex(ValueError, "XLSX_XML_UNSAFE"):
            mod.scan_workbook(malicious)

    def test_mutation_of_original_byte_copy_is_rejected_before_parsing(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = pathlib.Path(tmp)
            for name in ("ch4.zip", "input_fields_meta.xlsx", "acquisition-receipt.json"):
                (folder / name).write_bytes((mod.BASE / name).read_bytes())
            self.assertEqual(mod.create_report(folder)["chamber_csv_archive"]["csv_members"], 60)
            target = folder / "input_fields_meta.xlsx"
            target.write_bytes(target.read_bytes() + b"t")
            with self.assertRaisesRegex(ValueError, "ORIGINAL_FILE_"):
                mod.create_report(folder)


if __name__ == "__main__":
    unittest.main()
