#!/usr/bin/env python3
"""Positive real-source and adversarial source-mapping tests, no network."""
import importlib.util
import io
import json
import pathlib
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATH = ROOT / "scripts/ieee-gimje-field-crosswalk.py"
spec = importlib.util.spec_from_file_location("gimje_crosswalk", PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def sheet_xml(*, incorrect_header=False, formula=False, blank_field=False):
    ns = mod.load_preflight().MAIN_NS
    labels = list(mod.EXPECTED_HEADER)
    if incorrect_header:
        labels[1] = "unapproved_name"
    first = "".join('<c r="{}1" t="inlineStr"><is><t>{}</t></is></c>'.format(
        chr(ord("A")+i), name) for i, name in enumerate(labels))
    second = ('<c r="B2" t="inlineStr"><is><t>TEST</t></is></c>'
              if not blank_field else '<c r="B2" t="inlineStr"><is><t></t></is></c>')
    if formula:
        second = '<c r="B2"><f>HYPERLINK("https://bad.example")</f><v>0</v></c>'
    return ('<worksheet xmlns="' + ns + '"><sheetData>'
            '<row r="1">' + first + '</row>'
            '<row r="2">' + second
            + '<c r="C2" t="inlineStr"><is><t>2022</t></is></c>'
            + '<c r="H2" t="inlineStr"><is><t>44927</t></is></c>'
            + '<c r="L2" t="inlineStr"><is><t>AWD</t></is></c>'
            '</row></sheetData></worksheet>')


def workbook(*, incorrect_header=False, formula=False, blank_field=False):
    preflight = mod.load_preflight()
    n = preflight.MAIN_NS
    r = preflight.REL_NS
    p = preflight.PACK_NS
    sheet = ('<workbook xmlns="' + n + '" xmlns:r="' + r + '"><sheets>'
             '<sheet name="input_fields_meta" sheetId="1" r:id="rId1"/>'
             '</sheets></workbook>')
    rels = ('<Relationships xmlns="' + p + '"><Relationship Id="rId1" '
            'Target="worksheets/sheet1.xml" Type="worksheet"/></Relationships>')
    data = {
        "xl/workbook.xml": sheet,
        "xl/_rels/workbook.xml.rels": rels,
        "xl/worksheets/sheet1.xml": sheet_xml(
            incorrect_header=incorrect_header, formula=formula,
            blank_field=blank_field),
    }
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for name, value in data.items():
            z.writestr(name, value)
    return out.getvalue()


class TestGimjeCrosswalk(unittest.TestCase):
    def test_originals_generate_reproducible_noncertifying_crosswalk(self):
        a = mod.create_report()
        b = mod.create_report()
        self.assertEqual(a, b)
        self.assertEqual(a["csv_members"], 60)
        self.assertEqual(len(a["candidates"]), 60)
        self.assertEqual(a["source_file_sha256"]["ch4.zip"],
                         "719b148d1a4f08e31bc146f412c920ae1472ca1a3a4d6dd81d882c1ef79fe813")
        self.assertEqual(a["status"], "CANDIDATES_NOT_VALIDATED_FOR_CALENDAR_OR_GHG")
        self.assertGreater(a["source_field_rows"], 0)
        self.assertEqual(
            a["exact_string_candidates"],
            len([c for c in a["candidates"] if c["join_status"] ==
                 "EXACT_STRING_CANDIDATE_UNREVIEWED"]))
        self.assertFalse(a["review_gates"]["scientific_join_permitted"])
        self.assertFalse(a["review_gates"]["DAT_is_days_after_transplant_confirmed"])
        self.assertIsNone(a["certified_tco2e"])
        for candidate in a["candidates"]:
            self.assertFalse(candidate["scientifically_approved_join"])
            self.assertIsNone(candidate["calendar_date"])
            self.assertIsNone(candidate["validated_ch4_flux"])
            self.assertNotIn("director", candidate)

    def test_pure_exact_only_candidates_and_unmatched(self):
        rows = [
            {"source_workbook_row": 2, "field_id_literal": "ABC",
             "year_literal": "2022", "planting_date_literal": "44927",
             "harvesting_date_literal": "", "water_management_literal": "AWD",
             "source_row_sha256": "a"*64},
            {"source_workbook_row": 3, "field_id_literal": "DEF",
             "year_literal": "2022", "planting_date_literal": "44930",
             "harvesting_date_literal": "", "water_management_literal": "CF",
             "source_row_sha256": "b"*64}
        ]
        members = [
            {"member": "ch4/ABC.csv", "original_member_sha256": "0"*64,
             "row_count": 5, "blank_cells_by_column": {"ch4_flux": 2}},
            {"member": "ch4/AB.csv", "original_member_sha256": "1"*64,
             "row_count": 6, "blank_cells_by_column": {"ch4_flux": 1}}
        ]
        candidates, missing = mod.propose_exact_matches(members, rows)
        self.assertEqual(candidates[0]["candidate_field_id_literal"], "ABC")
        self.assertEqual(candidates[0]["candidate_planting_date_literal"], "44927")
        self.assertIsNone(candidates[0]["calendar_date"])
        self.assertEqual(candidates[1]["join_status"], "NO_EXACT_STRING_CANDIDATE")
        self.assertEqual(missing, ["DEF"])
        with self.assertRaisesRegex(ValueError, "DUPLICATE_WORKBOOK_FIELD_ID"):
            mod.propose_exact_matches(members, rows+[dict(rows[0])])

    def test_exact_workbook_headers_and_uninterpreted_date_serial(self):
        p = mod.load_preflight()
        rows = mod.read_workbook_field_rows(workbook(), p)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["field_id_literal"], "TEST")
        self.assertEqual(rows[0]["planting_date_literal"], "44927")
        self.assertEqual(rows[0]["water_management_literal"], "AWD")
        with self.assertRaisesRegex(ValueError, "WORKBOOK_HEADER_CHANGED"):
            mod.read_workbook_field_rows(workbook(incorrect_header=True), p)

    def test_untrusted_formulas_and_missing_ids_fail_closed(self):
        p = mod.load_preflight()
        with self.assertRaisesRegex(ValueError, "WORKBOOK_FORMULA_OR_ERROR_NOT_ALLOWED"):
            mod.read_workbook_field_rows(workbook(formula=True), p)
        with self.assertRaisesRegex(ValueError, "WORKBOOK_FIELD_ID_EMPTY_OR_NOT_CANONICAL"):
            mod.read_workbook_field_rows(workbook(blank_field=True), p)

    def test_mutated_original_workbook_fails_hash_guard(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = pathlib.Path(tmp)
            for name in ("ch4.zip", "input_fields_meta.xlsx", "acquisition-receipt.json"):
                (folder / name).write_bytes((mod.SOURCE / name).read_bytes())
            self.assertEqual(mod.create_report(folder)["csv_members"], 60)
            raw = (folder / "input_fields_meta.xlsx")
            raw.write_bytes(raw.read_bytes() + b"tampered")
            with self.assertRaisesRegex(ValueError, "ORIGINAL_FILE_"):
                mod.create_report(folder)


if __name__ == "__main__":
    unittest.main()
