#!/usr/bin/env python3
"""Reproduce upstream Gimje *requirements* as non-certifying research diagnostics.

Not a reproduction of the authors' RF/XGB model. Never fills missing data,
integrates methane fluxes, establishes field treatment efficacy or creates MRV.
Read-only, stdlib, deterministic and bounded; derived dates are CANDIDATES.
"""
import argparse
from collections import Counter
import csv
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / "research/ieee-observation-datasets-2026-10-19"
CONTRACT = BASE / "gimje-author-method-contract.json"
ALLOWED_DAT = re.compile(r"^(?:0|[1-9][0-9]{0,3})$")
ALLOWED_YEAR = {"2022", "2023", "2024"}
DATE_EPOCH = date(1899, 12, 30)
NUMERIC = re.compile(r"^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[Ee][+-]?[0-9]+)?$")
REQUIRED_UPSTREAM_RULES = ("FIELD_FILENAME", "DAT_DATE", "DAT_STAGES", "TRAINING_MISSING")


def fail(code):
    raise ValueError("IEEE_GIMJE_METHOD_GATE_BLOCKED:" + code)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def parse_numeric_literal(value):
    value = value.strip()
    if not value:
        return "MISSING", None
    if len(value) > 80 or not NUMERIC.fullmatch(value):
        return "INVALID_OR_UNDEFINED", None
    try:
        result = Decimal(value)
    except InvalidOperation:
        return "INVALID_OR_UNDEFINED", None
    if not result.is_finite():
        return "INVALID_OR_UNDEFINED", None
    return "NUMERIC_TOKEN_NOT_QC_APPROVED", None  # Never treat as usable flux.


def stage_for_dat(dat):
    if dat <= 10:
        return "rooting"
    if dat <= 45:
        return "tillering"
    if dat <= 90:
        return "reproductive"
    return "ripening"


def source_date_serial(value, year):
    """Provisional 1900-based workbook date. Never infer time zone or datetimes."""
    if year not in ALLOWED_YEAR or not value or not value.isdigit():
        return None, "YEAR_OR_SERIAL_NOT_INTEGER"
    serial = int(value)
    if not 40000 <= serial <= 50000:
        return None, "DATE_SERIAL_OUT_OF_REVIEW_RANGE"
    guessed = DATE_EPOCH + timedelta(days=serial)
    if str(guessed.year) != year:
        return None, "DATE_SERIAL_YEAR_MISMATCH"
    return guessed, "CANDIDATE_1900_SYSTEM_NOT_CALENDAR_APPROVED"


def stage_diagnostics(member, raw, start, end):
    """Bounded original CSV parse; count literal data presence, never interpolate."""
    if len(raw) > 500000:
        fail("CSV_SIZE_LIMIT")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeError:
        fail("CSV_UTF8")
    reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
    if reader.fieldnames != ["DAT", "tavg", "course_type", "ch4_flux", "rain_mm"]:
        fail("CSV_HEADER_DRIFT")
    counts = Counter()
    types = Counter()
    stages = Counter()
    dats = set()
    min_dat, max_dat = None, None
    violations = set()
    try:
        for row in reader:
            if len(counts) > 30 or None in row or any(x is None for x in row.values()):
                fail("CSV_ROW_INVALID")
            counts["rows"] += 1
            token = row["DAT"].strip()
            if not ALLOWED_DAT.fullmatch(token):
                counts["DAT_MISSING_OR_INVALID"] += 1
                dat = None
            else:
                dat = int(token)
                if dat in dats:
                    counts["DAT_DUPLICATE"] += 1
                dats.add(dat)
                min_dat = dat if min_dat is None else min(min_dat, dat)
                max_dat = dat if max_dat is None else max(max_dat, dat)
                stages[stage_for_dat(dat)] += 1
                if start is not None and end is not None:
                    proposed = start + timedelta(days=dat)
                    if proposed > end or proposed < start:
                        counts["DAT_DATE_OUTSIDE_PLANTING_HARVEST_CANDIDATE"] += 1
            state, _ = parse_numeric_literal(row["ch4_flux"])
            counts["CH4_"+state] += 1
            types[row["course_type"].strip() or "<BLANK>"] += 1
            if counts["rows"] > 10000 or len(types) > 300:
                fail("CSV_ROWS_OR_TYPES_LIMIT")
    except csv.Error:
        fail("CSV_PARSE_ERROR")
    return {
        "member": member,
        "source_csv_sha256": sha(raw),
        "rows": counts["rows"],
        "ch4_numeric_token_count_unreviewed": counts["CH4_NUMERIC_TOKEN_NOT_QC_APPROVED"],
        "ch4_blank_count": counts["CH4_MISSING"],
        "ch4_invalid_token_count": counts["CH4_INVALID_OR_UNDEFINED"],
        "dat_invalid_or_blank_count": counts["DAT_MISSING_OR_INVALID"],
        "dat_duplicate_count": counts["DAT_DUPLICATE"],
        "dat_min": min_dat,
        "dat_max": max_dat,
        "dat_outside_planting_harvest_candidate": counts["DAT_DATE_OUTSIDE_PLANTING_HARVEST_CANDIDATE"],
        "upstream_reference_stage_counts_not_validation": dict(sorted(stages.items())),
        "original_course_type_literal_counts": dict(sorted(types.items())),
        "seasonal_ch4_g_m2": None,
        "scientifically_approved": False
    }


def load_policy():
    contract = json.loads(CONTRACT.read_text("utf-8"))
    if contract.get("schema") != "naft-ieee-gimje-author-method-contract-v1":
        fail("METHOD_CONTRACT_SCHEMA")
    dataset = contract.get("dataset", {})
    if (dataset.get("id") != "KR_GIMJE_DAILY_2022_2024" or
            dataset.get("doi") != "10.5281/zenodo.17111992" or
            contract.get("mode") != "RESEARCH_REFERENCE_NOT_QC_AUTHORIZATION" or
            contract.get("upstream_software", {}).get("pinned_commit") !=
            "45525f01642c3069d03177e8801070da1dcb3450" or
            contract.get("upstream_software", {}).get("ported_code") is not False or
            tuple(x.get("id") for x in contract.get("rules", [])) != REQUIRED_UPSTREAM_RULES or
            any(x.get("scientifically_approved") is not False for x in contract["rules"]) or
            contract.get("integrity_guards", {}).get("registry_eligibility") is not False or
            contract.get("source_token_families", {}).get("ch4_flux_units_accepted_for_MRV") is not False):
        fail("METHOD_CONTRACT_UNTRUSTED")
    return contract


def date_1904_flag(wb_bytes, pf):
    contents = pf.archive_members(wb_bytes, limit_total=7_000_000, limit_member=1_000_000)
    workbook = pf.parse_xml(contents.get("xl/workbook.xml", b""), "workbook")
    property_element = workbook.find("{" + pf.MAIN_NS + "}workbookPr")
    flag = property_element.get("date1904", "0") if property_element is not None else "0"
    if flag not in ("0", "false", "False", "1", "true", "True"):
        fail("DATE_SYSTEM_UNRECOGNIZED")
    if flag in ("1", "true", "True"):
        fail("EXCEL_1904_DATE_SYSTEM_UNSUPPORTED")
    return "EXCEL_1900_CANDIDATE"


def create_report(source=None):
    import importlib.util
    path = ROOT / "scripts/ieee-gimje-field-crosswalk.py"
    spec = importlib.util.spec_from_file_location("gimje_crosswalk_for_method", path)
    cross = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cross)
    pf = cross.load_preflight()
    source = pathlib.Path(source) if source is not None else cross.SOURCE
    contract = load_policy()
    crosswalk = cross.create_report(source)
    if (crosswalk.get("status") != "CANDIDATES_NOT_VALIDATED_FOR_CALENDAR_OR_GHG" or
            crosswalk.get("certified_tco2e", "unexpected") is not None or
            crosswalk.get("exact_string_candidates") != 60 or
            crosswalk.get("csv_members") != 60 or
            any(c.get("join_status") != "EXACT_STRING_CANDIDATE_UNREVIEWED"
                for c in crosswalk["candidates"])):
        fail("CROSSWALK_NOT_COMPLETE_OR_UNTRUSTED")
    locked = contract["dataset"]
    if (crosswalk["source_file_sha256"].get("ch4.zip") != locked["chamber_original_sha256"] or
            crosswalk["source_file_sha256"].get("input_fields_meta.xlsx") !=
            locked["workbook_original_sha256"]):
        fail("SOURCE_DOES_NOT_MATCH_METHOD_CONTRACT")
    zip_raw = (source/"ch4.zip").read_bytes()
    workbook_raw = (source/"input_fields_meta.xlsx").read_bytes()
    system = date_1904_flag(workbook_raw, pf)
    entries = pf.archive_members(zip_raw)
    output = []
    water = Counter()
    summary = Counter()
    planting = Counter()
    for entry in crosswalk["candidates"]:
        field_id = entry["candidate_field_id_literal"]
        planting_literal = entry["candidate_planting_date_literal"]
        harvest_literal = entry["candidate_harvesting_date_literal"]
        year = entry["candidate_year_literal"]
        started, p_status = source_date_serial(planting_literal, year)
        ended, h_status = source_date_serial(harvest_literal, year)
        if started is not None and ended is not None and started > ended:
            fail("PLANTING_AFTER_HARVEST")
        w = entry["candidate_water_management_literal"]
        known = w in contract["source_token_families"]["water_management"]
        water[w if known else "<UNKNOWN_OR_EMPTY>"] += 1
        if started is not None:
            planting[started.isoformat()] += 1
        member = entry["source_csv_member"]
        if member not in entries:
            fail("CROSSWALK_SOURCE_CSV_NOT_IN_ARCHIVE")
        raw = entries[member]
        if sha(raw) != entry["original_csv_sha256"]:
            fail("CSV_MEMBER_DIGEST_DISAGREEMENT")
        reading = stage_diagnostics(member, raw, started, ended)
        if reading["rows"] != entry["observed_rows"] or reading["ch4_blank_count"] != entry["blank_ch4_flux_cells"]:
            fail("CROSSWALK_CSV_COUNTS_DISAGREE")
        for k in ("rows", "ch4_numeric_token_count_unreviewed", "ch4_blank_count",
                  "ch4_invalid_token_count", "dat_invalid_or_blank_count",
                  "dat_duplicate_count", "dat_outside_planting_harvest_candidate"):
            summary[k] += reading[k]
        output.append({
            "field_id_literal": field_id,
            "metadata_row_sha256": entry["candidate_row_sha256"],
            "year_literal": year,
            "planting_date_candidate": started.isoformat() if started else None,
            "planting_date_status": p_status,
            "harvesting_date_candidate": ended.isoformat() if ended else None,
            "harvesting_date_status": h_status,
            "water_management_literal": w,
            "water_management_dictionary_match": known,
            "water_management_interpretation_approved": False,
            **reading
        })
    if (sha((source/"ch4.zip").read_bytes()) != locked["chamber_original_sha256"] or
            sha((source/"input_fields_meta.xlsx").read_bytes()) != locked["workbook_original_sha256"] or
            pf.load_intake().verify_local(pf.DATASET,source)["files_verified"] != 2):
        fail("SOURCE_DRIFT_AFTER_METHOD_REPLAY")
    if summary["rows"] != summary["ch4_blank_count"] + summary["ch4_invalid_token_count"] + summary["ch4_numeric_token_count_unreviewed"]:
        fail("CH4_MISSINGNESS_ACCOUNTING_MISMATCH")
    return {
        "schema": "naft-ieee-gimje-reference-method-qc-gates-v1",
        "status": "SOURCE_PINNED_RESEARCH_DIAGNOSTICS_NOT_EMISSIONS",
        "upstream_repo": contract["upstream_software"]["repository"],
        "upstream_commit": contract["upstream_software"]["pinned_commit"],
        "requirements_contract_sha256": sha(CONTRACT.read_bytes()),
        "original_file_sha256": crosswalk["source_file_sha256"],
        "candidate_excel_date_system": system,
        "date_rule": "PROVISIONAL_1899_12_30_PLUS_SERIAL;PROVISIONAL_PLANTING_PLUS_DAT",
        "publisher_ch4_unit_claim_unverified_for_MRV":
          contract["source_token_families"]["ch4_flux_unit_publisher_claim"],
        "field_count": len(output),
        "summary": dict(sorted(summary.items())),
        "water_management_literal_counts_unreviewed": dict(sorted(water.items())),
        "planting_date_candidate_counts": dict(sorted(planting.items())),
        "fields": output,
        "required_before_seasonal_integration": [
          "confirm DAT and day index convention against field log",
          "confirm measurement interval coverage for sparse chamber flux records",
          "supply observed vs not observed vs QC rejected flag semantics",
          "independently verify observed ch4_flux units and methane mass basis",
          "confirm plot identities, irrigation event logs and valid water codes",
          "define documented interpolation and uncertainty model if scientifically warranted"
        ],
        "gates": {
          "file_integrity": "PINNED_AND_CHECKED",
          "upstream_method_references": "PINNED_AUTHOR_CODE",
          "candidate_field_identity": "STRING_ONLY_NOT_FIELD_CONFIRMED",
          "date_reconstruction_scientifically_approved": False,
          "source_observation_QC_approved": False,
          "measurement_interval_defined": False,
          "seasonal_emissions_computable": False,
          "field_treatment_reduction_proven": False,
          "J_credit_eligible": False,
          "certified_tco2e": None
        }
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()
    report = create_report(args.source)
    result = json.dumps(report, indent=2, ensure_ascii=False)+"\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result, encoding="utf-8")
    else:
        print(result, end="")


if __name__ == "__main__":
    main()
