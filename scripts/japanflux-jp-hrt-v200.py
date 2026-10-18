#!/usr/bin/env python3
"""NaFT JP-Hrt v2.00: local archive-to-native-CH4 evidence intake.

The original archive is NOT bundled. Local hashes demonstrate exact-byte
consistency with a user-supplied archive, not independent publisher attestation.
FCH4 unit / quality flag not established: no methane-mass integrations or credits.
"""
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import stat
import sys
import zipfile
from datetime import datetime, timedelta

PREFIX = 'A20241210-020/'
HH = PREFIX + 'DATA/ALLVARS/FLX_JP-Hrt_JapanFLUX2024_ALLVARS_HH_2013-2014_1-4.csv'
PDF = PREFIX + 'PDF/A20241210-020_v200.pdf'
BADM = PREFIX + 'DATA/BADM/JP-Hrt_BADM-Site_General_Info.xlsx'
HEADER = ['source_timestamp_start_local', 'source_timestamp_end_local',
          'fch4_native_value', 'source_presence_flag']
MISSING = {'-9999', '-9999.0', '-9999.00'}
REQUIRED = {'TIMESTAMP_START', 'TIMESTAMP_END', 'FCH4', 'FCH4_1_1_1', 'CH4_1_1_1'}
SHA = re.compile(r'[0-9a-f]{64}\Z')
RATE = re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?\Z')


def reject(message):
    raise ValueError(message)


def checksum(data):
    return hashlib.sha256(data).hexdigest()


def timestamp(value):
    if not re.fullmatch(r'[0-9]{12}', value):
        reject('JPHRT_TIMESTAMP_FORMAT')
    try:
        return datetime.strptime(value, '%Y%m%d%H%M')
    except ValueError as exc:
        raise ValueError('JPHRT_TIMESTAMP_CALENDAR') from exc


def archive_members(archive):
    items = archive.infolist()
    if not 1 <= len(items) <= 100 or sum(x.file_size for x in items) > 300_000_000:
        reject('JPHRT_ZIP_SIZE_OR_ENTRY_LIMIT')
    if len({x.filename for x in items}) != len(items):
        reject('JPHRT_DUPLICATE_ZIP_PATH')
    for item in items:
        name = item.filename
        if (not name.startswith(PREFIX) or '\\' in name or '\x00' in name
                or '..' in name.split('/') or name.startswith('/')):
            reject('JPHRT_UNSAFE_ZIP_PATH')
        if item.flag_bits & 1:
            reject('JPHRT_ENCRYPTED_ZIP_MEMBER')
        if stat.S_IFMT(item.external_attr >> 16) == stat.S_IFLNK:
            reject('JPHRT_ZIP_SYMLINK')
        if item.compress_size and item.file_size / item.compress_size > 100:
            reject('JPHRT_ZIP_DECOMPRESSION_RATIO')
    lookup = {x.filename: x for x in items}
    for name in (HH, PDF, BADM):
        if name not in lookup or lookup[name].is_dir():
            reject('JPHRT_REQUIRED_SOURCE_MISSING')
    if (lookup[HH].file_size > 25_000_000
            or lookup[PDF].file_size > 1_000_000
            or lookup[BADM].file_size > 1_000_000):
        reject('JPHRT_REQUIRED_SOURCE_TOO_LARGE')
    return lookup


def rows_from_source(raw):
    try:
        stream = io.StringIO(raw.decode('utf-8-sig', 'strict'))
    except UnicodeDecodeError as exc:
        raise ValueError('JPHRT_SOURCE_ENCODING') from exc
    reader = csv.DictReader(stream)
    if (not reader.fieldnames or len(reader.fieldnames) != len(set(reader.fieldnames))
            or not REQUIRED.issubset(reader.fieldnames)):
        reject('JPHRT_REQUIRED_COLUMNS')
    earlier = None
    observed = 0
    methane_concentration = 0
    values = []
    first = last = None
    day_counts = {}
    native = []
    for row in reader:
        if None in row or any(value is None for value in row.values()):
            reject('JPHRT_MALFORMED_CSV_ROW')
        begin = timestamp(row['TIMESTAMP_START'])
        end = timestamp(row['TIMESTAMP_END'])
        if (end - begin != timedelta(minutes=30)
                or (earlier is not None and begin != earlier)):
            reject('JPHRT_NOT_CONTIGUOUS_HALF_HOUR')
        if first is None:
            first = begin
        last = end
        earlier = end
        value = row['FCH4']
        if value != row['FCH4_1_1_1']:
            reject('JPHRT_FCH4_ALIAS_DISAGREEMENT')
        if row['CH4_1_1_1'] not in MISSING:
            if not RATE.fullmatch(row['CH4_1_1_1']):
                reject('JPHRT_INVALID_CONCENTRATION_VALUE')
            methane_concentration += 1
        if value in MISSING:
            native.append([row['TIMESTAMP_START'], row['TIMESTAMP_END'], '',
                           'MISSING_SOURCE_VALUE'])
        else:
            if not RATE.fullmatch(value):
                reject('JPHRT_FCH4_INVALID_NATIVE_VALUE')
            observed += 1
            day = row['TIMESTAMP_START'][:8]
            day_counts[day] = day_counts.get(day, 0) + 1
            values.append(value)
            native.append([row['TIMESTAMP_START'], row['TIMESTAMP_END'], value,
                           'SOURCE_PRESENT_QC_UNASSESSED'])
        if len(native) > 20000:
            reject('JPHRT_TOO_MANY_SOURCE_ROWS')
    if not native or not values:
        reject('JPHRT_EMPTY_OR_NO_SOURCE_FLUX')
    return native, {
        'row_count': len(native),
        'valid_native_fch4_rows': observed,
        'missing_native_fch4_rows': len(native) - observed,
        'valid_ch4_concentration_rows': methane_concentration,
        'native_fch4_days_with_any_value': len(day_counts),
        'first_source_timestamp_local': first.strftime('%Y%m%d%H%M'),
        'last_source_timestamp_end_local': last.strftime('%Y%m%d%H%M'),
        'source_time_interval_minutes': 30,
        'observed_seconds_native_presence_only': observed * 1800,
        'window_seconds': len(native) * 1800,
        'presence_coverage_percent': f'{observed / len(native) * 100:.6f}',
        'source_fch4_native_min': str(min(float(v) for v in values)),
        'source_fch4_native_max': str(max(float(v) for v in values)),
        'fch4_aliased_columns_equal': True
    }


def export_native_bytes(native):
    stream = io.StringIO(newline='')
    writer = csv.writer(stream, lineterminator='\n')
    writer.writerow(HEADER)
    writer.writerows(native)
    return stream.getvalue().encode('utf-8')


def inspect(path, pinned=None):
    archive_path = Path(path)
    if (not archive_path.is_file() or archive_path.stat().st_size > 220_000_000
            or archive_path.stat().st_size < 200):
        reject('JPHRT_ARCHIVE_SIZE')
    with archive_path.open('rb') as stream:
        archive_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    if pinned is not None:
        if (pinned.get('schema') != 'naft-japanflux-jp-hrt-v200-pin-1'
                or not SHA.fullmatch(pinned.get('archive_sha256', ''))):
            reject('JPHRT_PIN_SCHEMA')
        if archive_hash != pinned['archive_sha256']:
            reject('JPHRT_ARCHIVE_PIN_MISMATCH')
    with zipfile.ZipFile(archive_path) as archive:
        lookup = archive_members(archive)
        half_hour = archive.read(HH)
        pdf = archive.read(PDF)
        badm = archive.read(BADM)
    hashes = {
        'source_hh_csv_sha256': checksum(half_hour),
        'source_metadata_pdf_sha256': checksum(pdf),
        'source_site_badm_sha256': checksum(badm)
    }
    if pinned is not None:
        for key, value in hashes.items():
            if pinned.get(key) != value:
                reject('JPHRT_MEMBER_PIN_MISMATCH:' + key)
    native, coverage = rows_from_source(half_hour)
    if pinned is not None and (
        coverage['row_count'] != 17520
        or coverage['valid_native_fch4_rows'] != 1915
        or coverage['first_source_timestamp_local'] != '201301010000'
        or coverage['last_source_timestamp_end_local'] != '201401010000'
    ):
        reject('JPHRT_PINNED_COVERAGE_CHANGED')
    exported = export_native_bytes(native)
    report = {
        'schema': 'naft-japanflux-jp-hrt-native-intake-v1',
        'state': 'ORIGINAL_ARCHIVE_LOCALLY_REPLAYED_SOURCE_QC_AND_UNITS_UNVERIFIED',
        'dataset_id': 'A20241210-020', 'dataset_version': '2.00',
        'source_attribution': (
            'Komiya, S. (2025). JapanFlux2024 JP-Hrt Hiratsuka Rice Paddy, '
            'v2.00, Arctic Data archive System, DOI:10.17592/001.2024121020 '
            '(CC BY 4.0 shown in bundled metadata PDF)'
        ),
        'archive_sha256': archive_hash, **hashes,
        'native_series_sha256': checksum(exported),
        'archive_file_count': len(lookup),
        'coverage': coverage,
        'science_gate': {
            'timestamp_basis': 'LOCAL_TIME_SITE_BADM_UTC_OFFSET_PLUS_9_REVIEWED',
            'measurement_method': 'CONFLICT_PDF_HREA_CHAMBER_BADM_EC_REQUIRES_REVIEW',
            'fch4_flux_unit_confirmed': False,
            'ch4_qc_flags_assessed': False,
            'missing_intervals_gap_filled': False,
            'real_source_timeseries_present': True,
            'real_source_publisher_authenticated_independently': False,
            'integrated_mg_ch4_m2': None,
            'annual_ch4_total': None,
            'official_ag005_factor_verified': False,
            'certified_tco2e': None
        }
    }
    return report, exported


def run_cli(argv):
    if len(argv) not in (3, 4) or argv[0] not in ('inspect', 'export'):
        reject('USAGE: python3 scripts/japanflux-jp-hrt-v200.py '
               'inspect|export ARCHIVE.zip PIN.json [OUT.csv]')
    mode, path, pin_path = argv[:3]
    if ((mode == 'inspect' and len(argv) != 3)
            or (mode == 'export' and len(argv) != 4)):
        reject('JPHRT_ARGUMENTS')
    pin = json.loads(Path(pin_path).read_text(encoding='utf-8'))
    report, native = inspect(path, pin)
    if mode == 'export':
        output = Path(argv[3])
        output.write_bytes(native)
        report['native_export_local_file'] = str(output)
    print(json.dumps(report, sort_keys=True, indent=2))


if __name__ == '__main__':
    try:
        run_cli(sys.argv[1:])
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print('JPHRT_INTAKE_BLOCKED:' + str(exc), file=sys.stderr)
        sys.exit(1)
