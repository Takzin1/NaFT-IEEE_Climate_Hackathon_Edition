#!/usr/bin/env python3
"""Cross-resolution CH4 and metadata scientific gate regression, no real ZIP on CI."""
from datetime import datetime, timedelta
from importlib.util import spec_from_file_location, module_from_spec
from hashlib import sha256
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
import csv
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
script = ROOT / 'scripts/japanflux-jp-hrt-v200-consistency.py'
spec = spec_from_file_location('jphrt_cross', script)
audit = module_from_spec(spec)
spec.loader.exec_module(audit)
native_engine = audit.native_engine
BASE = json.loads((ROOT/'research/japanflux-jp-hrt-v200/source-archive-pin.json').read_text())
CROSS = json.loads((ROOT/'research/japanflux-jp-hrt-v200/cross-resolution-pin.json').read_text())
count = 0


def check(condition, label=''):
    global count
    assert condition, label
    count += 1


def rejected(fun, message):
    global count
    try:
        fun()
    except (ValueError, KeyError) as error:
        assert message in str(error), (message, str(error))
    else:
        raise AssertionError('Expected rejection: '+message)
    count += 1


def csv_aggregate(frequency, invalid=False):
    expected=audit.RESOLUTIONS[frequency][1]
    stream=StringIO()
    writer=csv.writer(stream, lineterminator='\n')
    writer.writerow(['TIMESTAMP','FCH4','FCH4_1_1_1'])
    for index in range(expected):
        value='1.250000' if invalid and index == 0 else '-9999.0'
        writer.writerow([str(index),value,value])
    return stream.getvalue().encode()


def fake_native_hh():
    # All-year contiguous 30-minute periods, with 1,689 present before
    # 2013-08-31 and another 226 after. Exact expected extrema are reproduced.
    start=datetime(2013, 1, 1)
    first=datetime(2013,6,1,7)
    post=datetime(2013,8,31)
    final=datetime(2013,9,20,10,30)
    first_idx=int((first-start).total_seconds()//1800)
    post_idx=int((post-start).total_seconds()//1800)
    final_idx=int((final-start).total_seconds()//1800)
    present=set(range(first_idx,first_idx+1689))
    present.update(range(post_idx,post_idx+225))
    present.add(final_idx)
    check(len(present)==1915,'synthetic index count')
    stream=StringIO()
    writer=csv.writer(stream,lineterminator='\n')
    writer.writerow(['TIMESTAMP_START','TIMESTAMP_END','FCH4','FCH4_1_1_1','CH4_1_1_1'])
    for index in range(17520):
        begin=start+timedelta(minutes=30*index)
        end=begin+timedelta(minutes=30)
        value='1.000000' if index in present else '-9999.0'
        writer.writerow([begin.strftime('%Y%m%d%H%M'),end.strftime('%Y%m%d%H%M'),
                         value,value,'-9999.0'])
    return stream.getvalue().encode()


def fake_archive(path,aggregate_override=None):
    values={
        native_engine.HH:fake_native_hh(),
        native_engine.PDF:b'%PDF-1.4 fake local test source',
        native_engine.BADM:b'PK fake BADM for synthetic tests'
    }
    for frequency, (suffix, _) in audit.RESOLUTIONS.items():
        name = audit.MAIN_PREFIX+'FLX_JP-Hrt_JapanFLUX2024_ALLVARS_'+suffix+audit.CSV_SUFFIX
        values[name]=csv_aggregate(frequency, invalid=aggregate_override==frequency)
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_STORED) as archive:
        for name,data in values.items():
            archive.writestr(name,data)
    source_pin={
      'schema':'naft-japanflux-jp-hrt-v200-pin-1',
      'archive_sha256':sha256(path.read_bytes()).hexdigest(),
      'source_hh_csv_sha256':sha256(values[native_engine.HH]).hexdigest(),
      'source_metadata_pdf_sha256':sha256(values[native_engine.PDF]).hexdigest(),
      'source_site_badm_sha256':sha256(values[native_engine.BADM]).hexdigest()
    }
    native,_ = native_engine.rows_from_source(values[native_engine.HH])
    cross_pin={
      'schema':'naft-jphrt-v200-cross-resolution-pin-v1',
      'original_archive_sha256':source_pin['archive_sha256'],
      'expected_native_sha256':sha256(native_engine.export_native_bytes(native)).hexdigest(),
      'aggregation_source_sha256':{
          frequency:sha256(values[
            audit.MAIN_PREFIX+'FLX_JP-Hrt_JapanFLUX2024_ALLVARS_'
            +suffix+audit.CSV_SUFFIX]).hexdigest()
          for frequency,(suffix,_) in audit.RESOLUTIONS.items()},
      'badm_metadata_evidence':CROSS['badm_metadata_evidence']
    }
    return source_pin,cross_pin

check(CROSS['original_archive_sha256']==BASE['archive_sha256'])
check(CROSS['expected_native_sha256']=='a6629e61fea92526bb0e2ec1f3454820fba428590875f996cec35669a1b6dcfb')
check(set(CROSS['aggregation_source_sha256'])==set(audit.RESOLUTIONS))
check(CROSS['badm_metadata_evidence']['badm_flux_start_yyyymmdd']=='20130831')
check(CROSS['badm_metadata_evidence']['badm_flux_method']=='Eddy Covariance')
for resolution,(suffix,expected) in audit.RESOLUTIONS.items():
    normal=csv_aggregate(resolution)
    status=audit.resolution_availability(normal,expected,resolution)
    check(status['rows']==expected)
    check(status['fch4_nonmissing_rows']==0)
    check(status['source_qc_validated'] is False)
    rejected(lambda:audit.resolution_availability(
        b'TIMESTAMP,FCH4\n1,-9999.0\n',expected,resolution),
        'JPHRT_RESOLUTION_HEADER')
    crlf=normal.replace(b'\n',b'\r\n')
    check(audit.resolution_availability(crlf,expected,resolution)==status)
    rejected(lambda:audit.resolution_availability(
      normal.replace(b'\n',b'\r'),expected,resolution),
      'JPHRT_RESOLUTION_NEWLINE')

with TemporaryDirectory() as working:
    archive=Path(working)/'jphrt-synthetic.zip'
    source_pin,cross_pin=fake_archive(archive)
    result=audit.audit_archive(archive,source_pin,cross_pin)
    check(result['schema']=='naft-jphrt-cross-resolution-audit-v1')
    check(result['status']=='BLOCKED_SCIENTIFIC_INTERPRETATION')
    check(result['temporal']['source_present_rows']==1915)
    check(result['temporal']['source_missing_rows']==15605)
    check(result['temporal']['source_value_presence_percent']=='10.930365')
    check(result['temporal']['present_before_badm_method_start']==1689)
    check(result['temporal']['present_at_or_after_badm_method_start']==226)
    check(result['temporal']['first_numeric_fch4_start_local']=='201306010700')
    check(result['temporal']['last_numeric_fch4_end_local']=='201309201100')
    check(result['temporal']['months']['2013-06']['present']>0)
    check(result['temporal']['months']['2013-10']['present']==0)
    check(result['gates']['method_label_disagreement_detected'] is True)
    check(result['gates']['metadata_start_date_conflict_detected'] is True)
    check(result['gates']['eligible_for_two_engine_numeric_replay'] is False)
    check(result['gates']['scientific_annual_mass_kg_ha'] is None)
    check(result['gates']['certified_tco2e'] is None)
    check(result['provenance']['publisher_bytes_independently_authenticated'] is False)
    check(result['other_resolutions']['daily']['fch4_nonmissing_rows']==0)
    check(result['other_resolutions']['monthly']['fch4_nonmissing_rows']==0)
    check(result['other_resolutions']['yearly']['fch4_nonmissing_rows']==0)
    check(len(result['report_sha256'])==64)
    check(audit.audit_archive(archive,source_pin,cross_pin)==result)
    rejected(lambda:audit.audit_archive(archive,source_pin,{
      **cross_pin,'original_archive_sha256':'0'*64}),
      'JPHRT_CROSS_ARCHIVE_PIN_MISMATCH')
    rejected(lambda:audit.audit_archive(archive,source_pin,{
      **cross_pin,'expected_native_sha256':'0'*64}),
      'JPHRT_NATIVE_OUTPUT_PIN_MISMATCH')
    rejected(lambda:audit.audit_archive(archive,source_pin,{
      **cross_pin,'aggregation_source_sha256':{
        **cross_pin['aggregation_source_sha256'],'daily':'a'*64}}),
      'JPHRT_AGGREGATE_SHA256_CHANGED:daily')
    rejected(lambda:audit.audit_archive(archive,source_pin,{
      **cross_pin,'badm_metadata_evidence':{
        **cross_pin['badm_metadata_evidence'],'badm_flux_start_yyyymmdd':'20130601'}}),
      'JPHRT_BADM_EVIDENCE_INCOMPLETE')
    # A legitimate SHA update does not authorize annualizing an aggregate.
    mutated_source,mutated_cross=fake_archive(archive,aggregate_override='daily')
    rejected(lambda:audit.audit_archive(archive,mutated_source,mutated_cross),
      'JPHRT_AGGREGATE_CONFLICT_REQUIRES_MANUAL_REVIEW')
    fake_archive(archive)
    tampered=archive.read_bytes()+b'GARBAGE'
    archive.write_bytes(tampered)
    rejected(lambda:audit.audit_archive(archive,source_pin,cross_pin),
      'JPHRT_ARCHIVE_PIN_MISMATCH')

rejected(lambda:audit.resolution_availability(
  b'TIMESTAMP,FCH4,FCH4_1_1_1\n1,1,2\n',1,'daily'),
  'JPHRT_DAILY_FCH4_ALIAS_MISMATCH')
rejected(lambda:audit.resolution_availability(
  b'TIMESTAMP,FCH4,FCH4_1_1_1\n1,not-a-number,not-a-number\n',1,'daily'),
  'JPHRT_DAILY_INVALID_FCH4')
rejected(lambda:audit.native_calendar(
  b','.join(x.encode() for x in native_engine.HEADER)
  +b'\n201312312300,201312312330,2,OBSERVED_GOOD\n'),
  'JPHRT_NATIVE_UNTRUSTED_QC_PROMOTION')
print('JPHRT_CROSS_RESOLUTION_METHOD_QC_GATE_PASS:',count,
      'checks; original archive only validated locally, no CH4 emissions calculated')
