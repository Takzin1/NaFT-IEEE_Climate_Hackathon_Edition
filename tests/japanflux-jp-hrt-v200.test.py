#!/usr/bin/env python3
"""Offline adversarial JP-Hrt native source intake regression.

Real 153 MB archive stays outside Git; synthetic fake ZIPs are for parser
tests only, with pinned real file SHA/counts supplied separately.
"""
from importlib.util import spec_from_file_location, module_from_spec
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import csv
import hashlib
import json
import warnings
import zipfile

ROOT = Path(__file__).resolve().parents[1]
filename = ROOT / 'scripts/japanflux-jp-hrt-v200.py'
import_spec = spec_from_file_location('japanflux_v200', filename)
module = module_from_spec(import_spec)
import_spec.loader.exec_module(module)
PIN = json.loads((ROOT/'research/japanflux-jp-hrt-v200/source-archive-pin.json').read_text())
PROFILE = json.loads((ROOT/'research/japanflux-jp-hrt-v200/native-observation-profile.json').read_text())
count = 0


def check(condition):
    global count
    assert condition
    count += 1


def denied(fn, phrase):
    global count
    try:
        fn()
        raise AssertionError('expected rejection ' + phrase)
    except ValueError as exc:
        assert phrase in str(exc), (phrase, str(exc))
    count += 1


def rows(values):
    header = ('TIMESTAMP_START,TIMESTAMP_END,FCH4,FCH4_1_1_1,CH4_1_1_1\n')
    base = header
    for start, end, fch4, alias, concentration in values:
        base += ','.join([start, end, fch4, alias, concentration])+'\n'
    return base.encode()


normal = [
    ('201301010000','201301010030','-9999.0','-9999.0','-9999.0'),
    ('201301010030','201301010100','2.500000','2.500000','1.8'),
    ('201301010100','201301010130','-9999.0','-9999.0','1.9'),
    ('201301010130','201301010200','3.75000','3.75000','2.0')
]


def make_zip(path, source=None, extra=None, absent=None):
    contents={
        module.HH: rows(normal) if source is None else source,
        module.PDF:b'%PDF-1.4 synthetic source, not official; CC BY 4.0\n',
        module.BADM:b'PK synthetic metadata, not actual spreadsheet\n'
    }
    if absent is not None: contents.pop(absent)
    if extra is not None: contents.update(extra)
    with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_STORED) as archive:
        for key,value in contents.items(): archive.writestr(key,value)


with TemporaryDirectory() as work:
    path=Path(work)/'test-source.zip'
    make_zip(path)
    sample,native=module.inspect(path)
    check(sample['coverage']['row_count']==4)
    check(sample['coverage']['valid_native_fch4_rows']==2)
    check(sample['coverage']['missing_native_fch4_rows']==2)
    check(sample['coverage']['valid_ch4_concentration_rows']==3)
    check(sample['coverage']['presence_coverage_percent']=='50.000000')
    check(sample['science_gate']['integrated_mg_ch4_m2'] is None)
    check(sample['science_gate']['annual_ch4_total'] is None)
    check(sample['science_gate']['certified_tco2e'] is None)
    check(sample['science_gate']['fch4_flux_unit_confirmed'] is False)
    check(sample['science_gate']['ch4_qc_flags_assessed'] is False)
    check(sample['science_gate']['real_source_publisher_authenticated_independently'] is False)
    check(sample['native_series_sha256']==hashlib.sha256(native).hexdigest())
    parsed=list(csv.DictReader(BytesIO(native).read().decode().splitlines()))
    check(len(parsed)==4)
    check(parsed[0]['source_presence_flag']=='MISSING_SOURCE_VALUE')
    check(parsed[1]['source_presence_flag']=='SOURCE_PRESENT_QC_UNASSESSED')
    check(parsed[1]['fch4_native_value']=='2.500000')
    check(parsed[0]['fch4_native_value']=='')
    check(module.inspect(path)[0]==sample)
    denied(lambda:module.inspect(path,PIN),'JPHRT_ARCHIVE_PIN_MISMATCH')
    denied(lambda:module.rows_from_source(rows(
      normal[:2]+[('201301010030','201301010100','2','2','-9999.0')]+normal[3:])),
      'JPHRT_NOT_CONTIGUOUS_HALF_HOUR')
    broken=list(normal);broken[2]=('201301010100','201301010130','9','10','1.9')
    denied(lambda:module.rows_from_source(rows(broken)),'JPHRT_FCH4_ALIAS_DISAGREEMENT')
    broken=list(normal);broken[1]=('201301010030','201301010100','invalid','invalid','1.8')
    denied(lambda:module.rows_from_source(rows(broken)),'JPHRT_FCH4_INVALID_NATIVE_VALUE')
    broken=list(normal);broken[1]=('201302300030','201302300100','3','3','1.8')
    denied(lambda:module.rows_from_source(rows(broken)),'JPHRT_TIMESTAMP_CALENDAR')
    broken=list(normal);broken[1]=('201301010030','201301010101','3','3','1.8')
    denied(lambda:module.rows_from_source(rows(broken)),'JPHRT_NOT_CONTIGUOUS_HALF_HOUR')
    denied(lambda:module.rows_from_source(b'no_fch4,another_column\n1,2\n'),'JPHRT_REQUIRED_COLUMNS')
    make_zip(path,absent=module.PDF)
    denied(lambda:module.inspect(path),'JPHRT_REQUIRED_SOURCE_MISSING')
    make_zip(path,extra={module.PREFIX+'../escapes.csv':b'injected'})
    denied(lambda:module.inspect(path),'JPHRT_UNSAFE_ZIP_PATH')
    make_zip(path,extra={module.PREFIX+'DATA/test-symlink':b'test'})
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',UserWarning)
        with zipfile.ZipFile(path,'a') as archive:
            archive.writestr(module.HH,b'duplicate')
    denied(lambda:module.inspect(path),'JPHRT_DUPLICATE_ZIP_PATH')

check(PIN['schema']=='naft-japanflux-jp-hrt-v200-pin-1')
check(PROFILE['dataset_version']=='2.00')
check(PROFILE['archive_sha256']==PIN['archive_sha256'])
check(PROFILE['source_hh_csv_sha256']==PIN['source_hh_csv_sha256'])
check(PROFILE['source_metadata_pdf_sha256']==PIN['source_metadata_pdf_sha256'])
check(PROFILE['source_site_badm_sha256']==PIN['source_site_badm_sha256'])
check(PROFILE['native_series_sha256']=='a6629e61fea92526bb0e2ec1f3454820fba428590875f996cec35669a1b6dcfb')
check(PROFILE['coverage']['row_count']==17520)
check(PROFILE['coverage']['valid_native_fch4_rows']==1915)
check(PROFILE['coverage']['missing_native_fch4_rows']==15605)
check(PROFILE['coverage']['valid_ch4_concentration_rows']==4619)
check(PROFILE['coverage']['native_fch4_days_with_any_value']==103)
check(PROFILE['coverage']['presence_coverage_percent']=='10.930365')
check(PROFILE['science_gate']['fch4_flux_unit_confirmed'] is False)
check(PROFILE['science_gate']['ch4_qc_flags_assessed'] is False)
check(PROFILE['science_gate']['annual_ch4_total'] is None)
check(PROFILE['science_gate']['certified_tco2e'] is None)
check(PROFILE['science_gate']['real_source_publisher_authenticated_independently'] is False)
print(f'JP_HRT_V200_NATIVE_SOURCE_INTAKE_PASS: {count} checks, no annualized methane mass')
