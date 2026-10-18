#!/usr/bin/env python3
"""Verify the user's original research ZIP against the curated NaFT baseline.

No remote source authentication and no J-Credit methodology evaluation.
"""
import csv
import hashlib
import io
import json
import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = ROOT / "data/japan-mrv-research-2026-10-18/baseline.json"
EXPECTED = {"README.md", "manifest.json", "sources.csv",
            "trial_sites_2008_2009.csv", "research_study_aggregates.csv",
            "certified_program_aggregates.csv", "ag005_evidence_fields_reference.csv"}

def require(condition, error):
    if not condition:
        raise ValueError(error)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def rows(archive, name):
    data = archive.read(name).decode("utf-8-sig")
    result = list(csv.DictReader(io.StringIO(data)))
    require(bool(result) and all(None not in row for row in result), "MALFORMED_CSV:" + name)
    return result

def verify(zip_path):
    base = json.loads(BASE.read_text(encoding="utf-8"))
    require(sha(zip_path.read_bytes()) == base["input_zip_sha256"], "ARCHIVE_SHA256_MISMATCH")
    with zipfile.ZipFile(zip_path) as z:
        entries=z.infolist()
        require({item.filename for item in entries} == EXPECTED and
                len(entries) == len(EXPECTED), "UNEXPECTED_ZIP_ENTRIES")
        require(all(not item.is_dir() and 0<=item.file_size<=2_000_000 for item in entries),
                "ARCHIVE_ENTRY_SIZE_INVALID")
        for filename, expected in base["input_file_sha256"].items():
            require(sha(z.read(filename)) == expected, "COMPILATION_FILE_HASH_MISMATCH:"+filename)
        manifest=json.loads(z.read("manifest.json").decode("utf-8"))
        for field in ("raw_observations_available_in_pack", "complete_jcredit_method_implementation",
                      "source_bytes_sha256_verified"):
            require(manifest[field] is False, "SOURCE_PACK_OVERCLAIM:"+field)
        sources=rows(z,"sources.csv")
        require(len(sources)==16 and
                {s["source_id"]:s["source_url"] for s in sources}==base["sources"],
                "SOURCE_URL_OR_ROW_MISMATCH")
        sites=rows(z,"trial_sites_2008_2009.csv")
        require(len(sites)==9, "SITE_COUNT_MISMATCH")
        for actual, expected in zip(sites,base["trial_sites"]):
            require((actual["site_id"],actual["site_name"],
                     actual["conventional_drainage_days"],actual["experimental_treatment_days"],
                     actual["source_id"]) ==
                    (expected["id"],expected["name"],expected["conventional_days"],
                     expected["treatment_days"],expected["source_id"]),
                    "SITE_TRANSCRIPTION_MISMATCH")
            require(actual["is_field_raw_data"]=="False" and
                    actual["certification_eligibility_inferred"]=="False",
                    "SITE_FALSE_FIELD_DATA_CLAIM")
        study=rows(z,"research_study_aggregates.csv")
        require(len(study)==3, "STUDY_COUNT_MISMATCH")
        for actual, expected in zip(study,base["study_ratios"]):
            require((actual["metric"],float(actual["value"]),float(actual["standard_error"]),
                     actual["unit"],actual["source_id"]) ==
                    (expected["metric"],expected["value"],expected["standard_error"],
                     expected["unit"],expected["source_id"]),
                    "STUDY_TRANSCRIPTION_MISMATCH")
        programs=rows(z,"certified_program_aggregates.csv")
        require(len(programs)==4, "PROGRAM_COUNT_MISMATCH")
        for actual, expected in zip(programs,base["program_totals"]):
            require((actual["announcement_or_committee_date"],actual["operator"],
                     int(actual["certified_tco2"]),actual["source_id"]) ==
                    (expected["date"],expected["operator"],expected["certified_tco2"],
                     expected["source_id"]),"PROGRAM_TRANSCRIPTION_MISMATCH")
            observed="government-announced" if actual["source_id"]=="S05" else "operator-reported"
            require(observed==expected["provenance"],"PROGRAM_SOURCE_CLASSIFICATION_MISMATCH")
        fields=rows(z,"ag005_evidence_fields_reference.csv")
        require(len(fields)==10 and
                [r["field_id"] for r in fields]==base["ag005_reference_fields"],
                "AG005_FIELD_REFERENCE_MISMATCH")
    return {
      "status":"RESEARCH_BASELINE_REPRODUCED",
      "archive_sha256":base["input_zip_sha256"],
      "verified_compilation_files":len(base["input_file_sha256"]),
      "records":{"sources":16,"sites":9,"study_ratios":3,"programs":4,"reference_fields":10},
      "original_publishers_authenticated":False,
      "ag005_eligibility_proven":False,
      "emission_reduction_calculated":False
    }

def main():
    if len(sys.argv)!=2:
        raise ValueError("USAGE: python3 scripts/verify-japan-research-pack.py ZIP")
    file=pathlib.Path(sys.argv[1])
    require(file.is_file() and 0<file.stat().st_size<=12_000_000,
            "ZIP_NOT_FOUND_OR_TOO_LARGE")
    print(json.dumps(verify(file),ensure_ascii=False,indent=2))

if __name__=="__main__":
    try:
        main()
    except Exception as e:
        print("JAPAN_RESEARCH_PACK_VERIFY_FAIL:"+str(e),file=sys.stderr)
        sys.exit(1)
