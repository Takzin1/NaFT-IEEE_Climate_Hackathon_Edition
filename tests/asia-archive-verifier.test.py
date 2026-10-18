#!/usr/bin/env python3
"""Offline negative provenance checks. The original user ZIP is not committed to GitHub."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile

root=Path(__file__).resolve().parents[1]
path=root/'scripts/verify-asia-research-pack.py'
spec=importlib.util.spec_from_file_location('naft_asia_zip',path)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
fixtures,sources=module.normalized()
count=0
with tempfile.TemporaryDirectory(prefix='naft-asia-source-') as tmp:
    module.DIR=Path(tmp)
    def run(f,s,code):
        global count
        (module.DIR/'fixtures.json').write_text(json.dumps(f),encoding='utf-8')
        (module.DIR/'source-manifest.json').write_text(json.dumps(s),encoding='utf-8')
        try:
            module.normalized()
        except ValueError as error:
            assert code in str(error),(code,str(error))
        else:
            raise AssertionError('EXPECTED_FAIL:'+code)
        count+=1
    f=copy.deepcopy(fixtures);f['research_only']=False
    run(f,sources,'RESEARCH_FIXTURE_STATUS_MISMATCH')
    f=copy.deepcopy(fixtures);f['official_jcredit_outputs_enabled']=True
    run(f,sources,'RESEARCH_FIXTURE_STATUS_MISMATCH')
    s=copy.deepcopy(sources);s['approved_in_japan']=True
    run(fixtures,s,'SOURCE_AUTHORITY_OVERCLAIM')
    s=copy.deepcopy(sources);s['original_publisher_bytes_independently_verified']=True
    run(fixtures,s,'SOURCE_AUTHORITY_OVERCLAIM')
    f=copy.deepcopy(fixtures);f['source_original_zip_sha256']='0'*64
    run(f,sources,'SOURCE_ARCHIVE_HASH_MISMATCH')
    f=copy.deepcopy(fixtures);f['ipcc2019_rounded_strata'][0]['daily_ef_kg_ch4_ha_day']=999
    run(f,sources,'CURATED_IPCC_REFERENCE_INVALID')
    f=copy.deepcopy(fixtures);f['published_case_metadata'][0]['cf']=1000
    run(f,sources,'CURATED_TW2023_INVALID')
    f=copy.deepcopy(fixtures);f['published_case_metadata'][3]['increase_n2o_percent']=0
    run(f,sources,'CURATED_VIETNAM_INVALID')
    f=copy.deepcopy(fixtures);f['published_case_metadata'][4]['status']='JAPAN_AG005_APPROVED'
    run(f,sources,'FOREIGN_REGULATORY_TRANSFER_INVALID')
    s=copy.deepcopy(sources);s['sources'][0]['url']='https://evil.example/forged'
    run(fixtures,s,'CURATED_SOURCE_URL_MISMATCH')
    s=copy.deepcopy(sources);s['sources'][0]['id']=s['sources'][1]['id']
    run(fixtures,s,'CURATED_SOURCE_INDEX_INVALID')
    try:
        module.verify_archive(module.DIR/'missing.zip')
    except ValueError as error:
        assert 'ARCHIVE_ABSENT_OR_SIZE_INVALID' in str(error)
    else:
        raise AssertionError('MISSING_ARCHIVE_ACCEPTED')
    count+=1
print(f'ASIA_ARCHIVE_VERIFIER_PASS: {count} adversarial cases, original ZIP not part of public CI')
