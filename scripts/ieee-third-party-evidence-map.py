#!/usr/bin/env python3
"""Connect independently published CH4 references to NaFT evidence gaps.

This is a reproducible, offline *candidate linkage* audit. It never downloads
unvetted observations, calls remote APIs, executes external code, approves QC,
computes methane reductions or certifies environmental claims.
"""
import argparse
import hashlib
import importlib.util
import json
import pathlib
import re
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "research/ieee-observation-datasets-2026-10-19/third-party-validation-sources.json"
READINESS_SCRIPT = ROOT / "scripts/ieee-gimje-replay-readiness.py"
HEX_SHA = re.compile(r"^[0-9a-f]{40}$")
DOI = re.compile(r"^10\.[0-9]{4,9}/[-._;()/:A-Za-z0-9]+$")
SOURCE_KINDS = {
    "PEER_REVIEWED_METHOD", "THIRD_PARTY_METHOD_DATASET",
    "INDEPENDENT_SOFTWARE", "INDEPENDENT_FIELD_OBSERVATION",
    "PEER_REVIEWED_DATA_DESCRIPTION", "DATA_ACCESS_TOOL",
}
EXPECTATIONS = {
    "CHAMBER_QC_DECISION_VARIABILITY": (
        "THIRD_PARTY_REFERENCE_FOUND_NOT_APPLIED_TO_GIMJE",
        "METHOD_RISK"),
    "CHAMBER_FLUX_INDEPENDENT_ORACLE": (
        "BLOCKED_GIMJE_RAW_CONCENTRATIONS_MISSING",
        "ALGORITHMIC_INDEPENDENCE"),
    "RICE_PADDY_CROSS_SITE_EXTERNAL_VALIDITY": (
        "INDEPENDENT_SITES_IDENTIFIED_NOT_DOWNLOADED_OR_HARMONIZED",
        "EXTERNAL_SITE_INDEPENDENCE"),
    "REPRODUCIBLE_FLUXNET_ACCESS": (
        "PINNED_TOOL_FOUND_NO_DOWNLOAD", "DATA_PROVENANCE"),
}
EXPECTED_IDS = {
    "JENTZSCH_ESSD_2025", "JENTZSCH_PANGAEA_971695",
    "GASFLUXES_CRAN_2026", "HARVARD_FOREST_CHAMBER_FLUX",
    "FLUXNET_CH4_JP_MSE", "FLUXNET_CH4_KR_CRK",
    "FLUXNET_CH4_PH_RIF", "DELWICHE_ESSD_2021",
    "FLUXNET_SHUTTLE",
}
SOURCE_ID_GIMJE = "KR_GIMJE_DAILY_2022_2024"
GIMJE_HASH = "719b148d1a4f08e31bc146f412c920ae1472ca1a3a4d6dd81d882c1ef79fe813"
GASFLUXES_SAMPLE_SHA = "b5ec601059dab6949a2ae5db8ebb741349ddd3e37a687fe4c4415df40b886f31"
GASFLUXES_SAMPLE_PATH = ("research/ieee-observation-datasets-2026-10-19/"
  "independent-benchmarks/gasfluxes-v0.7-2/fluxmeas-first-five.csv")


def fail(code):
    raise ValueError("IEEE_INDEPENDENT_EVIDENCE_BLOCKED:" + code)


def load_json(path):
    path = pathlib.Path(path)
    if not path.is_file() or path.is_symlink() or path.stat().st_size > 200_000:
        fail("REGISTRY_FILE_UNSAFE_OR_TOO_LARGE")
    return json.loads(path.read_text(encoding="utf-8"))


def valid_url(value):
    if not isinstance(value, str) or len(value) > 500:
        return False
    p = urlsplit(value)
    return p.scheme == "https" and bool(p.netloc) and not p.username and not p.password and not p.fragment


def validate_source(record):
    if not isinstance(record,dict) or record.get("id") not in EXPECTED_IDS:
        fail("UNRECOGNIZED_EXTERNAL_SOURCE")
    if (record.get("kind") not in SOURCE_KINDS or
            record.get("external_code_executed") is not False or
            record.get("analysis_reproduced") is not False or
            record.get("reviewed_by_independent_human") is not False):
        fail("FORGED_EXTERNAL_VALIDATION_STATUS")
    if record["id"] == "GASFLUXES_CRAN_2026":
        if (record.get("verification_state") !=
               "PINNED_FIXTURE_SUBSET_IMPORTED_REPLAY_CHECKED_IN_SEPARATE_CI_ARTIFACT" or
                record.get("external_bytes_imported") is not True or
                record.get("source_data_download_sha256") != GASFLUXES_SAMPLE_SHA or
                record.get("imported_fixture_path") != GASFLUXES_SAMPLE_PATH or
                record.get("independent_reference_results_compared") is not False):
            fail("GASFLUXES_PINNED_SUBSET_IMPORT_INVALID")
    else:
        if (record.get("verification_state") != "LANDING_PAGE_VERIFIED_NOT_REPRODUCED" or
                record.get("external_bytes_imported") is not False or
                record.get("source_data_download_sha256") is not None):
            fail("FORGED_EXTERNAL_VALIDATION_STATUS")
    for key in ("title","organization","research_role","method"):
        if not isinstance(record.get(key),str) or not record[key] or len(record[key]) > 300:
            fail("EXTERNAL_SOURCE_CONTEXT_MISSING")
    if not valid_url(record.get("primary_url")):
        fail("SOURCE_URL_INVALID")
    if record.get("doi") is not None and (
            not isinstance(record["doi"],str) or not DOI.fullmatch(record["doi"])):
        fail("SOURCE_DOI_INVALID")
    requirements = record.get("requires")
    limits = record.get("limitations")
    if not isinstance(requirements,list) or not requirements or not isinstance(limits,list) or not limits:
        fail("REQUIRED_SCOPE_NOT_DOCUMENTED")
    if any(not isinstance(x,str) or not x or len(x)>300 for x in requirements+limits):
        fail("REQUIRED_SCOPE_INVALID")
    source_repo=record.get("github_repo")
    pinned=record.get("pinned_commit")
    if source_repo is not None:
        if (not valid_url(source_repo) or
                urlsplit(source_repo).hostname != "github.com" or
                not isinstance(pinned,str) or not HEX_SHA.fullmatch(pinned) or
                not isinstance(record.get("upstream_software_license"),str) or
                not record["upstream_software_license"]):
            fail("UNPINNED_EXTERNAL_CODE")
    elif pinned is not None or record.get("upstream_software_license") is not None:
        fail("CODE_HASH_WITHOUT_REPOSITORY")
    if record["kind"] == "INDEPENDENT_SOFTWARE" and source_repo is None:
        fail("INDEPENDENT_SOFTWARE_WITHOUT_PIN")
    if record["kind"] == "INDEPENDENT_FIELD_OBSERVATION":
        if (record.get("method") != "EDDY_COVARIANCE" or
                record.get("site_id") not in ("JP-Mse","KR-CRK","PH-RiF") or
                record.get("source_data_license") != "CC_BY_4_0_SITE_POLICY" or
                record.get("doi") is None):
            fail("FLUXNET_SITE_CONTEXT_INVALID")
    if "gimje" in record["id"].lower():
        fail("PRIMARY_DATA_MASQUERADING_AS_THIRD_PARTY")
    return record["id"]


def validate_registry(registry):
    if (not isinstance(registry,dict) or
            registry.get("schema") != "naft-ieee-independent-validation-candidate-registry-v1" or
            registry.get("policy") != "ONE_PINNED_GASFLUXES_BENCHMARK_SUBSET_IMPORTED_NO_UPSTREAM_CODE_EXECUTED" or
            registry.get("reference_dataset",{}).get("id") != SOURCE_ID_GIMJE or
            registry.get("reference_dataset",{}).get("sha256_chamber_original") != GIMJE_HASH):
        fail("INVALID_INDEPENDENCE_REGISTRY")
    rules=registry.get("rules",{})
    if (not isinstance(rules,dict) or len(rules)!=6 or
            rules.get("all_sources_meta_only") is not False or
            any(value is not True for key,value in rules.items() if key != "all_sources_meta_only")):
        fail("INDEPENDENCE_BOUNDARY_DISABLED")
    listed=registry.get("sources")
    if not isinstance(listed,list) or len(listed)!=len(EXPECTED_IDS):
        fail("SOURCE_COUNT_MISMATCH")
    ids=[validate_source(row) for row in listed]
    if set(ids)!=EXPECTED_IDS or len(ids)!=len(set(ids)):
        fail("DUPLICATE_OR_MISSING_INDEPENDENT_SOURCE")
    candidates=registry.get("claim_connections")
    if not isinstance(candidates,list) or len(candidates)!=len(EXPECTATIONS):
        fail("CLAIM_MAP_MISSING")
    seen=set()
    groups={}
    for entry in candidates:
        if not isinstance(entry,dict) or entry.get("claim_id") not in EXPECTATIONS:
            fail("UNKNOWN_CLAIM")
        claim=entry["claim_id"]
        if claim in seen:
            fail("DUPLICATE_CLAIM")
        seen.add(claim)
        status,kind=EXPECTATIONS[claim]
        references=entry.get("source_ids")
        if (entry.get("claim_status") != status or entry.get("kind") != kind or
                not isinstance(references,list) or not references or
                len(set(references))!=len(references) or
                not set(references).issubset(EXPECTED_IDS) or
                not isinstance(entry.get("needed"),list) or not entry["needed"]):
            fail("INVALID_CLAIM_OR_EVIDENCE_STATE")
        groups[claim]=list(references)
    if seen!=set(EXPECTATIONS):
        fail("INCOMPLETE_CLAIMS")
    # Cross-method tower records cannot be direct substitutes for sparse
    # daily source-chamber values. They must have their own claim group.
    for sid in ("FLUXNET_CH4_JP_MSE","FLUXNET_CH4_KR_CRK","FLUXNET_CH4_PH_RIF"):
        if sid not in groups["RICE_PADDY_CROSS_SITE_EXTERNAL_VALIDITY"]:
            fail("INDEPENDENT_SITE_ABSENT")
        for claim in ("CHAMBER_QC_DECISION_VARIABILITY","CHAMBER_FLUX_INDEPENDENT_ORACLE"):
            if sid in groups[claim]:
                fail("CROSS_METHOD_EQUIVALENCE_FORGED")
    if not {"GASFLUXES_CRAN_2026","HARVARD_FOREST_CHAMBER_FLUX"}.issubset(
            groups["CHAMBER_FLUX_INDEPENDENT_ORACLE"]):
        fail("NO_INDEPENDENT_ALGORITHM_CANDIDATES")
    readiness=registry.get("scientific_readiness",{})
    required=("independent_author_attestation","independent_raw_gimje_chamber_replay",
              "independent_cross_site_harmonization","water_management_causal_effect",
              "seasonal_ch4_integral_approved")
    if (not isinstance(readiness,dict) or any(readiness.get(k) is not False for k in required)
            or readiness.get("certified_tco2e","missing") is not None):
        fail("FORGED_THIRD_PARTY_CERTIFICATION")
    return registry


def load_readiness():
    spec=importlib.util.spec_from_file_location("gimje_existing_source_readiness",READINESS_SCRIPT)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.create_report()


def make_map(registry,readiness):
    registry=validate_registry(registry)
    if (not isinstance(readiness,dict) or
            readiness.get("schema") != "naft-ieee-gimje-seasonal-replay-readiness-v1" or
            readiness.get("status") != "BLOCKED_AWAITING_PRIMARY_MEASUREMENT_AND_QC_EVIDENCE" or
            readiness.get("original_file_sha256",{}).get("ch4.zip") != GIMJE_HASH or
            readiness.get("scientific_release_decision",{}).get("time_weighted_seasonal_replay_eligible") is not False or
            readiness.get("scientific_release_decision",{}).get("certified_tco2e","missing") is not None):
        fail("GIMJE_SOURCE_READINESS_NOT_SAFE")
    unmet=readiness.get("required_evidence")
    if (not isinstance(unmet,list) or len(unmet)!=9 or
            any(not isinstance(e,dict) or e.get("current_state")!="NOT_VERIFIED" for e in unmet)):
        fail("PRIMARY_EVIDENCE_HAS_UNVERIFIED_TRANSITION")
    # A pinned, 20-record excerpt of a separately GPL-licensed source was
    # imported. Verify actual local bytes, not merely registry metadata.
    fixture=ROOT/GASFLUXES_SAMPLE_PATH
    if fixture.is_symlink() or not fixture.is_file() or fixture.stat().st_size>3000:
        fail("IMPORTED_BENCHMARK_NOT_REGULAR")
    if hashlib.sha256(fixture.read_bytes()).hexdigest()!=GASFLUXES_SAMPLE_SHA:
        fail("IMPORTED_BENCHMARK_SOURCE_DRIFT")
    # This mapper checks physical source bytes but does NOT itself execute
    # reference R software or independent replay; those have separate CI.
    return {
        "schema":"naft-ieee-independent-corrob-candidates-v1",
        "status":"ONE_LICENSED_THIRD_PARTY_BENCHMARK_SUBSET_IMPORTED_REPLAY_VERIFIED_SEPARATELY",
        "gimje_source_doi":"10.5281/zenodo.17111992",
        "source_file_sha256":readiness["original_file_sha256"],
        "catalog_sha256":hashlib.sha256(
            (json.dumps(registry,ensure_ascii=False,sort_keys=True,separators=(",",":"))).encode("utf-8")
        ).hexdigest(),
        "third_party_references_count":len(registry["sources"]),
        "evidence_link_count":sum(len(x["source_ids"]) for x in registry["claim_connections"]),
        "external_dataset_files_downloaded":1,
        "imported_subset_sha256":GASFLUXES_SAMPLE_SHA,
        "imported_subset_records":20,
        "third_party_algorithms_executed":0,
        "independent_human_reviewer_signoffs":0,
        "source_record_availability_per_1000":readiness[
            "overall_numeric_token_availability"]["numeric_token_availability_per_1000_csv_rows"],
        "source_primary_evidence_gaps":len(unmet),
        "independent_claims":[{
            "claim_id":x["claim_id"],
            "claim_state":x["claim_status"],
            "candidate_source_ids":x["source_ids"],
            "missing_inputs":x["needed"],
            "independently_validated":False,
        } for x in registry["claim_connections"]],
        "external_references":[{
            "id":s["id"], "role":s["research_role"],"kind":s["kind"],
            "doi":s["doi"],"primary_url":s["primary_url"],
            "github_repo":s["github_repo"],"pinned_commit":s["pinned_commit"],
            "source_acquired":s["external_bytes_imported"],
            "source_independently_replayed":False,
            "source_license_snapshot":s["source_data_license"],
        } for s in registry["sources"]],
        "strict_boundaries":{
            "independent_field_level_validation":False,
            "cross_ec_chamber_value_equivalence":False,
            "approved_chamber_QC":False,
            "validated_seasonal_ch4":False,
            "certified_tco2e":None,
        },
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--output",type=pathlib.Path)
    p.add_argument("--registry",type=pathlib.Path,default=REGISTRY)
    args=p.parse_args()
    result=make_map(load_json(args.registry),load_readiness())
    payload=json.dumps(result,indent=2,ensure_ascii=False)+"\n"
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(payload,encoding="utf-8")
    else:
        print(payload,end="")


if __name__=="__main__":
    main()
