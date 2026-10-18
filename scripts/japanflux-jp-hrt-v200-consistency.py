#!/usr/bin/env python3
"""JapanFlux JP-Hrt v2.00: cross-resolution CH4 availability & method/date gates.

Source-level temporal availability only.  No FCH4 unit conversion, QC acceptance,
annualization, causal attribution, eligibility or greenhouse-gas credit claims.
"""
import csv
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from io import StringIO
from pathlib import Path
import json
import re
import sys
import zipfile

HERE = Path(__file__).resolve().parent
spec = spec_from_file_location('jphrt_native', HERE / 'japanflux-jp-hrt-v200.py')
native_engine = module_from_spec(spec)
spec.loader.exec_module(native_engine)

RESOLUTIONS = {
    'daily': ('DD', 365),
    'monthly': ('MM', 12),
    'yearly': ('YY', 1),
}
MAIN_PREFIX = native_engine.PREFIX + 'DATA/ALLVARS/'
CSV_SUFFIX = '_2013-2014_1-4.csv'
EXPECTED_NATIVE_COLUMNS = native_engine.HEADER


def require(predicate, code):
    if not predicate:
        raise ValueError(code)


def digest(data):
    return sha256(data).hexdigest()


def plain_csv(data, needed):
    try:
        decoded = data.decode('utf-8-sig', 'strict')
    except UnicodeDecodeError as exc:
        raise ValueError('JPHRT_RESOLUTION_ENCODING') from exc
    require('\x00' not in decoded and '\r' not in decoded, 'JPHRT_RESOLUTION_NEWLINE')
    rows = csv.DictReader(StringIO(decoded, newline=''))
    require(rows.fieldnames is not None and len(rows.fieldnames) == len(set(rows.fieldnames))
            and set(needed).issubset(rows.fieldnames), 'JPHRT_RESOLUTION_HEADER')
    materialized = list(rows)
    for item in materialized:
        require(None not in item and all(value is not None for value in item.values()),
                'JPHRT_RESOLUTION_MALFORMED_ROW')
    return materialized


def native_calendar(native_bytes, method_start='20130831'):
    rows = plain_csv(native_bytes, EXPECTED_NATIVE_COLUMNS)
    require(rows and len(rows) <= 20000, 'JPHRT_NATIVE_CALENDAR_SIZE')
    require(re.fullmatch(r'20[0-9]{6}', method_start) is not None,
            'JPHRT_METHOD_DATE_INVALID')
    begin_method = datetime.strptime(method_start, '%Y%m%d')
    months = {}
    first_native = last_native = None
    earlier = None
    before_start = 0
    present = missing = 0
    month_total = 0
    for item in rows:
        first = native_engine.timestamp(item['source_timestamp_start_local'])
        last = native_engine.timestamp(item['source_timestamp_end_local'])
        require(last - first == timedelta(minutes=30)
                and (earlier is None or first == earlier),
                'JPHRT_NATIVE_WINDOW_GAP_OVERLAP')
        earlier = last
        if first_native is None:
            first_native = first
        last_native = last
        month = first.strftime('%Y-%m')
        pair = months.setdefault(month, {'rows': 0, 'present': 0, 'missing': 0})
        pair['rows'] += 1
        month_total += 1
        mark = item['source_presence_flag']
        value = item['fch4_native_value']
        if mark == 'SOURCE_PRESENT_QC_UNASSESSED':
            require(native_engine.RATE.fullmatch(value) is not None,
                    'JPHRT_PRESENT_VALUE_INVALID')
            present += 1
            pair['present'] += 1
            if first < begin_method:
                before_start += 1
            if first_native is not None:
                first_seen = first if present == 1 else first_seen
                last_seen = last
        elif mark == 'MISSING_SOURCE_VALUE':
            require(value == '', 'JPHRT_MISSING_VALUE_WITH_NUMBER')
            missing += 1
            pair['missing'] += 1
        else:
            raise ValueError('JPHRT_NATIVE_UNTRUSTED_QC_PROMOTION')
    require(first_native is not None and first_native.year == 2013
            and last_native == datetime(2014, 1, 1)
            and month_total == present + missing, 'JPHRT_NATIVE_WINDOW_INVALID')
    def six(a, b):
        return format((Decimal(a) * 100 / Decimal(b)).quantize(
            Decimal('0.000001'), rounding=ROUND_HALF_UP), '.6f')
    for part in months.values():
        part['presence_percent'] = six(part['present'], part['rows'])
    require(present > 0, 'JPHRT_NO_SOURCE_FLUX')
    return {
        'schema': 'naft-jphrt-native-temporal-presence-v1',
        'window_start_local': first_native.strftime('%Y%m%d%H%M'),
        'window_end_local': last_native.strftime('%Y%m%d%H%M'),
        'first_numeric_fch4_start_local': first_seen.strftime('%Y%m%d%H%M'),
        'last_numeric_fch4_end_local': last_seen.strftime('%Y%m%d%H%M'),
        'site_badm_method_start_local': method_start,
        'present_before_badm_method_start': before_start,
        'present_at_or_after_badm_method_start': present - before_start,
        'source_present_rows': present,
        'source_missing_rows': missing,
        'window_rows': len(rows),
        'source_value_presence_percent': six(present, len(rows)),
        'months': dict(sorted(months.items())),
        'qc_status': 'NOT_EVALUATED',
        'calculated_flux_mass': None,
        'annual_emission_estimate': None
    }


def resolution_availability(raw, expected_rows, label):
    values = plain_csv(raw, ('TIMESTAMP', 'FCH4', 'FCH4_1_1_1'))
    require(len(values) == expected_rows, 'JPHRT_'+label.upper()+'_ROW_COUNT')
    nonmissing = 0
    for line in values:
        left = line['FCH4']
        right = line['FCH4_1_1_1']
        require(left == right, 'JPHRT_'+label.upper()+'_FCH4_ALIAS_MISMATCH')
        if left not in native_engine.MISSING:
            require(native_engine.RATE.fullmatch(left) is not None,
                    'JPHRT_'+label.upper()+'_INVALID_FCH4')
            nonmissing += 1
    return {'rows': len(values), 'fch4_nonmissing_rows': nonmissing,
            'fch4_missing_rows': len(values)-nonmissing, 'source_qc_validated': False,
            'units_confirmed': False}


def audit_archive(path, source_pin, cross_pin):
    require(source_pin.get('schema') == 'naft-japanflux-jp-hrt-v200-pin-1'
            and cross_pin.get('schema') == 'naft-jphrt-v200-cross-resolution-pin-v1',
            'JPHRT_CROSS_PIN_SCHEMA')
    native_report, native_bytes = native_engine.inspect(path, source_pin)
    require(cross_pin.get('original_archive_sha256') == native_report['archive_sha256'],
            'JPHRT_CROSS_ARCHIVE_PIN_MISMATCH')
    require(native_report['native_series_sha256'] == cross_pin['expected_native_sha256'],
            'JPHRT_NATIVE_OUTPUT_PIN_MISMATCH')
    methods = cross_pin['badm_metadata_evidence']
    require(methods == {
        'badm_sheet': 'Site_General_Info',
        'badm_flux_variable': 'CH4',
        'badm_flux_method': 'Eddy Covariance',
        'badm_flux_comment': 'Closed-path eddy covariance',
        'badm_flux_start_yyyymmdd': '20130831',
        'pdf_ch4_method_text': 'HREA(Hyperbolic relaxed eddy accumulation) method and Chamber method',
        'metadata_verified_from_pinned_bytes': True,
        'independent_publisher_attestation': False,
    }, 'JPHRT_BADM_EVIDENCE_INCOMPLETE')
    calendar = native_calendar(native_bytes, methods['badm_flux_start_yyyymmdd'])
    with zipfile.ZipFile(path) as archive:
        names = native_engine.archive_members(archive)
        aggregate = {}
        for label, (suffix, expected) in RESOLUTIONS.items():
            name = MAIN_PREFIX + 'FLX_JP-Hrt_JapanFLUX2024_ALLVARS_' + suffix + CSV_SUFFIX
            require(name in names and names[name].file_size <= 2_000_000,
                    'JPHRT_AGGREGATE_FILE_MISSING_OR_TOO_LARGE:'+label)
            data = archive.read(name)
            require(digest(data) == cross_pin['aggregation_source_sha256'][label],
                    'JPHRT_AGGREGATE_SHA256_CHANGED:'+label)
            aggregate[label] = resolution_availability(data, expected, label)
    require(calendar['window_rows'] == 17520
            and calendar['source_present_rows'] == 1915
            and calendar['present_before_badm_method_start'] == 1689
            and calendar['first_numeric_fch4_start_local'] == '201306010700'
            and calendar['last_numeric_fch4_end_local'] == '201309201100',
            'JPHRT_REAL_OBSERVATION_EXPECTATIONS_CHANGED')
    if any(aggregate[name]['fch4_nonmissing_rows'] != 0 for name in RESOLUTIONS):
        raise ValueError('JPHRT_AGGREGATE_CONFLICT_REQUIRES_MANUAL_REVIEW')
    payload = {
        'schema': 'naft-jphrt-cross-resolution-audit-v1',
        'status': 'BLOCKED_SCIENTIFIC_INTERPRETATION',
        'scope': 'RAW_NATIVE_CH4_DATA_AVAILABILITY_AND_PROVENANCE_ONLY',
        'provenance': {
            'archive_sha256': native_report['archive_sha256'],
            'native_series_sha256': native_report['native_series_sha256'],
            'source_site_badm_sha256': native_report['source_site_badm_sha256'],
            'metadata_pdf_sha256': native_report['source_metadata_pdf_sha256'],
            'aggregation_source_sha256': cross_pin['aggregation_source_sha256'],
            'publisher_bytes_independently_authenticated': False,
        },
        'temporal': calendar,
        'other_resolutions': aggregate,
        'metadata_evidence': methods,
        'gates': {
            'metadata_start_date_conflict_detected': True,
            'method_label_disagreement_detected': True,
            'no_aggregated_ch4_flux_available': True,
            'native_flux_unit_confirmed': False,
            'native_qc_accepted': False,
            'no_gap_fill_applied': True,
            'eligible_for_two_engine_numeric_replay': False,
            'scientific_annual_mass_kg_ha': None,
            'official_jcredit_method_approved': False,
            'certified_tco2e': None
        }
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()
    return {**payload, 'report_sha256': digest(serialized)}


def main(argv):
    if len(argv) != 3:
        raise ValueError('USAGE: python3 scripts/japanflux-jp-hrt-v200-consistency.py ARCHIVE.zip '
                         'source-archive-pin.json cross-resolution-pin.json')
    path, original, cross = argv
    report = audit_archive(path, json.loads(Path(original).read_text()),
                           json.loads(Path(cross).read_text()))
    print(json.dumps(report, sort_keys=True, indent=2, ensure_ascii=True))


if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print('JPHRT_CROSS_RESOLUTION_BLOCKED:' + str(error), file=sys.stderr)
        sys.exit(1)
