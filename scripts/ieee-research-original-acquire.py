#!/usr/bin/env python3
"""Explicit research-only original file intake. Never run from the MRV compiler.
Only Zenodo CC-BY-4.0/CC0 source files may be redistributed, after publisher
metadata, MD5, prior SHA-256, filename and size checks. Site QC is NOT inferred.
"""
import argparse
import hashlib
import json
import pathlib
import tempfile
import urllib.request
from urllib.parse import quote

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "research/ieee-observation-datasets-2026-10-19/intake-catalog.json"
ALLOWED_RIGHTS = {"cc-by-4.0", "cc0-1.0", "cc-zero", "cc0"}
MAX_FILE_BYTES = 2_000_000
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


def record_file(record, filename):
    if not filename or "/" in filename or "\\" in filename or filename.startswith("."):
        blocked("UNSAFE_FILE_NAME")
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
    targets = []
    for published in row["files"]:
        name = published["filename"]
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
    receipt = json.loads((location / "acquisition-receipt.json").read_text("utf-8"))
    if (receipt.get("dataset_id") != dataset_id or receipt.get("doi") != row["doi"] or
            receipt.get("license_as_claimed_by_zenodo_record") not in ALLOWED_RIGHTS or
            receipt.get("certified_tco2e", "missing") is not None or
            receipt.get("source_specific_qc_completed") is not False):
        blocked("RECEIPT_CONTEXT_OR_TRUST")
    if len(receipt.get("files", [])) != len(row["files"]):
        blocked("RECEIPT_FILE_COUNT")
    for spec in row["files"]:
        name = spec["filename"]
        item = next((x for x in receipt["files"] if x.get("filename") == name), None)
        if item is None:
            blocked("RECEIPT_FILE_NOT_DECLARED")
        data = (location / name).read_bytes()
        if (len(data) != item["size_bytes"] or
            hashlib.sha256(data).hexdigest() != item["sha256"] or
            hashlib.sha256(data).hexdigest() != spec["previous_ephemeral_sha256"] or
            hashlib.md5(data).hexdigest() != spec["published_md5"]):
            blocked("ORIGINAL_FILE_CHANGED")
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
