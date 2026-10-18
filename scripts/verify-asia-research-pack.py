#!/usr/bin/env python3
"""Verify an exact supplied Asia research archive and its curated IEEE subset.

No network, no ZIP extraction, and no execution of untrusted ZIP Python.
Passing does NOT authenticate publisher originals, licenses, or J-Credit/JCM creditability.
"""
import hashlib
import json
from pathlib import Path
import re
import stat
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'research' / 'asia-mrv-2026-10-18'
ORIGINAL_SHA = 'f8d4460d8a6e3fa4129469a7e4df5995998d82484a90b7a75fdd8b610e933406'
PREFIX = 'NaFT_Asia_MRV_Research_And_TestPack_2026-10-18/'
ORIGINAL_FILES = {
    'README.md', 'benchmark/README.md', 'benchmark/TEST_RESULTS.txt',
    'benchmark/mrv_benchmark.py', 'benchmark/source_manifest.json',
    'benchmark/test_mrv_benchmark.py', 'reference_fixtures/README.md',
    'reference_fixtures/docs/asia_mrv_gap_spec.md',
    'reference_fixtures/fixtures/asian_reference_cases.json',
    'reference_fixtures/scripts/verify_reference_cases.py',
}
def require(ok, code):
    if not ok:
        raise ValueError(code)

def sha(buf):
    return hashlib.sha256(buf).hexdigest()

def normalized():
    fixtures = json.loads((DIR / 'fixtures.json').read_text(encoding='utf-8'))
    sources = json.loads((DIR / 'source-manifest.json').read_text(encoding='utf-8'))
    require(fixtures.get('schema') == 'naft-asia-comparison-fixtures-1'
            and fixtures.get('research_only') is True
            and fixtures.get('official_jcredit_outputs_enabled') is False,
            'RESEARCH_FIXTURE_STATUS_MISMATCH')
    require(sources.get('schema') == 'naft-asia-mrv-source-lock-1'
            and sources.get('approved_in_japan') is False
            and sources.get('original_publisher_bytes_independently_verified') is False,
            'SOURCE_AUTHORITY_OVERCLAIM')
    require(fixtures.get('source_original_zip_sha256') ==
            sources.get('source_uploaded_zip_sha256') == ORIGINAL_SHA,
            'SOURCE_ARCHIVE_HASH_MISMATCH')
    records=fixtures.get('ipcc2019_rounded_strata')
    expected={'CF':(1500000,1.48,102),'MD':(1500000,0.81,102),
              'rainfed':(900000,0.59,102),'upland':(450000,0,102),
              'deepwater':(150000,0.18,220)}
    require(isinstance(records,list) and len(records)==5
            and {r.get('id') for r in records}==set(expected),
            'CURATED_IPCC_COVERAGE_INVALID')
    for r in records:
        require((r.get('harvested_area_ha_year'),r.get('daily_ef_kg_ch4_ha_day'),
                 r.get('season_days'))==expected[r['id']]
                and r.get('unit')=='kg_CH4_ha_day'
                and r.get('status')=='PUBLISHED_ROUNDED_REFERENCE',
                'CURATED_IPCC_REFERENCE_INVALID')
    case=fixtures.get('published_case_metadata')
    require(isinstance(case,list) and len(case)==5
            and len({v.get('id') for v in case})==5,
            'CURATED_CASE_COVERAGE_INVALID')
    ref={r['id']:r for r in case}
    for key in ['TAIWAN_2023_SECOND','TAIWAN_2024_FIRST','KOREA_ANSEONG_2026',
                'VIETNAM_CENTRAL_2019_2021','PH_AM004']:
        require(key in ref,'CURATED_CASE_MISSING:'+key)
    require({k:ref['TAIWAN_2023_SECOND'][k] for k in ['cf','conventional','intermittent']}==
            {'cf':676,'conventional':346,'intermittent':167},'CURATED_TW2023_INVALID')
    require({k:ref['TAIWAN_2024_FIRST'][k] for k in ['cf','conventional','intermittent']}==
            {'cf':317,'conventional':76,'intermittent':38},'CURATED_TW2024_INVALID')
    require(ref['KOREA_ANSEONG_2026'].get('max_reduction_percent')==74.6,
            'CURATED_KOREA_INVALID')
    require([ref['VIETNAM_CENTRAL_2019_2021'].get(k) for k in
            ('reduction_ch4_percent','increase_n2o_percent','reduction_water_percent')]==
            [34,46,33],'CURATED_VIETNAM_INVALID')
    require(ref['PH_AM004'].get('status')=='PH_JCM_ONLY_NOT_JAPAN',
            'FOREIGN_REGULATORY_TRANSFER_INVALID')
    urls=sources.get('sources')
    require(isinstance(urls,list) and len(urls)>=7
            and len({r.get('id') for r in urls})==len(urls)
            and all(isinstance(r.get('url'),str) and r['url'].startswith('https://')
                    for r in urls),'CURATED_SOURCE_INDEX_INVALID')
    known={'IPCC2019':'https://www.ipcc-tfi.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch05_Cropland.pdf',
           'PH_AM004':'https://www.jcm.go.jp/jc/wp-content/uploads/sites/3/JCM_PH_AM004_ver01.0.pdf',
           'TW_2025_YANG':'https://doi.org/10.6165/tai.2025.70.530',
           'KR_2026_JANG':'https://doi.org/10.1016/j.agee.2026.110406'}
    index={r['id']:r['url'] for r in urls}
    require(all(index.get(k)==v for k,v in known.items()),
            'CURATED_SOURCE_URL_MISMATCH')
    return fixtures,sources

def verify_archive(file):
    fixtures,sources=normalized()
    require(file.is_file() and 0 < file.stat().st_size <= 2_000_000,
            'ARCHIVE_ABSENT_OR_SIZE_INVALID')
    require(sha(file.read_bytes())==ORIGINAL_SHA,'UNEXPECTED_ARCHIVE_SHA256')
    with ZipFile(file) as z:
        entries=z.infolist()
        expected={PREFIX+x for x in ORIGINAL_FILES}|{PREFIX+'CHECKSUMS.sha256'}
        require(len(entries)==len(expected) and {x.filename for x in entries}==expected,
                'ARCHIVE_ENTRIES_INVALID')
        require(all(not x.is_dir() and not stat.S_ISLNK(x.external_attr>>16)
                    and x.file_size<=100_000 for x in entries),
                'ARCHIVE_UNSAFE_ENTRY')
        lines=z.read(PREFIX+'CHECKSUMS.sha256').decode('ascii').splitlines()
        hashes={}
        for line in lines:
            m=re.fullmatch(r'([0-9a-f]{64})  ([^\s]+)',line)
            require(m is not None and m[2] not in hashes,'ARCHIVE_CHECKSUM_MANIFEST_INVALID')
            hashes[m[2]]=m[1]
        require(set(hashes)==ORIGINAL_FILES,'ARCHIVE_CHECKSUM_COVERAGE_INVALID')
        for name, expected_hash in hashes.items():
            require(sha(z.read(PREFIX+name))==expected_hash,
                    'ARCHIVE_ENTRY_HASH_MISMATCH:'+name)
        original=json.loads(z.read(PREFIX+'reference_fixtures/fixtures/asian_reference_cases.json'))
        original_cases={r['id']:r for r in original['reference_cases']}
        require(len(original_cases)==7 and original.get('schema')==
                'naft-asia-mrv-research-fixtures-1',
                'ORIGINAL_FIXTURE_COVERAGE_INVALID')
        for key,sourcekey in [('TAIWAN_2023_SECOND','TAIWAN_2023_SECOND_SEASON'),
                               ('TAIWAN_2024_FIRST','TAIWAN_2024_FIRST_SEASON')]:
            target=next(r for r in fixtures['published_case_metadata'] if r['id']==key)
            for field in ['cf','conventional','intermittent']:
                require(target[field]==original_cases[sourcekey][field],
                        'CURATED_SOURCE_TRANSCRIPTION_MISMATCH')
        require(original_cases['KOREA_ANSEONG_2026']['max_ch4_reduction_percent']==74.6
                and original_cases['VIETNAM_CENTRAL_2019_2021']['awdcf_n2o_increase_percent']==46
                and original_cases['JCM_PH_AM004_V1']['status']==
                    'FOREIGN_REGULATORY_METHOD_DO_NOT_SUBSTITUTE_JAPAN_AG005',
                'FOREIGN_SOURCE_TRANSCRIPTION_MISMATCH')
        b=json.loads(z.read(PREFIX+'benchmark/source_manifest.json'))
        require(b.get('official_validation') is False
                and b.get('downloaded_original_document_sha256_verified') is False,
                'BENCHMARK_AUTHORITY_OVERCLAIM')
        citations={r['id']:r['url'] for r in b['citations']}
        source_index={r['id']:r['url'] for r in sources['sources']}
        for source_id,benchmark_id in [('PH_AM004','PH_AM004@1.0'),
                                       ('TW_2025_YANG','TW_2025_YANG'),
                                       ('KR_2026_JANG','KR_2026_JANG')]:
            require(source_index[source_id]==citations[benchmark_id],
                    'SOURCE_URL_TRANSCRIPTION_MISMATCH:'+source_id)
    return {'status':'EXACT_USER_ARCHIVE_REPRODUCED','zip_sha256':ORIGINAL_SHA,
            'checked_original_files':len(ORIGINAL_FILES),'curated_cases':5,
            'publisher_originals_authenticated':False,'official_jcredit_output':None}

if __name__ == '__main__':
    try:
        if len(sys.argv)==2 and sys.argv[1]=='local':
            normalized()
            print(json.dumps({'status':'CURATED_LOCAL_METADATA_CHECKED',
                              'original_zip_verified_this_run':False,
                              'publisher_originals_authenticated':False}))
        elif len(sys.argv)==3 and sys.argv[1]=='verify':
            print(json.dumps(verify_archive(Path(sys.argv[2])),indent=2))
        else:
            raise ValueError('USAGE: python3 scripts/verify-asia-research-pack.py local|verify ORIGINAL_ZIP')
    except Exception as exc:
        print('ASIA_ARCHIVE_VERIFY_FAIL:'+str(exc),file=sys.stderr)
        sys.exit(1)
