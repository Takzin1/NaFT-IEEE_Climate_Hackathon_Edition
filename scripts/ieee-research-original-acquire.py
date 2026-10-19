#!/usr/bin/env python3
"""Explicit research-only original file intake. Never run from the MRV compiler.
Only Zenodo CC-BY-4.0/CC0 source files may be redistributed, after publisher
metadata, MD5, prior SHA-256, filename and size checks. Site QC is NOT inferred.
"""
import argparse
import hashlib
import json
import pathlib
import re
import tempfile
import urllib.request
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "research/ieee-observation-datasets-2026-10-19/intake-catalog.json"
ALLOWED_RIGHTS = {"cc-by-4.0", "cc0-1.0", "cc-zero", "cc0"}
MAX_FILE_BYTES = 2_000_000
HEX_SHA256 = re.compile(r"^[0-9a-f]{64}$")
ZENODO_ID = re.compile(r"^[1-9][0-9]{0,15}$")
RECEIPT_KEYS = {
    "schema", "dataset_id", "doi", "license_as_claimed_by_zenodo_record",
    "license_metadata_snapshot_reviewed_for_redistribution",
    "record_metadata_sha256", "files", "status",
    "independent_original_publisher_signature_authenticated",
    "source_specific_qc_completed", "scientific_replication_verified",
    "certified_tco2e",
}
FILE_RECEIPT_KEYS = {"filename", "sha256", "md5", "size_bytes"}
UA = "NaFT-IEEE-source-intake/1.0 (public-research-integrity-only)"


def blocked(reason):
    raise ValueError("IEEE_DATASET_INTAKE_BLOCKED:" + reason)


def fetch_bytes(url, limit=MAX_FILE_BYTES):
    if not url.startswith("https://zenodo.org/api/records/"):
        blocked("NON_ZENODO_URL")
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json, */*"})
    with urllib.request.urlopen(request, timeout=35) as stream:
        blob = stream.read(limit + 1)
    if len(blob) > limit:
        blocked("DOWNLOAD_SIZE_LIMIT")
    return blob


def load_catalog(path=CATALOG):
    data = json.loads(pathlib.Path(path).read_text("utf-8"))
    if data.get("schema") != "naft-ieee-external-rice-observation-intake-v1":
        blocked("CATALOG_SCHEMA")
    return data


def entry_for(catalog, dataset_id):
    matches = [d for d in catalog["datasets"] if d["id"] == dataset_id]
    if len(matches) != 1:
        blocked("UNKNOWN_DATASET_ID")
    row = matches[0]
    if row["source"] != "ZENODO" or not row.get("record_id"):
        blocked("PORTAL_OR_MANUAL_DOWNLOAD_REQUIRED")
    if not ZENODO_ID.fullmatch(str(row["record_id"])):
        blocked("ZENODO_RECORD_ID_INVALID")
    if not isinstance(row.get("files"), list) or not row["files"]:
        blocked("EMPTY_OR_INVALID_SOURCE_FILE_LIST")
    return row


def licensing(record):
    metadata = record.get("metadata", {})
    rights = metadata.get("rights")
    options = []
    if isinstance(rights, list):
        options += [str(x.get("id", "")).lower() for x in rights if isinstance(x, dict)]
    legacy = metadata.get("license")
    if isinstance(legacy, dict):
        options.append(str(legacy.get("id", "")).lower())
    if isinstance(legacy, str):
        options.append(legacy.lower())
    # Never interpret a missing or ambiguous license as Zenodo's default.
    if len(options) != 1 or options[0] not in ALLOWED_RIGHTS:
        blocked("LICENSE_UNVERIFIED_OR_NOT_REDISTRIBUTABLE:" + ",".join(options))
    access = record.get("access", {})
    if isinstance(access, dict) and access.get("status") not in (None, "open"):
        blocked("RECORD_ACCESS_NOT_OPEN")
    if metadata.get("access_right") not in (None, "open"):
        blocked("RECORD_ACCESS_NOT_OPEN")
    return options[0]


def safe_filename(filename):
    if (not isinstance(filename, str) or not filename or len(filename) > 200 or
            filename.startswith(".") or filename in (".", "..", "acquisition-receipt.json") or
            "/" in filename or "\\" in filename or "\x00" in filename):
        blocked("UNSAFE_FILE_NAME")
    return filename


def record_file(record, filename):
    safe_filename(filename)
    listing = record.get("files", {})
    if isinstance(listing, dict):
        obj = listing.get("entries", {}).get(filename)
    elif isinstance(listing, list):
        obj = next((x for x in listing if x.get("key") == filename), None)
    else:
        obj = None
    if not isinstance(obj, dict):
        blocked("PUBLISHER_FILE_MISSING:" + filename)
    return obj


def validate_file(blob, described, published):
    if not 1 <= len(blob) <= MAX_FILE_BYTES:
        blocked("FILE_SIZE_INVALID")
    if len(blob) != published["expected_size_bytes"]:
        blocked("SIZE_DIFFERS_FROM_PREVIOUS_ACQUISITION")
    md5 = hashlib.md5(blob).hexdigest()  # MD5 is the published identifier, not security authentication.
    sha256 = hashlib.sha256(blob).hexdigest()
    if md5 != published["published_md5"] or sha256 != published["previous_ephemeral_sha256"]:
        blocked("PUBLISHER_AND_PREVIOUS_CHECKSUM_MISMATCH")
    if described.get("checksum") != "md5:" + md5:
        blocked("ZENODO_FILE_METADATA_MD5_MISMATCH")
    size = described.get("size")
    if size is not None and size != len(blob):
        blocked("ZENODO_FILE_METADATA_SIZE_MISMATCH")
    return {"sha256": sha256, "md5": md5, "size_bytes": len(blob)}


def acquire(dataset_id, destination, fetch=fetch_bytes):
    row = entry_for(load_catalog(), dataset_id)
    record_id = row["record_id"]
    record = json.loads(fetch("https://zenodo.org/api/records/" + record_id, 1_000_000))
    if str(record.get("id")) != record_id:
        blocked("ZENODO_RECORD_ID_CHANGED")
    doi = str(record.get("doi") or record.get("metadata", {}).get("doi", ""))
    if doi.lower() != row["doi"].lower():
        blocked("ZENODO_RECORD_DOI_CHANGED")
    license_id = licensing(record)
    # A live API policy change alone must never silently authorize an
    # unreviewed source to be publicly committed by a repository workflow.
    if row.get("expected_license_id") not in ALLOWED_RIGHTS or (
            license_id != row["expected_license_id"]):
        blocked("SOURCE_LICENSE_NOT_PINNED_OR_CHANGED")
    targets = []
    seen_names = set()
    for published in row["files"]:
        name = safe_filename(published["filename"])
        if name in seen_names:
            blocked("DUPLICATE_SOURCE_FILE_NAME")
        seen_names.add(name)
        file_meta = record_file(record, name)
        url = ("https://zenodo.org/api/records/" + record_id +
               "/files/" + quote(name, safe="") + "/content")
        blob = fetch(url, MAX_FILE_BYTES)
        checks = validate_file(blob, file_meta, published)
        targets.append((name, blob, checks))
    destination = pathlib.Path(destination)
    if destination.exists():
        blocked("OUTPUT_ALREADY_EXISTS")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="naft-originals-", dir=destination.parent) as scratch:
        tmp = pathlib.Path(scratch)
        for name, blob, _ in targets:
            (tmp / name).write_bytes(blob)
        receipt = {
            "schema": "naft-ieee-research-original-acquisition-v1",
            "dataset_id": dataset_id, "doi": row["doi"],
            "license_as_claimed_by_zenodo_record": license_id,
            "license_metadata_snapshot_reviewed_for_redistribution": True,
            "record_metadata_sha256": hashlib.sha256(
                json.dumps(record, sort_keys=True, separators=(",", ":")).encode()).hexdigest(),
            "files": [{"filename": name, **checks} for name, _, checks in targets],
            "status": "PUBLISHER_RECORD_CHECKSUM_AND_PREVIOUS_SHA_MATCHED",
            "independent_original_publisher_signature_authenticated": False,
            "source_specific_qc_completed": False,
            "scientific_replication_verified": False,
            "certified_tco2e": None
        }
        (tmp / "acquisition-receipt.json").write_text(
            json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        tmp.rename(destination)
    return receipt


def verify_local(dataset_id, destination):
    row = entry_for(load_catalog(), dataset_id)
    location = pathlib.Path(destination)
    receipt_file = location / "acquisition-receipt.json"
    if receipt_file.is_symlink() or not receipt_file.is_file() or receipt_file.stat().st_size > 100_000:
        blocked("RECEIPT_FILE_UNSAFE_OR_TOO_LARGE")
    receipt = json.loads(receipt_file.read_text("utf-8"))
    if not isinstance(receipt, dict) or set(receipt) != RECEIPT_KEYS:
        blocked("RECEIPT_SCHEMA_OR_KEYS")
    if (receipt["schema"] != "naft-ieee-research-original-acquisition-v1" or
            receipt["status"] != "PUBLISHER_RECORD_CHECKSUM_AND_PREVIOUS_SHA_MATCHED" or
            receipt["dataset_id"] != dataset_id or receipt["doi"] != row["doi"] or
            receipt["license_as_claimed_by_zenodo_record"] != row.get("expected_license_id") or
            receipt["license_as_claimed_by_zenodo_record"] not in ALLOWED_RIGHTS or
            receipt["license_metadata_snapshot_reviewed_for_redistribution"] is not True or
            receipt["independent_original_publisher_signature_authenticated"] is not False or
            receipt["source_specific_qc_completed"] is not False or
            receipt["scientific_replication_verified"] is not False or
            receipt["certified_tco2e"] is not None or
            not isinstance(receipt["record_metadata_sha256"], str) or
            not HEX_SHA256.fullmatch(receipt["record_metadata_sha256"])):
        blocked("RECEIPT_CONTEXT_OR_TRUST")
    if not isinstance(receipt["files"], list) or len(receipt["files"]) != len(row["files"]):
        blocked("RECEIPT_FILE_COUNT")
    expected = set()
    for spec in row["files"]:
        name = safe_filename(spec["filename"])
        if name in expected:
            blocked("DUPLICATE_SOURCE_FILE_NAME")
        expected.add(name)
        item = next((x for x in receipt["files"] if isinstance(x, dict) and
                     x.get("filename") == name), None)
        if item is None or set(item) != FILE_RECEIPT_KEYS:
            blocked("RECEIPT_FILE_NOT_DECLARED")
        if (item["sha256"] != spec["previous_ephemeral_sha256"] or
                item["md5"] != spec["published_md5"] or
                item["size_bytes"] != spec["expected_size_bytes"]):
            blocked("RECEIPT_FILE_METADATA_MISMATCH")
        target = location / name
        if (target.is_symlink() or not target.is_file() or
                target.stat().st_size != spec["expected_size_bytes"] or
                target.stat().st_size > MAX_FILE_BYTES):
            blocked("ORIGINAL_FILE_UNSAFE_OR_SIZE_MISMATCH")
        # Avoid reading arbitrarily large tampered local files.
        with target.open("rb") as stream:
            data = stream.read(MAX_FILE_BYTES + 1)
        if (len(data) != spec["expected_size_bytes"] or
                hashlib.sha256(data).hexdigest() != spec["previous_ephemeral_sha256"] or
                hashlib.md5(data).hexdigest() != spec["published_md5"]):
            blocked("ORIGINAL_FILE_CHANGED")
    if {x["filename"] for x in receipt["files"]} != expected:
        blocked("RECEIPT_FILE_NAMES_MISMATCH")
    return {"status": "OFFLINE_ORIGINAL_BYTES_MATCH_PRIOR_PUBLISHED_CHECKSUMS",
            "dataset_id": dataset_id, "files_verified": len(row["files"]),
            "scientific_replication_verified": False, "certified_tco2e": None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("catalog", "acquire", "verify-local"))
    parser.add_argument("dataset_id", nargs="?")
    parser.add_argument("--destination")
    opts = parser.parse_args()
    if opts.mode == "catalog":
        print(json.dumps(load_catalog(), indent=2))
        return
    if not opts.dataset_id or not opts.destination:
        blocked("USAGE_DATASET_AND_DESTINATION_REQUIRED")
    if opts.mode == "acquire":
        out = acquire(opts.dataset_id, opts.destination)
    else:
        out = verify_local(opts.dataset_id, opts.destination)
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        raise SystemExit(str(exc))
