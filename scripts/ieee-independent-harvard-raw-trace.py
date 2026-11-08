#!/usr/bin/env python3
"""Independent raw-analyzer timing/QC gate for a pinned Harvard Forest sample.

No physical methane mass flux calculation; the source's published times-key
does not assign a chamber event to this entire trace. The nonzero alarm code
has no independently validated quality mapping. Both block any integration.
"""
import argparse
import csv
from datetime import datetime
from decimal import Decimal,localcontext,InvalidOperation
import hashlib
import io
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
B=ROOT/"research/ieee-observation-datasets-2026-10-19/independent-benchmarks/harvard-forest-raw-2023"
RAW=B/"Picarro_CH4_20230630_160808.dat"
KEY=B/"times_key2.csv"
RAW_BLOB="ad55b3751cac9d2f09736f02b4aa82a65f4d6c11"
KEY_BLOB="ace95b610810c7df27c98adc6500b5c6258cbb5e"
SOURCE_COMMIT="6f4ff6474a115e785002b7787001b43580585301"
COLS="DATE TIME FRAC_DAYS_SINCE_JAN1 FRAC_HRS_SINCE_JAN1 EPOCH_TIME ALARM_STATUS INST_STATUS CH4 CH4_dry CO2 CO2_dry H2O CavityPressure CavityTemp Battery_Current Battery_Temperature Battery_Voltage".split()


def reject(reason):
    raise ValueError("IEEE_HARVARD_RAW_BLOCKED:"+reason)


def source_read(p,expected,limit):
    p=Path(p)
    if not p.is_file() or p.is_symlink() or p.stat().st_size>limit:
        reject("UNSAFE_SOURCE_FILE")
    raw=p.read_bytes()
    blob=b"blob "+str(len(raw)).encode("ascii")+b"\x00"+raw
    if hashlib.sha1(blob).hexdigest()!=expected:
        reject("SOURCE_GIT_BLOB_DRIFT")
    if b"\x00" in raw:
        reject("SOURCE_CONTAINS_NUL")
    try:
        text=raw.decode("ascii")
    except UnicodeError:
        reject("NONASCII_SOURCE")
    return raw,text


def finite(s):
    if len(s)>80 or not s:
        reject("NUMERIC_TOKEN_INVALID")
    try: d=Decimal(s)
    except InvalidOperation: reject("NUMERIC_TOKEN_INVALID")
    if not d.is_finite():reject("NONFINITE")
    return d


def parse_raw(text):
    lines=text.strip().splitlines()
    if len(lines)!=36 or lines[0].split()!=COLS:
        reject("RAW_SCHEMA_OR_ROW_COUNT")
    data=[]
    previous=None
    for line in lines[1:]:
        cols=line.split()
        if len(cols)!=len(COLS):
            reject("RAW_ROW_WIDTH")
        r=dict(zip(COLS,cols))
        try:
            moment=datetime.fromisoformat(r["DATE"]+"T"+r["TIME"])
        except ValueError:reject("TIMESTAMP_INVALID")
        if previous is not None and moment<=previous:
            reject("TIMESTAMP_NONINCREASING")
        previous=moment
        data.append({
            "time":moment,
            "dry":finite(r["CH4_dry"]),
            "ch4":finite(r["CH4"]),
            "epoch":finite(r["EPOCH_TIME"]),
            "alarm":r["ALARM_STATUS"],
            "instrument_status":r["INST_STATUS"],
        })
    if len(data)!=35 or set(x["time"].date().isoformat() for x in data)!={"2023-06-30"}:
        reject("RAW_SOURCE_SCOPE")
    return data


def parse_event_key(text):
    reader=csv.DictReader(io.StringIO(text,newline=""),strict=True)
    if reader.fieldnames!=["Date","UniqueID","Rep_vol_L","comp_start_time","start_time","end_time"]:
        reject("KEY_HEADER")
    events=[]
    try:
        for r in reader:
            if not r or None in r or any(v is None for v in r.values()):
                reject("MALFORMED_EVENT_KEY")
            if finite(r["Rep_vol_L"])<=0:
                reject("NONPOSITIVE_REPLICATE_VOLUME")
            try:
                a=datetime.fromisoformat(r["Date"]+"T"+r["start_time"])
                z=datetime.fromisoformat(r["Date"]+"T"+r["end_time"])
            except ValueError: reject("INVALID_EVENT_TIME")
            if z<=a or not r["UniqueID"]:
                reject("BAD_EVENT_INTERVAL_OR_ID")
            events.append((r["UniqueID"],a,z))
    except csv.Error:
        reject("MALFORMED_EVENT_KEY")
    if len(events)!=24:
        reject("EVENT_KEY_LENGTH")
    return events


def slope_replay(records):
    origin=records[0]["time"]
    with localcontext() as cx:
        cx.prec=60
        xs=[]
        ys=[]
        for r in records:
            delta=r["time"]-origin
            x=Decimal(delta.days*86400+delta.seconds)+Decimal(delta.microseconds)/1000000
            xs.append(x)
            ys.append(r["dry"])
        n=Decimal(len(xs))
        xmean=sum(xs)/n
        ymean=sum(ys)/n
        ssx=sum((t-xmean)**2 for t in xs)
        if ssx<=0:reject("NO_ELAPSED_TIME_VARIANCE")
        slope=sum((a-xmean)*(b-ymean) for a,b in zip(xs,ys))/ssx
        intercept=ymean-slope*xmean
        if not all(x.is_finite() for x in (slope,intercept)):
            reject("NONFINITE_OLS")
        return {"concentration_slope_per_second_literal":str(slope),
                "concentration_intercept_literal":str(intercept),
                "trace_duration_seconds_literal":str(xs[-1]),
                "raw_CH4_dry_units":"UNCONFIRMED_SOURCE_INSTRUMENT_OUTPUT",
                "no_physical_flux_units":True}


def analyze(raw_path=RAW,key_path=KEY):
    raw,txt=source_read(raw_path,RAW_BLOB,25000)
    events_bytes,key_txt=source_read(key_path,KEY_BLOB,5000)
    rows=parse_raw(txt)
    events=parse_event_key(key_txt)
    start,end=rows[0]["time"],rows[-1]["time"]
    matches=[key for key,a,b in events if a<=end and b>=start]
    alarm={code:sum(r["alarm"]==code for r in rows)
           for code in sorted(set(x["alarm"] for x in rows))}
    status={code:sum(r["instrument_status"]==code for r in rows)
            for code in sorted(set(x["instrument_status"] for x in rows))}
    if len(matches)!=0 or alarm!={"2":35}:
        # Baseline changed relative to manually reviewed source; do not infer
        # new provenance or release flux calculation through a future file edit.
        reject("PINNED_RAW_QC_AND_EVENT_CONTEXT_CHANGED")
    return {
        "schema":"naft-ieee-harvard-independent-raw-trace-v1",
        "status":"PINNED_EXTERNAL_RAW_TRACE_DESCRIPTIVE_CALCULATION_ONLY",
        "provenance":{
            "source_repo":"https://github.com/Harvard-Forest-Ecosystems/chamber-flux",
            "source_git_commit":SOURCE_COMMIT,
            "raw_original_git_blob":RAW_BLOB,
            "event_key_original_git_blob":KEY_BLOB,
            "raw_sha256":hashlib.sha256(raw).hexdigest(),
            "event_key_sha256":hashlib.sha256(events_bytes).hexdigest(),
            "repository_top_level_license":"MIT (raw measurement file rights must be confirmed separately)",
            "imported_exact_original_bytes":True,
        },
        "source":{"rank":"B+","rank_type":"NAFT_INTERNAL_RESEARCH_INTAKE_PRIORITY_NOT_EXTERNAL_QC",
                  "date":"2023-06-30",
                  "raw_trace_rows":len(rows),
                  "source_event_key_rows":len(events),
                  "trace_start_literal":start.isoformat(),
                  "trace_end_literal":end.isoformat(),
                  "literal_alarm_status_counts":alarm,
                  "literal_instrument_status_counts":status,
                  "key_event_overlaps":matches,
                  "event_key_time_basis_and_timezones_approved":False,
                  "alarm_code_2_quality_interpretation_approved":False},
        "independent_numerical_replay":slope_replay(rows),
        "human_acceptance_gates":{
            "raw_originals_hash_verified":True,
            "source_event_matched":False,
            "sample_time_support_verified":False,
            "instrument_alarm_status_qc_approved":False,
            "gas_concentration_unit_calibrated":False,
            "analyzer_chamber_volumes_bound":False,
            "chamber_flux_eligible":False,
            "seasonal_CH4_eligible":False,
            "Gimje_field_validation":False,
            "certified_tco2e":None,
        },
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw",type=Path,default=RAW)
    parser.add_argument("--key",type=Path,default=KEY)
    parser.add_argument("--output",type=Path)
    args=parser.parse_args()
    payload=json.dumps(analyze(args.raw,args.key),indent=2,ensure_ascii=False)+"\n"
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_text(payload,encoding="utf-8")
    else:print(payload,end="")


if __name__=="__main__":
    main()
