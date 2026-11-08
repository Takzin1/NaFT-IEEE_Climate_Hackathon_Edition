#!/usr/bin/env python3
"""Recalculate five independently published gasfluxes benchmark series.

Python Decimal OLS is independent of the upstream R implementation, and
independent of our separate JavaScript closed-form ordinary least squares.
The benchmark is not calibrated methane mass or a Gimje-site observation.
"""
import argparse
from collections import defaultdict
import csv
from decimal import Decimal, InvalidOperation, localcontext
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCH = ROOT/"research/ieee-observation-datasets-2026-10-19/independent-benchmarks/gasfluxes-v0.7-2"
MANIFEST = BENCH/"oracle.json"
DATA = BENCH/"fluxmeas-first-five.csv"


def reject(reason):
    raise ValueError("IEEE_GASFLUXES_DECIMAL_BLOCKED:"+reason)


def decimal_field(text):
    if not isinstance(text,str) or not text or len(text)>80:
        reject("EMPTY_OR_OVERSIZED_NUMERIC_TOKEN")
    try:
        d=Decimal(text)
    except InvalidOperation:
        reject("NOT_NUMERIC")
    if not d.is_finite():
        reject("NONFINITE_NUMERIC")
    return d


def read_rows(raw, expected_sha):
    if not isinstance(raw,bytes) or len(raw)>3000:
        reject("BENCHMARK_BYTE_LIMIT")
    if hashlib.sha256(raw).hexdigest()!=expected_sha:
        reject("PINNED_BENCHMARK_HASH_MISMATCH")
    if b"\r\n" not in raw or b"\x00" in raw:
        reject("PINNED_SOURCE_FORMAT")
    try:
        csv_text=raw.decode("ascii")
        rows=list(csv.DictReader(io.StringIO(csv_text,newline=""),delimiter=";",strict=True))
    except (UnicodeError,csv.Error):
        reject("INVALID_BENCHMARK_CSV")
    if not rows or len(rows)!=20:
        reject("BENCHMARK_ROW_COUNT")
    if set(rows[0])!={"ID","V","A","time","C"}:
        reject("BENCHMARK_COLUMNS")
    grouped=defaultdict(list)
    for r in rows:
        if set(r)!={"ID","V","A","time","C"} or None in r or any(v is None for v in r.values()):
            reject("BENCHMARK_RECORD_WIDTH")
        identifier=r["ID"]
        if identifier not in ("ID1","ID2","ID3","ID4","ID5"):
            reject("UNKNOWN_SERIES")
        grouped[identifier].append((decimal_field(r["V"]),decimal_field(r["A"]),
                                    decimal_field(r["time"]),decimal_field(r["C"])))
    if len(grouped)!=5 or any(len(records)!=4 for records in grouped.values()):
        reject("BENCHMARK_SERIES_PARTITION")
    return dict(grouped)


def decimal_replay(series):
    out=[]
    with localcontext() as precision:
        precision.prec=60
        for name in sorted(series,key=lambda s:int(s[2:])):
            row=series[name]
            volumes={point[0] for point in row}
            areas={point[1] for point in row}
            if len(volumes)!=1 or len(areas)!=1:
                reject("INCONSISTENT_CHAMBER_VOLUME_OR_AREA")
            volume=next(iter(volumes))
            area=next(iter(areas))
            if area<=0 or volume<=0:
                reject("NONPOSITIVE_CHAMBER_GEOMETRY")
            xs=[p[2] for p in row]
            ys=[p[3] for p in row]
            if len(xs)!=len(set(xs)):
                reject("DUPLICATE_OBSERVATION_TIME")
            if any(x<0 or x>1 for x in xs):
                reject("TIME_OUTSIDE_PINNED_SAMPLE")
            n=Decimal(len(xs))
            mx=sum(xs)/n
            my=sum(ys)/n
            covariance=sum((x-mx)*(y-my) for x,y in zip(xs,ys))
            spread=sum((x-mx)**2 for x in xs)
            if spread<=0:
                reject("TIME_SPREAD_ZERO")
            slope=covariance/spread
            intercept=my-slope*mx
            flux=slope*volume/area
            out.append({
                "id":name,"samples":len(xs),
                "time_unit":"AS_PUBLISHED_IN_GASFLUXES_FIXTURE",
                "concentration_unit":"UNSPECIFIED_SOURCE_FIXTURE_UNIT",
                "volume_area_ratio_literal":str(volume/area),
                "concentration_trend_slope":str(slope),
                "linear_f0_benchmark_value":str(flux),
                "linear_C0_benchmark_intercept":str(intercept),
                "scientific_QC_approved":False,
            })
    return out


def load_manifest(path=MANIFEST):
    p=Path(path)
    if p.is_symlink() or not p.is_file() or p.stat().st_size>20000:
        reject("MANIFEST_NOT_REGULAR_OR_TOO_LARGE")
    obj=json.loads(p.read_text("utf-8"))
    if (obj.get("schema")!="naft-ieee-gasfluxes-linear-oracle-v1" or
            obj.get("dataset",{}).get("pinned_commit")!="0a50f94bc7c1d6560bb5f32a596c7092d35c079c" or
            obj.get("dataset",{}).get("full_source_blob_sha")!="ff5e9982b5c24583342ce6e358aae368b6a710ea" or
            obj.get("dataset",{}).get("fixture_sha256")!="b5ec601059dab6949a2ae5db8ebb741349ddd3e37a687fe4c4415df40b886f31" or
            obj.get("dataset",{}).get("source_license")!="GPL-2.0-or-later" or
            obj.get("reference",{}).get("test_blob_sha")!="410dd826565f137fc5c7abfff16c3d06b935aa51" or
            obj.get("reference",{}).get("reference_upstream_algorithm_executed_in_naft") is not False or
            obj.get("safety",{}).get("method_applied_to_Gimje") is not False or
            obj.get("safety",{}).get("certified_tco2e","not-null") is not None):
        reject("MANIFEST_TRUST_BOUNDARY_INVALID")
    return obj


def replay(data=DATA, manifest=MANIFEST):
    meta=load_manifest(manifest)
    data=Path(data)
    if data.is_symlink() or not data.is_file():
        reject("FIXTURE_NOT_REGULAR")
    source=data.read_bytes()
    records=read_rows(source,meta["dataset"]["fixture_sha256"])
    result=decimal_replay(records)
    upstream=meta["reference"]["expected_linear_f0_by_series"]
    if len(upstream)!=5 or [x["id"] for x in upstream]!=[x["id"] for x in result]:
        reject("REFERENCE_GOLDEN_SET")
    with localcontext() as ctx:
        ctx.prec=60
        for got,pinned in zip(result,upstream):
            if (abs(Decimal(got["linear_f0_benchmark_value"])-decimal_field(pinned["f0"]))>Decimal("0.0000000001") or
                    abs(Decimal(got["linear_C0_benchmark_intercept"])-decimal_field(pinned["C0"]))>Decimal("0.0000000001")):
                reject("UPSTREAM_R_GOLDEN_DIFFERENCE")
    return {
        "schema":"naft-ieee-independent-gasfluxes-decimal-v1",
        "status":"INDEPENDENT_DECIMAL_REPLAY_MATCHED_PUBLISHED_R_GOLDEN_VALUES",
        "source_git_commit":meta["dataset"]["pinned_commit"],
        "source_blob_sha":meta["dataset"]["full_source_blob_sha"],
        "selected_source_sha256":hashlib.sha256(source).hexdigest(),
        "upstream_expected_values_source":meta["reference"]["test_path"],
        "reference_oracle_version":"gasfluxes-0.7-2",
        "independent_calculation":"PYTHON_DECIMAL_CENTERED_COVARIANCE",
        "upstream_R_code_executed":False,
        "series":result,
        "comparison_tolerance":"1e-10 for linear.f0 and linear.C0 fixture units",
        "measurement_unit_certified":False,
        "Gimje_field_validation":False,
        "official_mrv_eligibility":False,
        "certified_tco2e":None,
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--data",type=Path,default=DATA)
    p.add_argument("--output",type=Path)
    options=p.parse_args()
    output=json.dumps(replay(options.data),ensure_ascii=False,indent=2)+"\n"
    if options.output:
        options.output.parent.mkdir(parents=True,exist_ok=True)
        options.output.write_text(output,encoding="utf-8")
    else:
        print(output,end="")


if __name__=="__main__":
    main()
