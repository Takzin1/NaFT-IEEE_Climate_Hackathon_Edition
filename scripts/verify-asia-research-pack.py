#!/usr/bin/env python3
"""Byte-verify the user-provided 2026-10-18 Asian research ZIP.
Not external source authentication and not official emissions verification.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'NaFT_Asia_MRV_Research_And_TestPack_2026-10-18/'
EXPECTED_ZIP = 'f8d4460d8a6e3fa4129469a7e4df5995998d82484a90b7a75fdd8b610e933406'
EXPECTED_FILES = {
    'README.md', 'benchmark/README.md', 'benchmark/TEST_RESULTS.txt',
    'benchmark/mrv_benchmark.py', 'benchmark/source_manifest.json',
    'benchmark/test_mrv_benchmark.py', 'reference_fixtures/README.md',
    'reference_fixtures/docs/asia_mrv_gap_spec.md',
    'reference_fixtures/fixtures/asian_reference_cases.json',
    'reference_fixtures/scripts/verify_reference_cases.py',
}

def verify(file: Path):
    if not file.is_file() or not 0 < file.stat().st_size < 2_000_000:
        raise ValueError('ZIP_MISSING_OR_SIZE_INVALID')
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    if digest != EXPECTED_ZIP:
        raise ValueError('UNEXPECTED_ASIA_ARCHIVE_SHA256')
    with ZipFile(file) as z:
        listing = z.infolist()
        names = {v.filename for v in listing}
        expected = {PREFIX + x for x in EXPECTED_FILES} | {PREFIX+'CHECKSUMS.sha256'}
        if names != expected or len(listing) != len(expected) or any(
            v.is_dir() or v.file_size > 100_000 for v in listing
        ):
            raise ValueError('ZIP_ENTRY_OR_SIZE_MISMATCH')
        lines = z.read(PREFIX+'CHECKSUMS.sha256').decode('ascii').splitlines()
        checksums = {}
        for line in lines:
            match = re.fullmatch(r'([0-9a-f]{64})  ([^\s]+)', line)
            if not match or match.group(2) in checksums:
                raise ValueError('ARCHIVE_CHECKSUM_FORMAT_INVALID')
            checksums[match.group(2)] = match.group(1)
        if set(checksums) != EXPECTED_FILES:
            raise ValueError('ARCHIVE_CHECKSUM_COVERAGE_INVALID')
        for path, expected_hash in checksums.items():
            if hashlib.sha256(z.read(PREFIX+path)).hexdigest() != expected_hash:
                raise ValueError('ARCHIVE_ENTRY_HASH_MISMATCH:'+path)
        upstream_cases = json.loads(z.read(PREFIX+'reference_fixtures/fixtures/asian_reference_cases.json'))
        local_cases = json.loads((ROOT/'data/asia-mrv-research-2026-10-18/reference-cases.json').read_text())
        if upstream_cases != local_cases:
            raise ValueError('ASIA_FIXTURE_TRANSCRIPTION_MISMATCH')
        upstream_sources = json.loads(z.read(PREFIX+'benchmark/source_manifest.json'))
        local_sources = json.loads((ROOT/'data/asia-mrv-research-2026-10-18/source-manifest.json').read_text())
        if upstream_sources['citations'] != local_sources['citations'] or local_sources['original_archive_sha256'] != digest:
            raise ValueError('ASIA_SOURCE_ATTRIBUTION_MISMATCH')
        for key in ('official_validation','downloaded_original_document_sha256_verified'):
            if upstream_sources[key] is not False or local_sources[key] is not False:
                raise ValueError('UNSUPPORTED_OFFICIAL_VALIDATION_CLAIM')
    return {'status':'ASIA_RESEARCH_ARCHIVE_REPRODUCED','zip_sha256':digest,
            'files_with_verified_archive_hashes':len(EXPECTED_FILES),
            'curated_reference_cases':7,'external_original_sources_verified':False,
            'official_jcredit_or_jcm_issuance':False}

if __name__=='__main__':
    try:
        if len(sys.argv)!=2: raise ValueError('USAGE: python scripts/verify-asia-research-pack.py original.zip')
        print(json.dumps(verify(Path(sys.argv[1])),indent=2))
    except Exception as e:
        print('ASIA_MRV_ZIP_FAIL:'+str(e),file=sys.stderr)
        sys.exit(1)
