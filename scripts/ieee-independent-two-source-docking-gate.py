#!/usr/bin/env python3
"""Final two-source engineering intake gate: do not conflate grades and claims."""
import argparse
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
RANKS=ROOT/"research/ieee-observation-datasets-2026-10-19/independent-benchmarks/intake-rank-a-minus-b-plus.json"
GAS_SHA="b5ec601059dab6949a2ae5db8ebb741349ddd3e37a687fe4c4415df40b886f31"
HARVARD_BLOB="ad55b3751cac9d2f09736f02b4aa82a65f4d6c11"
HARVARD_KEY_BLOB="ace95b610810c7df27c98adc6500b5c6258cbb5e"


def blocked(s):
    raise ValueError("IEEE_THIRD_PARTY_DOCK_BLOCKED:"+s)


def small_json(p):
    p=Path(p)
    if not p.is_file() or p.is_symlink() or p.stat().st_size>90000:
        blocked("UNSAFE_REPORT")
    return json.loads(p.read_text("utf-8"))


def inspect(gas,harvard,ranks):
    if ranks.get("schema")!="naft-ieee-third-party-intake-rank-protocol-v1":
        blocked("INVALID_GRADE_MANIFEST")
    candidates=ranks.get("candidates")
    if not isinstance(candidates,list) or len(candidates)!=2 or \
       [(x.get("rank"),x.get("source_id")) for x in candidates]!=[
         ("A-","GASFLUXES_CRAN_2026"),
         ("B+","HARVARD_FOREST_CHAMBER_FLUX")]:
        blocked("INVALID_INTAKE_GRADES")
    ga,ha=candidates
    if (ga.get("original_fixture_sha256")!=GAS_SHA or
            ga.get("imported_records")!=20 or ga.get("series")!=5 or
            ga.get("regulatory_claims_approved") is not False or
            ha.get("original_raw_git_blob")!=HARVARD_BLOB or
            ha.get("original_event_key_git_blob")!=HARVARD_KEY_BLOB or
            ha.get("imported_records")!=35 or
            ha.get("source_event_match_count")!=0 or
            ha.get("chamber_flux_approved") is not False):
        blocked("GRADE_EVIDENCE_NOT_SOURCE_BOUND")
    flags=ranks.get("safety_gates",{})
    if flags.get("instrument_data_not_Gimje") is not True or any(
            flags.get(k) is not False for k in (
                "raw_Harvard_CH4_mass_flux_computed","CH4_seasonal_integral_permitted",
                "independent_human_QC_attestation","MRV_credit_certified")) or \
       flags.get("certified_tco2e","missing") is not None:
        blocked("UNAUTHORIZED_INTAKE_PROMOTION")
    if (gas.get("schema")!="naft-ieee-gasfluxes-independent-three-way-compare-v1"
            or gas.get("status")!="FIVE_EXTERNAL_GOLDEN_SERIES_REPRODUCED_BY_TWO_INDEPENDENT_CALCULATORS"
            or gas.get("selected_source_sha256")!=GAS_SHA or
            gas.get("reference_outputs_reproduced")!=5 or
            gas.get("python_decimal_executed") is not True or
            gas.get("node_normal_equations_executed") is not True or
            gas.get("upstream_R_code_executed") is not False or
            gas.get("limits",{}).get("Gimje_observation_validation") is not False or
            gas.get("limits",{}).get("certified_tco2e","missing") is not None):
        blocked("INDEPENDENT_ALGORITHM_ORACLE_NOT_READY")
    if (harvard.get("schema")!="naft-ieee-harvard-independent-raw-trace-v1"
            or harvard.get("status")!="PINNED_EXTERNAL_RAW_TRACE_DESCRIPTIVE_CALCULATION_ONLY"
            or harvard.get("provenance",{}).get("raw_original_git_blob")!=HARVARD_BLOB
            or harvard.get("provenance",{}).get("event_key_original_git_blob")!=HARVARD_KEY_BLOB
            or harvard.get("source",{}).get("raw_trace_rows")!=35
            or harvard.get("source",{}).get("key_event_overlaps")!=[]
            or harvard.get("source",{}).get("literal_alarm_status_counts")!={"2":35}
            or harvard.get("human_acceptance_gates",{}).get("chamber_flux_eligible") is not False
            or harvard.get("human_acceptance_gates",{}).get("Gimje_field_validation") is not False
            or harvard.get("human_acceptance_gates",{}).get("certified_tco2e","missing") is not None):
        blocked("INDEPENDENT_HARVARD_QC_RELEASE_BOUNDARY")
    return {
        "schema":"naft-ieee-external-observation-dual-source-docking-v1",
        "status":"INDEPENDENT_SOURCE_REPLAY_A_MINUS_AND_RAW_EVENT_BLOCK_B_PLUS",
        "source_count":2,
        "intake_ranks":[
            {"rank":"A-","source":"CRAN gasfluxes",
             "imported_rows":20,"published_external_R_golden_series_replayed":5,
             "two_independent_calculators_compared":True,
             "actual_Gimje_flux_proven":False},
            {"rank":"B+","source":"Harvard Forest Picarro",
             "imported_rows":35,"matching_chamber_events":0,
             "literal_alarm_status":{"2":35},
             "descriptive_concentration_slope":harvard["independent_numerical_replay"][
                 "concentration_slope_per_second_literal"],
             "actual_mass_flux_calculated":False}
        ],
        "combined_conclusion":{
            "separate_original_publishers":True,
            "external_goldens_available_only_for_gasfluxes":True,
            "Harvard_event_and_QC_matched":False,
            "Gimje_original_chamber_independently_replayed":False,
            "seasonal_CH4_calculated":False,
            "independent_human_review_completed":False,
            "certified_tco2e":None},
    }


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--gasfluxes",type=Path,required=True)
    p.add_argument("--harvard",type=Path,required=True)
    p.add_argument("--output",type=Path)
    x=p.parse_args()
    data=inspect(small_json(x.gasfluxes),small_json(x.harvard),small_json(RANKS))
    payload=json.dumps(data,ensure_ascii=False,indent=2)+"\n"
    if x.output:
        x.output.parent.mkdir(parents=True,exist_ok=True)
        x.output.write_text(payload,encoding="utf-8")
    else:print(payload,end="")


if __name__=="__main__":
    main()
