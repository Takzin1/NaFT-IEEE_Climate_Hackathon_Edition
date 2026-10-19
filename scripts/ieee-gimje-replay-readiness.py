#!/usr/bin/env python3
"""Deterministic evidence-readiness report for original Gimje CH4 source data.

This is a descriptive *record-availability* matrix. Ratios are counts of CSV
cells with finite numeric literals, NOT coverage of chamber measurement time,
scientifically valid observations, rates, seasonal emissions, or treatment
effects. This script has no mechanism to approve emission integration.
"""
import argparse
from collections import Counter
import importlib.util
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUPPORT_PATH = ROOT / "scripts/ieee-gimje-observation-support-map.py"
METHOD_PATH = ROOT / "scripts/ieee-gimje-reference-method-gates.py"

# A missing external evidence document is not a review-pass signal.
REQUIRED_EVIDENCE = (
    ("CHAMBER_PROTOCOL", "Citable field chamber sampling and laboratory method",
     "Identify measurement duration and unit-to-daily-flux conversion"),
    ("SAMPLING_EVENT_LOG", "Dated per-field chamber sampling event ledger",
     "Map actual collected samples to field, date and event identifier"),
    ("BLANK_AND_QC_SEMANTICS", "Source data dictionary and QC exclusion log",
     "Distinguish no measurement, rejected data, and true numeric zero"),
    ("TIME_SUPPORT_POLICY", "Published interval assignment and seasonal boundary protocol",
     "Bound every eligible observation's representative time interval"),
    ("SOURCE_MASS_UNITS", "Publisher-confirmed CH4 gas-mass units and calibration",
     "Verify original flux mass/time/area basis and instrument calibration"),
    ("FIELD_IDENTITY", "Field map and field-ID treatment correspondence",
     "Verify measured field identity beyond filename string equivalence"),
    ("WATER_EVENTS", "Field-specific irrigation and midseason-drainage event log",
     "Confirm seven source treatment labels and dates against water events"),
    ("DATE_REFERENCE", "Primary-source transplant/harvest and DAT indexing conventions",
     "Approve workbook date system and DAT day-zero convention"),
    ("SEASONAL_REPLAY_REFERENCE", "Publisher seasonal aggregation and uncertainty method",
     "Independently reconcile field-year totals, exclusions and uncertainty"),
)


def fail(reason):
    raise ValueError("IEEE_GIMJE_READINESS_BLOCKED:" + reason)


def get_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def verified_source():
    return get_module("gimje_readiness_support", SUPPORT_PATH)


def validated_group_record(record, allowed_treatments):
    if not isinstance(record, dict):
        fail("FIELD_RECORD_TYPE")
    year = record.get("year_literal")
    treatment = record.get("source_water_management_literal")
    if year not in ("2022", "2023", "2024"):
        fail("YEAR_NOT_IN_SOURCE_SCOPE")
    if treatment not in allowed_treatments:
        fail("TREATMENT_CODE_OUTSIDE_PINNED_DICTIONARY")
    keys = (
        "csv_rows",
        "blank_flux_tokens",
        "invalid_flux_tokens",
        "finite_flux_tokens_unreviewed",
        "literal_numeric_zeros_unreviewed",
        "literal_negative_numbers_unreviewed",
        "distinct_numeric_DAT_count",
        "finite_tokens_without_valid_DAT",
        "repeated_DAT_rows",
        "pairs_with_elapsed_DAT_greater_than_one",
    )
    if any(type(record.get(k)) is not int or record[k] < 0 for k in keys):
        fail("SOURCE_COUNT_INVALID")
    rows = record["csv_rows"]
    finite = record["finite_flux_tokens_unreviewed"]
    if rows != finite + record["blank_flux_tokens"] + record["invalid_flux_tokens"]:
        fail("ROW_PARTITION_MISMATCH")
    if (record["literal_numeric_zeros_unreviewed"] > finite or
            record["literal_negative_numbers_unreviewed"] > finite or
            record["distinct_numeric_DAT_count"] > finite or
            record["finite_tokens_without_valid_DAT"] > finite or
            record["pairs_with_elapsed_DAT_greater_than_one"] >
            max(0, record["distinct_numeric_DAT_count"]-1)):
        fail("IMPOSSIBLE_OBSERVATION_COUNTS")
    if record.get("calibrated_measurement_QC") is not False:
        fail("UNAPPROVED_FIELD_QC")
    if any(record.get(k) is not None for k in (
            "seasonal_CH4", "interpolated_flux_days", "raw_observation_days")):
        fail("PREMATURE_SEASONAL_OR_COVERAGE_CLAIM")
    gaps = record.get("elapsed_DAT_distance_histogram")
    if not isinstance(gaps, dict):
        fail("DISTANCE_HISTOGRAM_INVALID")
    if any(not k.isdigit() or int(k) <= 0 or type(v) is not int or v < 0
           for k,v in gaps.items()):
        fail("DISTANCE_HISTOGRAM_INVALID")
    if sum(gaps.values()) != max(0,record["distinct_numeric_DAT_count"]-1):
        fail("DISTANCE_PAIR_COUNT_MISMATCH")
    if sum(v for k,v in gaps.items() if int(k)>1) != record[
            "pairs_with_elapsed_DAT_greater_than_one"]:
        fail("DISTANCE_NONADJACENT_COUNT_MISMATCH")
    return year, treatment


def group_summary(name, members):
    if not members:
        fail("EMPTY_GROUP")
    counters = Counter()
    for field in members:
        counters["fields"] += 1
        counters["source_csv_rows"] += field["csv_rows"]
        counters["finite_numeric_literals"] += field["finite_flux_tokens_unreviewed"]
        counters["blank_flux_tokens"] += field["blank_flux_tokens"]
        counters["invalid_flux_tokens"] += field["invalid_flux_tokens"]
        counters["literal_zeros"] += field["literal_numeric_zeros_unreviewed"]
        counters["literal_negative_numbers"] += field["literal_negative_numbers_unreviewed"]
        counters["numeric_token_pairs_with_distance_greater_than_one"] += field[
            "pairs_with_elapsed_DAT_greater_than_one"]
        counters["fields_with_no_finite_tokens"] += int(field["finite_flux_tokens_unreviewed"] == 0)
    if counters["source_csv_rows"] < 1:
        fail("GROUP_WITHOUT_SOURCE_ROWS")
    # Deterministic fraction of records with a finite numeric literal, NOT
    # sampling time coverage or verified measurement quality.
    return {
        "group": name,
        **dict(sorted(counters.items())),
        "numeric_token_availability_per_1000_csv_rows":
            (1000*counters["finite_numeric_literals"])//counters["source_csv_rows"],
        "is_chamber_time_coverage": False,
        "comparable_treatment_effect": False,
    }


def evidence_requests():
    return [{
        "requirement_id": key,
        "required_primary_source": requested,
        "acceptance_criterion_for_human_review": criterion,
        "current_state": "NOT_VERIFIED",
        "evidence_file_sha256": None,
        "citable_source_url": None,
        "human_reviewer_attestation": None,
    } for key,requested,criterion in REQUIRED_EVIDENCE]


def assemble(support, method_policy):
    if (support.get("schema") != "naft-ieee-gimje-observation-support-map-v1"
            or support.get("status") != "OBSERVATION_PRESENCE_ONLY_NOT_SAMPLING_SUPPORT"
            or support.get("field_count") != 60
            or support.get("dataset_doi") != "10.5281/zenodo.17111992"):
        fail("SOURCE_REPORT_SCHEMA")
    gates = support.get("review_gates", {})
    if (gates.get("source_fingerprints_verified") is not True
            or gates.get("seasonal_CH4_integral_permitted") is not False
            or gates.get("measurement_timing_and_support_defined") is not False
            or gates.get("certified_tco2e", "unexpected") is not None):
        fail("UPSTREAM_GATES_NOT_CLOSED")
    original = method_policy["dataset"]
    expected_hashes = {
        "ch4.zip": original["chamber_original_sha256"],
        "input_fields_meta.xlsx": original["workbook_original_sha256"],
    }
    if support.get("original_file_sha256") != expected_hashes:
        fail("ORIGINAL_DATA_IDENTITY_DRIFT")
    allowed_treatments = set(method_policy["source_token_families"]["water_management"])
    if len(allowed_treatments) != 7:
        fail("TREATMENT_DICTIONARY_NOT_PINNED")
    records = support.get("source_field_diagnostics")
    if not isinstance(records,list) or len(records)!=60:
        fail("SOURCE_FIELD_COUNT_INVALID")
    by_id = set()
    by_year = {}
    by_treatment = {}
    by_combination = {}
    for record in records:
        year,treatment = validated_group_record(record,allowed_treatments)
        field_id = record.get("field_id_literal")
        if not isinstance(field_id,str) or not field_id or field_id in by_id:
            fail("SOURCE_FIELD_ID_DUPLICATE_OR_MISSING")
        by_id.add(field_id)
        by_year.setdefault(year,[]).append(record)
        by_treatment.setdefault(treatment,[]).append(record)
        by_combination.setdefault((year,treatment),[]).append(record)
    overall = group_summary("ALL_PINNED_SOURCE_FIELDS",records)
    totals = support.get("totals",{})
    if (overall["source_csv_rows"] != totals.get("csv_rows") or
            overall["finite_numeric_literals"] != totals.get("finite_flux_tokens_unreviewed") or
            overall["blank_flux_tokens"] != totals.get("blank_flux_tokens") or
            overall["invalid_flux_tokens"] != totals.get("invalid_flux_tokens") or
            overall["literal_zeros"] != totals.get("literal_numeric_zeros_unreviewed") or
            overall["literal_negative_numbers"] != totals.get("literal_negative_numbers_unreviewed")):
        fail("SOURCE_TOTAL_ACCOUNTING_DRIFT")
    if sum(x["fields"] for x in [
            group_summary(key,members) for key,members in by_year.items()]) != len(records):
        fail("YEAR_GROUP_PARTITION_FAILED")
    return {
        "schema": "naft-ieee-gimje-seasonal-replay-readiness-v1",
        "status": "BLOCKED_AWAITING_PRIMARY_MEASUREMENT_AND_QC_EVIDENCE",
        "source_doi": support["dataset_doi"],
        "original_file_sha256": expected_hashes,
        "upstream_method_commit": support["upstream_method_commit"],
        "method_contract_sha256": support["method_contract_sha256"],
        "overall_numeric_token_availability": overall,
        "by_year": [group_summary(year,by_year[year]) for year in sorted(by_year)],
        "by_water_management_literal": [
            group_summary(label,by_treatment[label]) for label in sorted(by_treatment)],
        "by_year_and_literal_treatment": [
            group_summary(year+"|"+label,by_combination[(year,label)])
            for year,label in sorted(by_combination)],
        "required_evidence": evidence_requests(),
        "scientific_release_decision": {
            "requires_independent_review_of_primary_documents": True,
            "sampling_intervals_assigned": False,
            "missing_data_QC_resolved": False,
            "time_weighted_seasonal_replay_eligible": False,
            "causal_treatment_effect_established": False,
            "certified_tco2e": None,
        },
        "interpretation_boundary":
          "COUNTS_OF_FINITE_CSV_TOKENS_NOT_MEASUREMENT_SUPPORT_OR_EMISSIONS",
    }


def create_report(source=None):
    support_module = verified_source()
    support = support_module.create_report(source)
    method_policy = get_module(
        "gimje_readiness_method", METHOD_PATH).load_policy()
    return assemble(support, method_policy)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source",type=pathlib.Path)
    parser.add_argument("--output",type=pathlib.Path)
    args=parser.parse_args()
    report=create_report(args.source)
    contents=json.dumps(report,indent=2,ensure_ascii=False)+"\n"
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(contents,encoding="utf-8")
    else:
        print(contents,end="")


if __name__ == "__main__":
    main()
