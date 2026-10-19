#!/usr/bin/env python3
"""Independent Python-Decimal oracle for GS *training spreadsheet* formula cells.

No import from the JavaScript primary engine, no external dependencies, no
official carbon credit, and no translation to VCS/Verra or Japanese AG-005.
"""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext
import json
import re
import sys
from pathlib import Path

SCHEMA = "naft-ieee-gs-worksheet-replay-request-v1"
PROGRAM = "GS_AWD_TRAINING_2024"
SOURCE_FORMULAS = {
    "TIER_1_SIMPLIFIED": ("Tier 1_Simplified", "E5",
        "=E9*E10*E14/1000*E15*(1-E30)", ("E9","E10","E14","E15","E30"), "E30"),
    "TIER_2_COUNTRY_SPECIFIC": ("Tier 2_Country specific", "E4",
        "=(E8-E22)*(1-E60)", ("E8","E22","E60"), "E60"),
    "TIER_3_DIRECT": ("Tier 3_Direct measurement", "E4",
        "=(E8-E17)*(1-E49)", ("E8","E17","E49"), "E49")
}
RATE = re.compile(r"(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,12})?\Z")
TWELVE = Decimal("0.000000000001")


def require(condition, code):
    if not condition:
        raise ValueError("IEEE_GS_INDEPENDENT_ORACLE_BLOCKED:" + code)


def decimal_value(value, key):
    require(isinstance(value, str) and RATE.fullmatch(value) is not None,
            "INVALID_DECIMAL:" + key)
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("IEEE_GS_INDEPENDENT_ORACLE_BLOCKED:INVALID_DECIMAL:" + key) from exc


def evaluate(request):
    require(type(request) is dict and set(request) == {"schema","route","operands"}
            and request["schema"] == SCHEMA, "REQUEST_SCHEMA")
    route = request["route"]
    require(type(route) is dict and route.get("program") == PROGRAM,
            "PROGRAM_NOT_GS_TRAINING")
    lane = route.get("requested_lane")
    require(lane in SOURCE_FORMULAS, "LANE_NOT_SUPPORTED")
    sheet, cell, formula, fields, discount_field = SOURCE_FORMULAS[lane]
    operands = request["operands"]
    require(type(operands) is dict and set(operands) == set(fields),
            "UNEXPECTED_FORMULA_OPERANDS")
    with localcontext() as ctx:
        ctx.prec = 70
        v = {key: decimal_value(operands[key], key) for key in fields}
        require(Decimal(0) <= v[discount_field] <= Decimal(1), "INVALID_UNCERTAINTY_RATE")
        if lane == "TIER_1_SIMPLIFIED":
            raw = (((v["E9"] * v["E10"]) * v["E14"]) / Decimal(1000)
                   * v["E15"] * (Decimal(1) - v["E30"]))
        elif lane == "TIER_2_COUNTRY_SPECIFIC":
            raw = (v["E8"] - v["E22"]) * (Decimal(1) - v["E60"])
        else:
            raw = (v["E8"] - v["E17"]) * (Decimal(1) - v["E49"])
        rounded = raw.quantize(TWELVE, rounding=ROUND_HALF_UP)
    return {
        "lane":lane, "worksheet":sheet, "cell":cell,
        "formula":formula, "decimal_12_places":format(rounded, ".12f"),
        "status":"INDEPENDENT_REPRODUCTION_OF_TRAINING_ARITHMETIC_ONLY",
        "certified_tco2e":None
    }


def main(args):
    require(len(args) == 1, "USAGE_ORACLE_REQUEST_JSON")
    requests = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    if isinstance(requests, list):
        require(len(requests) <= 100, "TOO_MANY_FIXTURES")
        result = [evaluate(request) for request in requests]
    else:
        result = evaluate(requests)
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except (ValueError, KeyError, OSError, TypeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
