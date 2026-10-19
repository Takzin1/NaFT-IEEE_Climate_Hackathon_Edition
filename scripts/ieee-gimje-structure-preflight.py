#!/usr/bin/env python3
"""Gimje original-file structural preflight. NO methane integration or approved QC.

Reads unchanged CC-BY source archives, checks pinned bytes with the already
reviewed original-file intake verifier, then enumerates ZIP CSV and XLSX
structure without extracting files. Deterministic, offline, stdlib only.
"""
import argparse
import csv
import hashlib
import importlib.util
import io
import json
import pathlib
import re
import stat
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = ROOT / "research/ieee-observation-datasets-2026-10-19/originals/KR_GIMJE_DAILY_2022_2024"
INTAKE = ROOT / "scripts/ieee-research-original-acquire.py"
DATASET = "KR_GIMJE_DAILY_2022_2024"
COLUMNS = ("DAT", "tavg", "course_type", "ch4_flux", "rain_mm")
NUMERIC = {"DAT", "tavg", "ch4_flux", "rain_mm"}
DECIMAL = re.compile(r"^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[Ee][+-]?[0-9]+)?$")
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACK_NS = "http://schemas.openxmlformats.org/package/2006/relationships"


def fail(message):
    raise ValueError("IEEE_GIMJE_PREFLIGHT_BLOCKED:" + message)


def digest(blob):
    return hashlib.sha256(blob).hexdigest()


def archive_members(blob, *, limit_total=8_000_000, limit_member=1_000_000):
    """Read bounded files only, never call extract/extractall."""
    if len(blob) > 2_000_000:
        fail("ARCHIVE_COMPRESSED_SIZE")
    try:
        archive = zipfile.ZipFile(io.BytesIO(blob))
        entries = archive.infolist()
        if len(entries) == 0 or len(entries) > 500:
            fail("ARCHIVE_ENTRY_COUNT")
        seen = set()
        total = 0
        values = {}
        for entry in entries:
            name = entry.filename
            parts = pathlib.PurePosixPath(name).parts
            if (not name or name.startswith("/") or "\\" in name or "\x00" in name or
                    ".." in parts or name.startswith("./") or len(name) > 250 or
                    (entry.flag_bits & 1) or
                    stat.S_ISLNK(entry.external_attr >> 16)):
                fail("ARCHIVE_ENTRY_UNSAFE")
            if name in seen:
                fail("ARCHIVE_DUPLICATE_MEMBER")
            seen.add(name)
            if entry.is_dir():
                continue
            if entry.compress_type not in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
                fail("ARCHIVE_UNSUPPORTED_COMPRESSION")
            if (entry.file_size > limit_member or entry.file_size < 0 or
                    entry.file_size > 500 * max(entry.compress_size, 1)):
                fail("ARCHIVE_MEMBER_BOMB")
            total += entry.file_size
            if total > limit_total:
                fail("ARCHIVE_TOTAL_BOMB")
            raw = archive.read(entry)
            if len(raw) != entry.file_size:
                fail("ARCHIVE_ENTRY_SIZE_CHANGED")
            values[name] = raw
        return values
    except (zipfile.BadZipFile, RuntimeError, EOFError, OSError) as exc:
        fail("ARCHIVE_MALFORMED:" + type(exc).__name__)


def numeric_token(token):
    return bool(DECIMAL.fullmatch(token.strip())) and len(token.strip()) <= 80


def scan_csv_member(name, raw):
    if not name.startswith("ch4/") or not name.endswith(".csv"):
        fail("UNEXPECTED_CSV_MEMBER")
    if len(raw) > 500_000:
        fail("CSV_TOO_LARGE")
    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeError:
        fail("CSV_INVALID_UTF8")
    if "\x00" in decoded:
        fail("CSV_NUL")
    rows = csv.reader(io.StringIO(decoded, newline=""), strict=True)
    try:
        header = next(rows)
    except (StopIteration, csv.Error):
        fail("CSV_MISSING_HEADER")
    if tuple(header) != COLUMNS:
        fail("CSV_UNEXPECTED_HEADER:" + name)
    counts = {"blank": {k: 0 for k in COLUMNS},
              "non_numeric": {k: 0 for k in NUMERIC}}
    dat_tokens = set()
    duplicate_dat = 0
    n = 0
    try:
        for row in rows:
            if len(row) != len(COLUMNS):
                fail("CSV_ROW_WIDTH:" + name)
            n += 1
            if n > 10000:
                fail("CSV_TOO_MANY_ROWS")
            for key, token in zip(COLUMNS, row):
                if not token.strip():
                    counts["blank"][key] += 1
                elif key in NUMERIC and not numeric_token(token):
                    counts["non_numeric"][key] += 1
            dat = row[0].strip()
            if dat:
                if dat in dat_tokens:
                    duplicate_dat += 1
                dat_tokens.add(dat)
    except csv.Error:
        fail("CSV_MALFORMED:" + name)
    return {"member": name, "original_member_sha256": digest(raw),
            "row_count": n, "header": list(COLUMNS),
            "blank_cells_by_column": counts["blank"],
            "non_numeric_cells_by_expected_numeric_column": counts["non_numeric"],
            "duplicate_DAT_tokens": duplicate_dat}


def scan_ch4_zip(blob):
    entries = archive_members(blob)
    names = sorted(k for k in entries if k.endswith(".csv"))
    if len(names) != 60 or any(not x.startswith("ch4/") for x in names):
        fail("CHAMBER_CSV_MEMBER_SET")
    if any(not x.endswith(".csv") for x in entries):
        fail("CHAMBER_UNEXPECTED_EXTRA_FILES")
    scans = [scan_csv_member(name, entries[name]) for name in names]
    return {"csv_members": len(scans),
            "csv_data_rows_total": sum(row["row_count"] for row in scans),
            "members": scans}


def parse_xml(blob, name):
    if len(blob) > 1_000_000 or b"<!DOCTYPE" in blob.upper() or b"<!ENTITY" in blob.upper():
        fail("XLSX_XML_UNSAFE:" + name)
    try:
        return ET.fromstring(blob)
    except ET.ParseError:
        fail("XLSX_XML_INVALID:" + name)


def workbook_cell(cell, strings):
    typ = cell.get("t")
    if typ == "s":
        v = cell.find("{" + MAIN_NS + "}v")
        if v is None or not (v.text or "").isdigit():
            fail("XLSX_SHARED_STRING_REFERENCE")
        idx = int(v.text)
        if idx >= len(strings):
            fail("XLSX_SHARED_STRING_REFERENCE")
        return strings[idx]
    if typ == "inlineStr":
        return "".join((node.text or "") for node in
                       cell.findall(".//{" + MAIN_NS + "}t"))
    v = cell.find("{" + MAIN_NS + "}v")
    return "" if v is None else (v.text or "")


def scan_workbook(blob):
    entries = archive_members(blob, limit_total=7_000_000, limit_member=1_000_000)
    for name in entries:
        if name.endswith(("vbaProject.bin", ".exe", ".js")) or "externalLinks/" in name:
            fail("XLSX_ACTIVE_OR_EXTERNAL_CONTENT")
    root = parse_xml(entries.get("xl/workbook.xml", b""), "workbook")
    relroot = parse_xml(entries.get("xl/_rels/workbook.xml.rels", b""), "relationships")
    rels = {}
    for rel in relroot.findall("{" + PACK_NS + "}Relationship"):
        if rel.get("TargetMode") == "External":
            fail("XLSX_EXTERNAL_RELATIONSHIP")
        target = rel.get("Target", "")
        if target.startswith("/xl/worksheets/"):
            target = target[1:]
        elif target.startswith("worksheets/"):
            target = "xl/" + target
        else:
            continue
        if ".." in pathlib.PurePosixPath(target).parts:
            fail("XLSX_RELATIONSHIP_TRAVERSAL")
        rels[rel.get("Id")] = target
    shared = []
    if "xl/sharedStrings.xml" in entries:
        string_root = parse_xml(entries["xl/sharedStrings.xml"], "strings")
        for item in string_root.findall("{" + MAIN_NS + "}si"):
            shared.append("".join((node.text or "") for node in
                                  item.findall(".//{" + MAIN_NS + "}t")))
        if len(shared) > 20000:
            fail("XLSX_SHARED_STRING_COUNT")
    sheets = []
    for item in root.findall(".//{" + MAIN_NS + "}sheet"):
        name = item.get("name", "")
        target = rels.get(item.get("{" + REL_NS + "}id"))
        if not name or len(name) > 80 or target not in entries:
            fail("XLSX_SHEET_REFERENCE")
        sheet_root = parse_xml(entries[target], name)
        rows = sheet_root.findall(".//{" + MAIN_NS + "}sheetData/{" + MAIN_NS + "}row")
        if len(rows) > 20000:
            fail("XLSX_ROW_LIMIT")
        headers = []
        if rows:
            for cell in rows[0].findall("{" + MAIN_NS + "}c")[:64]:
                value = workbook_cell(cell, shared)
                if len(value) > 512:
                    fail("XLSX_HEADER_TOO_LONG")
                headers.append({"cell": cell.get("r", ""), "literal": value})
        sheets.append({"sheet": name, "worksheet_path": target,
                       "populated_row_elements": len(rows),
                       "first_row_cells": headers})
    if not sheets:
        fail("XLSX_NO_WORKSHEETS")
    return {"sheet_count": len(sheets), "sheets": sheets,
            "shared_string_count": len(shared)}


def load_intake():
    spec = importlib.util.spec_from_file_location("gimje_acquire", INTAKE)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def create_report(source_dir=BASE):
    """Integrity verified both before AND after reading the published archives."""
    source_dir = pathlib.Path(source_dir)
    mod = load_intake()
    before = mod.verify_local(DATASET, source_dir)
    raw_zip = (source_dir / "ch4.zip").read_bytes()
    raw_xlsx = (source_dir / "input_fields_meta.xlsx").read_bytes()
    zip_audit = scan_ch4_zip(raw_zip)
    xlsx_audit = scan_workbook(raw_xlsx)
    after = mod.verify_local(DATASET, source_dir)
    if (before != after or
            digest((source_dir / "ch4.zip").read_bytes()) != digest(raw_zip) or
            digest((source_dir / "input_fields_meta.xlsx").read_bytes()) != digest(raw_xlsx)):
        fail("SOURCE_CHANGED_DURING_PREFLIGHT")
    return {
        "schema": "naft-ieee-gimje-structure-preflight-v1",
        "dataset_id": DATASET,
        "source_doi": "10.5281/zenodo.17111992",
        "status": "SOURCE_BYTES_MATCHED_STRUCTURE_PARSED_QC_UNREVIEWED",
        "source_file_sha256": {"ch4.zip": digest(raw_zip),
                               "input_fields_meta.xlsx": digest(raw_xlsx)},
        "chamber_csv_archive": zip_audit,
        "field_metadata_workbook": xlsx_audit,
        "scientific_blockers": [
            "DAT must be mapped to real dates from publisher-defined transplant date and field ID",
            "workbook field and treatment join keys require verified data dictionary",
            "ch4_flux physical units, sampling interval and chamber method must be reviewed",
            "raw quality control and missing-data semantics are not yet approved",
            "no automatic emissions integration or extrapolation allowed"
        ],
        "trust": {"publisher_signature_authenticated": False,
                  "dat_calendar_mapping_approved": False,
                  "site_specific_qc_completed": False,
                  "validated_observed_ghg_flux": False,
                  "certified_tco2e": None}
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=pathlib.Path, default=BASE)
    parser.add_argument("--output", type=pathlib.Path)
    args = parser.parse_args()
    report = create_report(args.source)
    content = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(content, encoding="utf-8")
    else:
        print(content, end="")


if __name__ == "__main__":
    main()
