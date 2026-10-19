#!/usr/bin/env python3
"""Gimje CH4 observation presence/spacing audit, not an emissions estimate.

Preserves numeric-zero versus blank and enumerates elapsed DAT distances between
numeric CH4 tokens. A distance is NOT the measurement support of a chamber
observation, a missing-day count, or an interpolation authorization.

Source is pinned original ZIP/workbook and upstream reference-method gate.
No packages beyond Python stdlib; no network, extraction or data rewriting.
"""
import argparse
from collections import Counter
import csv
from decimal import Decimal, InvalidOperation
import hashlib
import importlib.util
import io
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
METHOD = ROOT / "scripts/ieee-gimje-reference-method-gates.py"


def reject(reason):
    raise ValueError("IEEE_GIMJE_OBSERVATION_SUPPORT_BLOCKED:" + reason)


def import_method():
    spec = importlib.util.spec_from_file_location("gimje_method_support", METHOD)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def classify_csv(source_name, raw, method):
    """Inspect only finite numeric CH4 tokens; do not interpret sample durations."""
    if len(raw) > 500000 or b"\x00" in raw:
        reject("UNSAFE_CSV_LENGTH_OR_NUL")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeError:
        reject("CSV_NOT_UTF8")
    source = csv.DictReader(io.StringIO(text, newline=""), strict=True)
    if source.fieldnames != ["DAT", "tavg", "course_type", "ch4_flux", "rain_mm"]:
        reject("UNEXPECTED_CSV_HEADER")
    n = 0
    blank = 0
    invalid = 0
    finite = 0
    zeros = 0
    negatives = 0
    numeric_dat = []
    all_dat = []
    samples_without_dat = 0
    try:
        for row in source:
            n += 1
            if n > 10000 or None in row or any(x is None for x in row.values()):
                reject("MALFORMED_CSV_ROW")
            token = row["ch4_flux"].strip()
            state, _ = method.parse_numeric_literal(token)
            dat_token = row["DAT"].strip()
            dat = int(dat_token) if method.ALLOWED_DAT.fullmatch(dat_token) else None
            if dat is not None:
                all_dat.append(dat)
            if state == "MISSING":
                blank += 1
            elif state == "INVALID_OR_UNDEFINED":
                invalid += 1
            elif state == "NUMERIC_TOKEN_NOT_QC_APPROVED":
                finite += 1
                try:
                    dec = Decimal(token)
                except InvalidOperation:
                    reject("DECIMAL_PARSE_INCONSISTENT")
                if dec == 0:
                    zeros += 1
                if dec < 0:
                    negatives += 1
                if dat is None:
                    samples_without_dat += 1
                else:
                    numeric_dat.append(dat)
            else:
                reject("UNEXPECTED_TOKEN_STATE")
    except csv.Error:
        reject("CSV_PARSE_ERROR")
    if n != finite + blank + invalid:
        reject("TOKEN_ACCOUNTING_DISAGREEMENT")
    if len(all_dat) != len(set(all_dat)):
        # Repeated DAT on different rows can mean replicates, which needs review.
        # Keep a diagnostic instead of guessing one reading per calendar day.
        repeat_count = len(all_dat) - len(set(all_dat))
    else:
        repeat_count = 0
    distinct = sorted(set(numeric_dat))
    intervals = [right-left for left, right in zip(distinct, distinct[1:])]
    if any(delta <= 0 for delta in intervals):
        reject("NONMONOTONIC_INTERVAL")
    distances = dict(sorted(Counter(intervals).items()))
    # Gap size is a difference in literal DAT indices, NOT actual observation
    # coverage; no time-of-day or chamber collection window is available.
    return {
        "source_member": source_name,
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "csv_rows": n,
        "blank_flux_tokens": blank,
        "invalid_flux_tokens": invalid,
        "finite_flux_tokens_unreviewed": finite,
        "literal_numeric_zeros_unreviewed": zeros,
        "literal_negative_numbers_unreviewed": negatives,
        "finite_tokens_without_valid_DAT": samples_without_dat,
        "repeated_DAT_rows": repeat_count,
        "distinct_numeric_DAT_count": len(distinct),
        "first_numeric_DAT": distinct[0] if distinct else None,
        "last_numeric_DAT": distinct[-1] if distinct else None,
        "elapsed_DAT_distance_histogram": {str(day): count for day, count in distances.items()},
        "pairs_with_elapsed_DAT_greater_than_one": sum(count for delta, count in distances.items() if delta > 1),
        "max_elapsed_DAT_distance": max(intervals) if intervals else None,
        "raw_observation_days": None,
        "interpolated_flux_days": None,
        "seasonal_CH4": None,
        "calibrated_measurement_QC": False,
    }


def create_report(source=None):
    method = import_method()
    upstream = method.create_report(source)
    if (upstream.get("status") != "SOURCE_PINNED_RESEARCH_DIAGNOSTICS_NOT_EMISSIONS"
            or upstream.get("field_count") != 60
            or upstream.get("gates", {}).get("seasonal_emissions_computable") is not False
            or upstream.get("gates", {}).get("certified_tco2e", "not-null") is not None):
        reject("METHOD_GATE_NOT_TRUSTWORTHY")
    root = pathlib.Path(source) if source is not None else method.BASE / "originals/KR_GIMJE_DAILY_2022_2024"
    cross = __import_crosswalk(method)
    pf = cross.load_preflight()
    previous = method.load_policy()
    expected = previous["dataset"]["chamber_original_sha256"]
    original = (root / "ch4.zip").read_bytes()
    if hashlib.sha256(original).hexdigest() != expected:
        reject("ARCHIVE_CHANGED_BEFORE_AUDIT")
    members = pf.archive_members(original)
    if len(members) != 60:
        reject("CHAMBER_MEMBER_COUNT")
    entries = []
    global_counts = Counter()
    global_distance = Counter()
    for field in upstream["fields"]:
        name = field["member"]
        data = members.get(name)
        if data is None:
            reject("CHAMBER_FIELD_NOT_FOUND")
        record = classify_csv(name, data, method)
        if (record["source_sha256"] != field["source_csv_sha256"]
                or record["csv_rows"] != field["rows"]
                or record["blank_flux_tokens"] != field["ch4_blank_count"]
                or record["invalid_flux_tokens"] != field["ch4_invalid_token_count"]
                or record["finite_flux_tokens_unreviewed"] != field["ch4_numeric_token_count_unreviewed"]
                or record["repeated_DAT_rows"] != field["dat_duplicate_count"]):
            reject("INDEPENDENT_VS_REFERENCE_COUNT_DRIFT")
        record["field_id_literal"] = field["field_id_literal"]
        record["year_literal"] = field["year_literal"]
        record["source_water_management_literal"] = field["water_management_literal"]
        for k in ("csv_rows", "blank_flux_tokens", "invalid_flux_tokens",
                  "finite_flux_tokens_unreviewed", "literal_numeric_zeros_unreviewed",
                  "literal_negative_numbers_unreviewed", "finite_tokens_without_valid_DAT",
                  "repeated_DAT_rows", "distinct_numeric_DAT_count",
                  "pairs_with_elapsed_DAT_greater_than_one"):
            global_counts[k] += record[k]
        global_distance.update({int(k): v for k, v in record["elapsed_DAT_distance_histogram"].items()})
        entries.append(record)
    if (len(entries) != 60
            or global_counts["csv_rows"] != upstream["summary"]["rows"]
            or global_counts["blank_flux_tokens"] != upstream["summary"]["ch4_blank_count"]
            or global_counts["finite_flux_tokens_unreviewed"] != upstream["summary"]["ch4_numeric_token_count_unreviewed"]
            or global_counts["invalid_flux_tokens"] != upstream["summary"]["ch4_invalid_token_count"]):
        reject("GLOBAL_SOURCE_ACCOUNTING_DRIFT")
    if (hashlib.sha256((root / "ch4.zip").read_bytes()).hexdigest() != expected
            or pf.load_intake().verify_local(pf.DATASET, root)["files_verified"] != 2):
        reject("SOURCES_CHANGED_AFTER_AUDIT")
    return {
        "schema": "naft-ieee-gimje-observation-support-map-v1",
        "status": "OBSERVATION_PRESENCE_ONLY_NOT_SAMPLING_SUPPORT",
        "dataset_doi": upstream["original_file_sha256"] and "10.5281/zenodo.17111992",
        "original_file_sha256": upstream["original_file_sha256"],
        "upstream_method_commit": upstream["upstream_commit"],
        "method_contract_sha256": upstream["requirements_contract_sha256"],
        "field_count": len(entries),
        "source_field_diagnostics": entries,
        "totals": dict(sorted(global_counts.items())),
        "elapsed_DAT_distance_histogram": {str(k): v for k, v in sorted(global_distance.items())},
        "interpretation": {
            "distance_is": "DISTANCE_BETWEEN_CONSECUTIVE_DISTINCT_FINITE_CH4_DAT_TOKENS",
            "distance_is_not": "CHAMBER_OBSERVATION_SUPPORT_OR_CONFIRMED_DAYS_WITHOUT_MEASUREMENTS",
            "blank_means": "NO_FINITE_MEASURED_CH4_TOKEN;NOT_ZERO",
            "numeric_zero_means": "FINITE_NUMERIC_LITERAL_NOT_QC_AUTHENTICATED",
        },
        "review_gates": {
            "source_fingerprints_verified": True,
            "measurement_timing_and_support_defined": False,
            "missing_data_reason_codes_available": False,
            "chamber_QC_flags_available": False,
            "site_join_scientifically_approved": False,
            "source_units_and_mass_basis_approved": False,
            "interpolation_method_authorized": False,
            "seasonal_CH4_integral_permitted": False,
            "field_treatment_effect_proven": False,
            "eligible_carbon_credits": False,
            "certified_tco2e": None,
        }
    }


def __import_crosswalk(method):
    path = method.ROOT / "scripts/ieee-gimje-field-crosswalk.py"
    spec = importlib.util.spec_from_file_location("gimje_crosswalk_observation_support", path)
    cross = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cross)
    return cross


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()
    result = json.dumps(create_report(args.source), indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result, encoding="utf-8")
    else:
        print(result, end="")


if __name__ == "__main__":
    main()
