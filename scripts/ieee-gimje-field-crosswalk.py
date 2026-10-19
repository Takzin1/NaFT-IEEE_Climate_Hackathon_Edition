#!/usr/bin/env python3
"""Source-bound Gimje field-ID crosswalk candidates, not approved joins or fluxes.

Offline, stdlib-only. XLSX values are read as *literal original cell values*.
No Excel date, DAT, treatment, unit, sampling interval or QC interpretation.
"""
import argparse
import hashlib
import importlib.util
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / "research/ieee-observation-datasets-2026-10-19/originals/KR_GIMJE_DAILY_2022_2024"
PREFLIGHT = ROOT / "scripts/ieee-gimje-structure-preflight.py"
EXPECTED_HEADER = (
    "reference", "field_id", "year", "director", "LAT", "LON",
    "rice_variety", "planting_date", "harvesting_date", "soil_texture",
    "grain_yield", "water_management", "seasonal_ch4"
)
COLUMN = re.compile(r"^([A-Z]{1,2})([1-9][0-9]{0,5})$")


def fail(message):
    raise ValueError("IEEE_GIMJE_CROSSWALK_BLOCKED:" + message)


def load_preflight():
    spec = importlib.util.spec_from_file_location("gimje_preflight_for_crosswalk", PREFLIGHT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_workbook_field_rows(blob, pf):
    """Read only the pinned workbook's explicit source table, no formulas."""
    entries = pf.archive_members(blob, limit_total=7_000_000, limit_member=1_000_000)
    listing = pf.scan_workbook(blob)
    candidates = [sheet for sheet in listing["sheets"]
                  if sheet["sheet"] == "input_fields_meta"]
    if len(candidates) != 1:
        fail("FIELD_METADATA_SHEET_MISSING_OR_DUPLICATE")
    selected = candidates[0]
    root = pf.parse_xml(entries[selected["worksheet_path"]], selected["sheet"])
    ns = "{" + pf.MAIN_NS + "}"
    shared = []
    if "xl/sharedStrings.xml" in entries:
        root_strings = pf.parse_xml(entries["xl/sharedStrings.xml"], "shared")
        for item in root_strings.findall(ns + "si"):
            shared.append("".join(t.text or "" for t in item.findall(".//" + ns + "t")))
        if len(shared) > 20000:
            fail("SHARED_STRINGS_LIMIT")
    result = []
    seen_coords = set()
    seen_rows = set()
    rows = root.findall(".//" + ns + "sheetData/" + ns + "row")
    if not rows or len(rows) > 500:
        fail("WORKBOOK_ROW_COUNT")
    for row in rows:
        row_literal = row.get("r", "")
        if not row_literal.isdigit() or not 1 <= int(row_literal) <= 500:
            fail("WORKBOOK_ROW_INDEX")
        rownum = int(row_literal)
        if rownum in seen_rows:
            fail("WORKBOOK_DUPLICATE_ROW")
        seen_rows.add(rownum)
        fields = {}
        for cell in row.findall(ns + "c"):
            address = cell.get("r", "")
            match = COLUMN.fullmatch(address)
            if not match or int(match.group(2)) != rownum:
                fail("WORKBOOK_CELL_ADDRESS")
            col = match.group(1)
            if col not in "ABCDEFGHIJKLM" or len(col) != 1:
                fail("WORKBOOK_COLUMN_OUT_OF_SCOPE")
            if address in seen_coords:
                fail("WORKBOOK_DUPLICATE_CELL")
            seen_coords.add(address)
            if cell.find(ns + "f") is not None or cell.get("t") == "e":
                fail("WORKBOOK_FORMULA_OR_ERROR_NOT_ALLOWED")
            literal = pf.workbook_cell(cell, shared)
            if len(literal) > 1000 or "\x00" in literal:
                fail("WORKBOOK_VALUE_UNSAFE")
            fields[col] = literal
        values = [fields.get(letter, "") for letter in "ABCDEFGHIJKLM"]
        if rownum == 1:
            if tuple(values) != EXPECTED_HEADER:
                fail("WORKBOOK_HEADER_CHANGED")
        else:
            if len(result) >= 100:
                fail("TOO_MANY_METADATA_ROWS")
            if any(values):
                if not values[1] or values[1] != values[1].strip():
                    fail("WORKBOOK_FIELD_ID_EMPTY_OR_NOT_CANONICAL")
                result.append({
                    "source_workbook_row": rownum,
                    "field_id_literal": values[1],
                    "year_literal": values[2],
                    "planting_date_literal": values[7],
                    "harvesting_date_literal": values[8],
                    "water_management_literal": values[11],
                    "source_row_sha256": hashlib.sha256(
                        json.dumps(values, separators=(",", ":"), ensure_ascii=False)
                        .encode("utf-8")).hexdigest(),
                })
    if 1 not in seen_rows:
        fail("WORKBOOK_HEADER_MISSING")
    return result


def propose_exact_matches(csv_members, field_rows):
    """Exact field ID = original CSV basename only; never inferred by prefix."""
    ids = {}
    for row in field_rows:
        key = row["field_id_literal"]
        if key in ids:
            fail("DUPLICATE_WORKBOOK_FIELD_ID")
        ids[key] = row
    member_names = set()
    paired_field_ids = set()
    results = []
    for entry in csv_members:
        full_name = entry["member"]
        if not full_name.startswith("ch4/") or not full_name.endswith(".csv"):
            fail("CSV_MEMBER_UNEXPECTED")
        source_basename = full_name[len("ch4/"):-len(".csv")]
        if not source_basename or source_basename in member_names:
            fail("DUPLICATE_CSV_BASENAME")
        member_names.add(source_basename)
        found = ids.get(source_basename)
        if found:
            paired_field_ids.add(found["field_id_literal"])
        results.append({
            "source_csv_member": full_name,
            "original_csv_sha256": entry["original_member_sha256"],
            "observed_rows": entry["row_count"],
            "blank_ch4_flux_cells": entry["blank_cells_by_column"]["ch4_flux"],
            "join_rule": "EXACT_SOURCE_BASENAME_EQUALS_WORKBOOK_FIELD_ID",
            "candidate_workbook_row": found["source_workbook_row"] if found else None,
            "candidate_field_id_literal": found["field_id_literal"] if found else None,
            "candidate_row_sha256": found["source_row_sha256"] if found else None,
            "candidate_year_literal": found["year_literal"] if found else None,
            "candidate_planting_date_literal": found["planting_date_literal"] if found else None,
            "candidate_harvesting_date_literal": found["harvesting_date_literal"] if found else None,
            "candidate_water_management_literal": found["water_management_literal"] if found else None,
            "join_status": ("EXACT_STRING_CANDIDATE_UNREVIEWED" if found else
                            "NO_EXACT_STRING_CANDIDATE"),
            "calendar_date": None,
            "validated_ch4_flux": None,
            "scientifically_approved_join": False,
        })
    return results, sorted(set(ids) - paired_field_ids)


def create_report(source=SOURCE):
    pf = load_preflight()
    source = pathlib.Path(source)
    structural = pf.create_report(source)
    file_bytes = (source / "input_fields_meta.xlsx").read_bytes()
    if hashlib.sha256(file_bytes).hexdigest() != structural["source_file_sha256"]["input_fields_meta.xlsx"]:
        fail("WORKBOOK_CHANGED_AFTER_STRUCTURAL_PREFLIGHT")
    field_rows = read_workbook_field_rows(file_bytes, pf)
    original_entries = structural["chamber_csv_archive"]["members"]
    candidates, unmatched_fields = propose_exact_matches(original_entries, field_rows)
    if (pf.load_intake().verify_local(pf.DATASET, source)["files_verified"] != 2 or
            hashlib.sha256((source / "input_fields_meta.xlsx").read_bytes()).hexdigest() !=
            structural["source_file_sha256"]["input_fields_meta.xlsx"] or
            hashlib.sha256((source / "ch4.zip").read_bytes()).hexdigest() !=
            structural["source_file_sha256"]["ch4.zip"]):
        fail("SOURCES_CHANGED_DURING_CROSSWALK")
    return {
        "schema": "naft-ieee-gimje-field-crosswalk-candidates-v1",
        "source_doi": "10.5281/zenodo.17111992",
        "status": "CANDIDATES_NOT_VALIDATED_FOR_CALENDAR_OR_GHG",
        "source_file_sha256": structural["source_file_sha256"],
        "metadata_sheet": "input_fields_meta",
        "source_header_literals": list(EXPECTED_HEADER),
        "source_field_rows": len(field_rows),
        "csv_members": len(candidates),
        "exact_string_candidates": sum(x["candidate_workbook_row"] is not None for x in candidates),
        "unpaired_workbook_field_ids": unmatched_fields,
        "candidates": candidates,
        "review_gates": {
            "source_filename_to_field_id_semantics_confirmed": False,
            "planting_date_serial_or_calendar_semantics_confirmed": False,
            "DAT_is_days_after_transplant_confirmed": False,
            "water_management_codes_interpreted": False,
            "ch4_flux_units_reviewed": False,
            "missing_flux_and_sampling_QC_reviewed": False,
            "scientific_join_permitted": False,
            "official_mrv_eligibility_verified": False,
        },
        "certified_tco2e": None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path, default=SOURCE)
    parser.add_argument("--output", type=pathlib.Path)
    options = parser.parse_args()
    report = create_report(options.source)
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if options.output:
        options.output.parent.mkdir(parents=True, exist_ok=True)
        options.output.write_text(payload, encoding="utf-8")
    else:
        print(payload, end="")


if __name__ == "__main__":
    main()
