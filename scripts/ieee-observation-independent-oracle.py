#!/usr/bin/env python3
"""Independent per-input IEEE methane interval oracle (Decimal, UTC; stdlib only).

All input provenance is user-supplied/unverified; NO publisher or AG-005 attestation.
Does not import the JavaScript implementation or its calculated output.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP, localcontext
from hashlib import sha256
from pathlib import Path
import json
import re
import sys

DAY = 86400
ADAPTERS = {
    "INTERVAL_MG_CH4_M2_DAY_V1": ("mg_CH4_m2_day", "INTERVAL_MEAN_FLUX_RATE", "CH4_MOLECULAR", 604800, None),
    "DAILY_G_CH4_M2_DAY_V1": ("g_CH4_m2_day", "DAILY_INTERVAL_MEAN_FLUX_RATE", "CH4_MOLECULAR", DAY, DAY),
    "EDDY_NMOL_CH4_M2_S_V1": ("nmol_CH4_m2_s", "EDDY_INTERVAL_MEAN_FLUX_RATE", "CH4_MOLECULAR", 3600, None),
    "EDDY_UMOL_CH4_M2_S_V1": ("umol_CH4_m2_s", "EDDY_INTERVAL_MEAN_FLUX_RATE", "CH4_MOLECULAR", 3600, None),
    "DAILY_G_CH4_C_M2_DAY_V1": ("g_CH4_C_m2_day", "DAILY_INTERVAL_MEAN_FLUX_RATE", "CH4_C", DAY, DAY),
}
RATE = re.compile(r"-?(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,6})?\Z")
UTC = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z\Z")
HEADER = "start_utc,end_utc,value,qc_status"
REQUIRED = ("source_uri", "site_id", "plot_id", "treatment",
            "measurement_method", "source_license_status", "time_basis")


def require(condition, label):
    if not condition:
        raise ValueError(label)


def time_utc(s):
    require(isinstance(s, str) and UTC.fullmatch(s) is not None, "PY_INVALID_UTC")
    try:
        moment = datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        require(moment.strftime("%Y-%m-%dT%H:%M:%SZ") == s, "PY_INVALID_UTC_CALENDAR")
        return moment
    except ValueError as exc:
        raise ValueError("PY_INVALID_UTC_CALENDAR") from exc


def fixed(value, digits):
    # Python Decimal rounds half away from zero (ROUND_HALF_UP), same as IEEE JS.
    result = value.quantize(Decimal(1).scaleb(-digits), rounding=ROUND_HALF_UP)
    if result == 0:
        result = abs(result)
    return format(result, f".{digits}f")


def mass_term(rate, seconds, adapter):
    r = Decimal(rate)
    seconds = Decimal(seconds)
    if adapter == "INTERVAL_MG_CH4_M2_DAY_V1":
        return r * seconds / DAY
    if adapter == "DAILY_G_CH4_M2_DAY_V1":
        return r * seconds * 1000 / DAY
    if adapter == "EDDY_NMOL_CH4_M2_S_V1":
        return r * seconds * Decimal("16.04") / 1000000
    if adapter == "EDDY_UMOL_CH4_M2_S_V1":
        return r * seconds * Decimal("16.04") / 1000
    if adapter == "DAILY_G_CH4_C_M2_DAY_V1":
        return r * seconds * 1000 * Decimal(16) / (Decimal(12) * DAY)
    raise ValueError("PY_UNSUPPORTED_ADAPTER")


def evaluate(manifest_bytes, csv_bytes):
    require(isinstance(manifest_bytes, bytes) and 2 <= len(manifest_bytes) <= 100000, "PY_MANIFEST_SIZE")
    require(isinstance(csv_bytes, bytes) and 1 <= len(csv_bytes) <= 2000000, "PY_CSV_SIZE")
    try:
        m = json.loads(manifest_bytes.decode("utf-8", errors="strict"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("PY_MANIFEST_JSON") from exc
    require(isinstance(m, dict) and m.get("schema") == "naft-observation-series-v2", "PY_SCHEMA")
    require(m.get("csv_sha256") == sha256(csv_bytes).hexdigest(), "PY_INPUT_SHA256")
    adapter = m.get("adapter_id")
    require(isinstance(adapter, str) and adapter in ADAPTERS, "PY_ADAPTER")
    unit, semantics, basis, maximum, exact = ADAPTERS[adapter]
    require(m.get("unit") == unit and m.get("sampling_semantics") == semantics and
            m.get("mass_basis") == basis, "PY_UNIT_SEMANTICS_OR_BASIS")
    require(m.get("gas") == "CH4" and m.get("country") in ("JP", "KR", "TW", "VN", "PH", "CN") and
            m.get("gap_fill_policy") == "FORBID" and m.get("time_basis") == "UTC_EXPLICIT_INTERVALS",
            "PY_JURISDICTION_GAS_TIME_POLICY")
    require(m.get("data_class") in ("SYNTHETIC", "USER_SUPPLIED_UNVERIFIED"), "PY_UNVERIFIED_DATA_ONLY")
    for key in ("original_publisher_bytes_verified", "conditions_independently_matched",
                "official_eligibility_verified"):
        require(m.get(key) is False, "PY_UNTRUSTED_ATTESTATION")
    for key in REQUIRED:
        value = m.get(key)
        require(isinstance(value, str) and value.strip() and len(value) <= 512, "PY_REQUIRED_METADATA")
    if adapter.startswith("EDDY_"):
        require(m.get("molar_mass_g_mol") == "16.04", "PY_MOLAR_MASS")
    start = time_utc(m.get("observation_start_utc"))
    end = time_utc(m.get("observation_end_utc"))
    window = int((end - start).total_seconds())
    require(0 < window <= 366 * DAY, "PY_OBSERVATION_WINDOW")
    try:
        source = csv_bytes.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ValueError("PY_INVALID_UTF8") from exc
    require(not source.startswith("\ufeff") and "\r" not in source and "\x00" not in source and
            source.endswith("\n"), "PY_CSV_ENCODING")
    lines = source[:-1].split("\n")
    require(2 <= len(lines) <= 10001 and lines[0] == HEADER, "PY_CSV_HEADER_OR_ROWS")
    observed = excluded = gap = counted = accepted = rejected = imputed = 0
    total = Decimal(0)
    previous = start
    with localcontext() as ctx:
        ctx.prec = 60
        for line in lines[1:]:
            cells = line.split(",")
            require(len(cells) == 4, "PY_CSV_COLUMNS")
            a, b, raw, qc = cells
            begin, finish = time_utc(a), time_utc(b)
            require(begin >= previous, "PY_OVERLAP_OR_REORDER")
            duration = int((finish - begin).total_seconds())
            require(begin < end and finish <= end and 0 < duration <= maximum, "PY_INTERVAL_OUTSIDE_WINDOW")
            if exact is not None:
                require(duration == exact, "PY_DAILY_INTERVAL")
            gap += int((begin - previous).total_seconds())
            if qc in ("OBSERVED_GOOD", "OBSERVED_ACCEPTABLE"):
                require(RATE.fullmatch(raw) is not None, "PY_INVALID_RATE")
                observed += duration
                accepted += 1
                total += mass_term(raw, duration, adapter)
            elif qc in ("MISSING", "IMPUTED_RESEARCH"):
                require(raw == "", "PY_EXCLUDED_RATE_MUST_BE_BLANK")
                excluded += duration
                rejected += 1
                if qc == "IMPUTED_RESEARCH":
                    imputed += 1
            else:
                raise ValueError("PY_QC_UNKNOWN")
            counted += 1
            previous = finish
        gap += int((end - previous).total_seconds())
        require(observed + excluded + gap == window, "PY_COVERAGE_INCONSISTENT")
        status = ("NO_OBSERVATION" if not observed else
                  "COMPLETE_OBSERVED" if observed == window else "PARTIAL_OBSERVED")
        mg = fixed(total, 9) if observed else None
        kg = fixed(total / 100, 9) if observed else None
        coverage = fixed(Decimal(observed) * 100 / Decimal(window), 6)
    return {
        "adapter_id": adapter, "data_class": m["data_class"],
        "input_unit": unit, "input_mass_basis": basis,
        "coverage_status": status, "observed_seconds": str(observed),
        "excluded_qc_seconds": str(excluded), "unrepresented_gap_seconds": str(gap),
        "window_seconds": str(window), "measured_coverage_percent": coverage,
        "observed_only_integral_mg_ch4_m2": mg, "observed_only_integral_kg_ch4_ha": kg,
        "full_window_total_mg_ch4_m2": mg if status == "COMPLETE_OBSERVED" else None,
        "full_window_total_kg_ch4_ha": kg if status == "COMPLETE_OBSERVED" else None,
        "record_count": counted, "accepted_rows": accepted, "excluded_rows": rejected,
        "research_imputed_rows_excluded": imputed,
        "csv_digest_sha256": sha256(csv_bytes).hexdigest(),
        "publisher_bytes_independently_attested": False,
        "certified_tco2e": None, "uncertainty_interval": None, "causal_attribution": None
    }


def bounded_file(name, limit):
    f = Path(name)
    require(f.is_file() and 0 < f.stat().st_size <= limit, "PY_FILE_SIZE")
    return f.read_bytes()


def main():
    require(len(sys.argv) == 3, "USAGE: python3 scripts/ieee-observation-independent-oracle.py MANIFEST.json INPUT.csv")
    result = evaluate(bounded_file(sys.argv[1], 100000),
                      bounded_file(sys.argv[2], 2000000))
    print(json.dumps(result, sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as exc:
        print("INDEPENDENT_OBSERVATION_REJECTED:" + str(exc), file=sys.stderr)
        sys.exit(1)
