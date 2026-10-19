#!/usr/bin/env python3
"""Source-bound dissertation and preliminary CH4 screening tests (no thesis PDF in CI)."""
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
from decimal import Decimal
import json

ROOT = Path(__file__).resolve().parents[1]
module_path = ROOT / 'scripts/japanflux-jp-hrt-v200-thesis-qc.py'
spec = spec_from_file_location('jphrt_dissertation_qc', module_path)
audit = module_from_spec(spec)
spec.loader.exec_module(audit)
evidence = json.loads((ROOT/'research/japanflux-jp-hrt-v200/komiya-2015-thesis-method-evidence.json').read_text())
profile = json.loads((ROOT/'research/japanflux-jp-hrt-v200/komiya-2015-source-qc-proxy-profile.json').read_text())
original = json.loads((ROOT/'research/japanflux-jp-hrt-v200/native-observation-profile.json').read_text())
tests = 0


def check(value):
    global tests
    assert value
    tests += 1


def denied(call, code):
    global tests
    try:
        call()
    except (ValueError, KeyError) as exc:
        assert code in str(exc), str(exc)
    else:
        raise AssertionError('expected rejection '+code)
    tests += 1


def row(wind='50.00',ustar='0.20',rain='0.0'):
    return {'WD_1_1_1':wind,'USTAR_1_1_1':ustar,'P_RAIN_1_1_1':rain}

clear = audit.classify_proxies(row())
check(clear['candidate_flagged_any'] is False)
check(clear['review_only_not_accepted'] is True)
check(clear['proxy_variables_unavailable'] == ())
wind = audit.classify_proxies(row(wind='76.0'))
check(wind['candidate_wind_exclusion'] is True)
check(wind['candidate_flagged_any'] is True)
check(audit.classify_proxies(row(wind='107.0'))['candidate_wind_exclusion'] is True)
check(audit.classify_proxies(row(wind='107.000001'))['candidate_wind_exclusion'] is False)
check(audit.classify_proxies(row(wind='75.999999'))['candidate_wind_exclusion'] is False)
check(audit.classify_proxies(row(ustar='0.07'))['candidate_low_ustar'] is True)
check(audit.classify_proxies(row(ustar='0.070001'))['candidate_low_ustar'] is False)
check(audit.classify_proxies(row(rain='0.5'))['candidate_rainfall'] is True)
check(audit.classify_proxies(row(rain='0'))['candidate_rainfall'] is False)
overlap=audit.classify_proxies(row(wind='100',ustar='0.02',rain='5'))
check(overlap['candidate_wind_exclusion'])
check(overlap['candidate_low_ustar'])
check(overlap['candidate_rainfall'])
check(overlap['candidate_flagged_any'])
unknown=audit.classify_proxies(row(wind='-9999.0',ustar='0.12',rain='0'))
check(unknown['proxy_variables_unavailable']==('WD',))
check(unknown['candidate_flagged_any'] is False)
denied(lambda: audit.classify_proxies(row(wind='360.1')),'JPHRT_WIND_RANGE')
denied(lambda: audit.classify_proxies(row(wind='-1')),'JPHRT_WIND_RANGE')
denied(lambda: audit.classify_proxies(row(ustar='-0.001')),'JPHRT_USTAR_RANGE')
denied(lambda: audit.classify_proxies(row(rain='-0.5')),'JPHRT_RAIN_RANGE')
denied(lambda: audit.classify_proxies(row(rain='NaN')),'JPHRT_PROXY_NUMBER_INVALID')
denied(lambda: audit.classify_proxies(row(rain='inf')),'JPHRT_PROXY_NUMBER_INVALID')
denied(lambda: audit.classify_proxies(row(wind='88;import os')),'JPHRT_PROXY_NUMBER_INVALID')
check(audit.sha(b'abc')=='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
check(evidence['reference']['pdf_sha256']==audit.THESIS_SHA)
check(evidence['study_scope']['japan_ch4_method']=='CLOSED_PATH_EDDY_COVARIANCE')
check(evidence['study_scope']['thailand_ch4_method']=='HYPERBOLIC_RELAXED_EDDY_ACCUMULATION')
check(evidence['study_scope']['stream_mapping_to_ads_fch4_independently_verified'] is False)
check(evidence['published_study_budget']['may_not_silently_gap_fill_original_dataset'] is True)
denied(lambda: audit.check_thesis(b'fake thesis',evidence),'JPHRT_THESIS_ORIGINAL_SHA_MISMATCH')
for section,key,val,code in [
 ('study_scope','japan_ch4_method','HREA','JPHRT_METHOD_STREAM_PREMATURELY_ATTESTED'),
 ('site_specific_quality_filters','japan_low_turbulence_ustar_threshold_m_s','0.05','JPHRT_METHOD_FILTER_EVIDENCE_CHANGED'),
 ('review_state','source_fch4_numeric_entries_qc_accepted',True,'JPHRT_METHOD_UNSAFE_ATTESTATION')
]:
    changed=json.loads(json.dumps(evidence));changed[section][key]=val
    # Structural tampering is rejected even when the PDF itself is not in CI.
    denied(lambda payload=changed: audit.check_thesis(b'fake thesis',payload),
           'JPHRT_THESIS_ORIGINAL_SHA_MISMATCH')
check(profile['schema']=='naft-jphrt-real-native-proxy-profile-v1')
check(profile['source_fch4_numeric_rows']==original['coverage']['valid_native_fch4_rows']==1915)
check(profile['source_fch4_missing_rows']==original['coverage']['missing_native_fch4_rows']==15605)
check(profile['proxy_screening']['wind_direction_76_to_107']==8)
check(profile['proxy_screening']['u_star_at_or_below_0_07']==38)
check(profile['proxy_screening']['rainfall_positive']==20)
check(profile['proxy_screening']['any_rule_flagged_union']==63)
check(profile['proxy_screening']['missing_wind']==99)
check(profile['proxy_screening']['missing_u_star']==107)
check(profile['proxy_screening']['missing_rainfall']==98)
check(profile['proxy_screening']['all_three_proxies_present_no_flag']==1747)
check(profile['proxy_screening']['some_proxy_missing_and_no_flag']==105)
check(sum([profile['proxy_screening']['all_three_proxies_present_no_flag'],
    profile['proxy_screening']['some_proxy_missing_and_no_flag'],
    profile['proxy_screening']['any_rule_flagged_union']])==1915)
check(profile['trust']['accepted_ch4_flux_qc_rows']==0)
check(profile['trust']['japanflux_original_yearly_emissions'] is None)
check(profile['trust']['certified_tco2e'] is None)
check(profile['source_archive_sha256']==original['archive_sha256'])
check(profile['dissertation_pdf_sha256']==evidence['reference']['pdf_sha256'])

# Exercise the *whole* scientific preflight on synthetic source bytes.  Only
# the test-local module constant is substituted with a synthetic PDF digest;
# published production hash pins remain unchanged.
from tempfile import TemporaryDirectory
from datetime import datetime,timedelta
from hashlib import sha256
from io import StringIO
import csv
import zipfile

def synthetic_zip(path, change_wind=False):
    stream=StringIO()
    writer=csv.writer(stream,lineterminator='\n')
    writer.writerow(['TIMESTAMP_START','TIMESTAMP_END','FCH4','FCH4_1_1_1',
                     'CH4_1_1_1','WD_1_1_1','USTAR_1_1_1','P_RAIN_1_1_1'])
    start=datetime(2013,1,1)
    # Production pinned archives require complete contiguous 2013 time window and
    # exactly 1,915 numeric FCH4 values. This is a synthetic full-year test only.
    for i in range(17520):
        begin=start+timedelta(minutes=30*i)
        end=begin+timedelta(minutes=30)
        present=(5000<=i<6915)
        if not present:
            vals=('-9999.0','-9999.0','-9999.0','-9999.0','-9999.0','-9999.0')
        else:
            wind='90' if i==5000 and not change_wind else (
                 '-9999.0' if i==5002 else '130')
            speed='0.05' if i==5001 else '0.20'
            rain='1.0' if i==5001 else '0.0'
            vals=('2.0','2.0','1.8',wind,speed,rain)
        writer.writerow([begin.strftime('%Y%m%d%H%M'),
                         end.strftime('%Y%m%d%H%M'),*vals])
    members={audit.native.HH:stream.getvalue().encode(),
       audit.native.PDF:b'%PDF-1.4 FAKE test PDF, not real ADS\n',
       audit.native.BADM:b'PK FAKE workbook, not real BADM\n'}
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_STORED) as archive:
        for name,data in members.items():archive.writestr(name,data)
    pin={'schema':'naft-japanflux-jp-hrt-v200-pin-1',
         'archive_sha256':sha256(path.read_bytes()).hexdigest(),
         'source_hh_csv_sha256':sha256(members[audit.native.HH]).hexdigest(),
         'source_metadata_pdf_sha256':sha256(members[audit.native.PDF]).hexdigest(),
         'source_site_badm_sha256':sha256(members[audit.native.BADM]).hexdigest()}
    return pin

with TemporaryDirectory() as folder:
    local=Path(folder)/'fake-jphrt.zip'
    pin=synthetic_zip(local)
    fake_pdf=b'FAKE-SYNTHETIC-THESIS-BYTES-FOR-TEST-NOT-RESEARCH'
    expected_original=audit.THESIS_SHA
    audit.THESIS_SHA=sha256(fake_pdf).hexdigest()
    synthetic_evidence=json.loads(json.dumps(evidence))
    synthetic_evidence['reference']['pdf_sha256']=audit.THESIS_SHA
    try:
        result=audit.audit(local,pin,fake_pdf,synthetic_evidence)
        check(result['status']=='BLOCKED_EXTERNAL_QC_REQUIRED')
        check(result['screening']['native_numeric_fch4_rows']==1915)
        check(result['screening']['native_missing_fch4_rows']==15605)
        check(result['screening']['candidate_wind_exclusion_rows']==1)
        check(result['screening']['candidate_low_ustar_rows']==1)
        check(result['screening']['candidate_rainfall_rows']==1)
        check(result['screening']['candidate_flagged_any_rows']==2)
        check(result['screening']['proxy_missing_wd_rows']==1)
        check(result['screening']['no_candidate_flag_but_some_proxy_missing']==1)
        check(result['screening']['qc_accepted_rows']==0)
        check(result['gates']['safe_to_integrate_flux_mass'] is False)
        check(result['gates']['annual_ch4_emission'] is None)
        check(result['gates']['certified_tco2e'] is None)
        check(audit.audit(local,pin,fake_pdf,synthetic_evidence)==result)
        denied(lambda:audit.audit(local,pin,b'CORRUPTED',synthetic_evidence),
               'JPHRT_THESIS_ORIGINAL_SHA_MISMATCH')
        modified=json.loads(json.dumps(synthetic_evidence))
        modified['site_specific_quality_filters']['japan_low_turbulence_ustar_threshold_m_s']='0.05'
        denied(lambda:audit.audit(local,pin,fake_pdf,modified),
               'JPHRT_METHOD_FILTER_EVIDENCE_CHANGED')
        modified=json.loads(json.dumps(synthetic_evidence))
        modified['review_state']['source_fch4_numeric_entries_qc_accepted']=True
        denied(lambda:audit.audit(local,pin,fake_pdf,modified),
               'JPHRT_METHOD_UNSAFE_ATTESTATION')
        prior=pin
        synthetic_zip(local,change_wind=True)
        denied(lambda:audit.audit(local,prior,fake_pdf,synthetic_evidence),
               'JPHRT_ARCHIVE_PIN_MISMATCH')
    finally:
        audit.THESIS_SHA=expected_original

print('JPHRT_THESIS_QC_PRELIMINARY_PASS:',tests,'checks; no QC promotion, numerical mass or credits')
