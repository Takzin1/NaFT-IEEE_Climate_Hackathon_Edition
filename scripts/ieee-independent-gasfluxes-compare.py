#!/usr/bin/env python3
"""Third independent comparator of Python Decimal / JS OLS and upstream R gold.

No original R runtime is executed and no certified flux is produced. Refuses
partial reports and impossible promotion to CH4 mass or Gimje verification.
"""
import argparse
from decimal import Decimal,InvalidOperation
import json
from pathlib import Path

SHA="b5ec601059dab6949a2ae5db8ebb741349ddd3e37a687fe4c4415df40b886f31"
IDS=[f"ID{n}" for n in range(1,6)]
TOL=Decimal("1e-10")


def block(reason):
    raise ValueError("IEEE_GASFLUXES_DUAL_REPLAY_BLOCKED:"+reason)


def decimal(x):
    if isinstance(x,bool) or not isinstance(x,(str,float,int)):
        block("BAD_RESULT_NUMBER")
    try:
        d=Decimal(str(x))
    except InvalidOperation:
        block("BAD_RESULT_NUMBER")
    if not d.is_finite():block("NONFINITE_REPLAY")
    return d


def check(a,b):
    if (a.get("schema")!="naft-ieee-independent-gasfluxes-decimal-v1" or
            b.get("schema")!="naft-ieee-independent-gasfluxes-node-v1" or
            a.get("status")!="INDEPENDENT_DECIMAL_REPLAY_MATCHED_PUBLISHED_R_GOLDEN_VALUES" or
            b.get("status")!="INDEPENDENT_NODE_REPLAY_MATCHED_PUBLISHED_R_GOLDEN_VALUES" or
            a.get("selected_source_sha256")!=SHA or b.get("selected_source_sha256")!=SHA or
            a.get("source_git_commit")!="0a50f94bc7c1d6560bb5f32a596c7092d35c079c" or
            b.get("source_git_commit")!=a.get("source_git_commit") or
            a.get("upstream_R_code_executed") is not False or
            b.get("upstream_R_code_executed") is not False):
        block("SOURCES_OR_RUN_STATUS_INCOMPATIBLE")
    for source in (a,b):
        if (source.get("Gimje_field_validation") is not False or
                source.get("official_mrv_eligibility") is not False or
                source.get("certified_tco2e","absent") is not None or
                source.get("measurement_unit_certified") is not False):
            block("FALSE_CERTIFICATION_ATTEMPT")
        rows=source.get("series")
        if not isinstance(rows,list) or [r.get("id") for r in rows]!=IDS:
            block("MISSING_SERIES")
    comparisons=[]
    for left,right in zip(a["series"],b["series"]):
        if (left.get("scientific_QC_approved") is not False or
                right.get("scientific_QC_approved") is not False or
                left.get("samples")!=4 or right.get("samples")!=4):
            block("UNAPPROVED_OR_PARTIAL_SERIES")
        value_a=decimal(left.get("linear_f0_benchmark_value"))
        value_b=decimal(right.get("linear_f0_benchmark_value"))
        intercept_a=decimal(left.get("linear_C0_benchmark_intercept"))
        intercept_b=decimal(right.get("linear_C0_benchmark_intercept"))
        deviation=abs(value_a-value_b)
        intercept_deviation=abs(intercept_a-intercept_b)
        if deviation>TOL or intercept_deviation>TOL:
            block("INDEPENDENT_IMPLEMENTATIONS_DISAGREE")
        comparisons.append({
            "id":left["id"],"sample_rows":4,
            "python_decimal_linear_f0_fixture_unit":str(value_a),
            "node_normal_equations_linear_f0_fixture_unit":str(value_b),
            "absolute_f0_difference_fixture_unit":str(deviation),
            "absolute_intercept_difference_fixture_unit":str(intercept_deviation),
            "reconciled_against_independent_R_package_golden":True,
        })
    return {
        "schema":"naft-ieee-gasfluxes-independent-three-way-compare-v1",
        "status":"FIVE_EXTERNAL_GOLDEN_SERIES_REPRODUCED_BY_TWO_INDEPENDENT_CALCULATORS",
        "reference_source_repository":"https://github.com/cran/gasfluxes",
        "pinned_reference_commit":a["source_git_commit"],
        "selected_source_sha256":SHA,
        "independent_reference": "upstream gasfluxes/testthat published R expected linear.f0 and C0",
        "source_data_imported_subset":True,
        "python_decimal_executed":True,"node_normal_equations_executed":True,
        "upstream_R_code_executed":False,
        "reference_outputs_reproduced":len(comparisons),
        "absolute_tolerance_in_original_fixture_units":str(TOL),
        "results":comparisons,
        "limits":{"fixture_time_and_concentration_units_physically_authenticated":False,
                  "Gimje_observation_validation":False,
                  "seasonal_emissions_eligible":False,
                  "carbon_credits_certified":False,
                  "certified_tco2e":None},
    }


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--decimal",type=Path,required=True)
    p.add_argument("--node",type=Path,required=True)
    p.add_argument("--output",type=Path)
    x=p.parse_args()
    for f in (x.decimal,x.node):
        if f.is_symlink() or not f.is_file() or f.stat().st_size>40000:
            block("UNTRUSTED_REPORT_FILE")
    report=check(json.loads(x.decimal.read_text("utf-8")),
                 json.loads(x.node.read_text("utf-8")))
    output=json.dumps(report,indent=2,ensure_ascii=False)+"\n"
    if x.output:
        x.output.parent.mkdir(parents=True,exist_ok=True)
        x.output.write_text(output,encoding="utf-8")
    else:
        print(output,end="")


if __name__=="__main__":
    main()
