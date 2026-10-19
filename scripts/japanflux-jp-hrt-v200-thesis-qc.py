#!/usr/bin/env python3
"""JP-Hrt 2013: dissertation-bound *preliminary* CH4 QC proxy audit.

Never upgrades numeric FCH4 to accepted QC, NEVER calculates a methane mass.
Source data/filtered data/gap-filled study budgets are separate evidence classes.
"""
import csv
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from io import StringIO
import json
from pathlib import Path
import sys
import zipfile

HERE = Path(__file__).resolve().parent
spec = spec_from_file_location('jphrt_native_v200', HERE / 'japanflux-jp-hrt-v200.py')
native = module_from_spec(spec)
spec.loader.exec_module(native)
THESIS_SHA = '613b17df36750cc0917d5c142c377d4f42f58a21b14c14cdaaf591f63b8d376e'
OBS_REQUIRED = ('TIMESTAMP_START', 'TIMESTAMP_END', 'FCH4', 'FCH4_1_1_1',
                'WD_1_1_1', 'USTAR_1_1_1', 'P_RAIN_1_1_1')
MISSING = frozenset(native.MISSING | {''})
# These values follow Komiya dissertation Chapter 2.3.5 (2015), PDF pp.22-23.
WIND_EXCLUSION = (Decimal('76'), Decimal('107'))
USTAR_THRESHOLD = Decimal('0.07')


def fail(message):
    raise ValueError(message)


def require(condition, code):
    if not condition:
        fail(code)


def sha(data):
    return sha256(data).hexdigest()


def check_thesis(thesis_pdf, evidence):
    require(evidence.get('schema') == 'naft-jphrt-komiya-dissertation-scientific-method-v1',
            'JPHRT_METHOD_EVIDENCE_SCHEMA')
    ref = evidence.get('reference', {})
    require(ref.get('pdf_sha256') == THESIS_SHA
            and sha(thesis_pdf) == THESIS_SHA, 'JPHRT_THESIS_ORIGINAL_SHA_MISMATCH')
    scope = evidence.get('study_scope', {})
    require(scope.get('japan_ch4_method') == 'CLOSED_PATH_EDDY_COVARIANCE'
            and scope.get('thailand_ch4_method') == 'HYPERBOLIC_RELAXED_EDDY_ACCUMULATION'
            and scope.get('stream_mapping_to_ads_fch4_independently_verified') is False,
            'JPHRT_METHOD_STREAM_PREMATURELY_ATTESTED')
    filters = evidence.get('site_specific_quality_filters', {})
    require(filters.get('japan_wind_direction_exclusion_degrees') == [76, 107]
            and filters.get('japan_low_turbulence_ustar_threshold_m_s') == '0.07'
            and filters.get('rainfall_periods_excluded') is True
            and filters.get('ec150_co2_signal_strength_minimum') == '0.7'
            and filters.get('ec150_h2o_signal_strength_minimum') == '0.7'
            and filters.get('stationarity_covariance_disagreement_exclusion_percent') == '40'
            and filters.get('rice_paddy_footprint_minimum_percent') == '60',
            'JPHRT_METHOD_FILTER_EVIDENCE_CHANGED')
    budget = evidence.get('published_study_budget', {})
    require(budget.get('missing_half_hourly_ch4_estimated_by_site_specific_log_ch4_air_temperature_regression') is True
            and budget.get('may_not_silently_gap_fill_original_dataset') is True
            and budget.get('site_specific_regression_coefficients_verified_for_replay') is False,
            'JPHRT_ORIGINAL_IMPUTATION_POLICY_VIOLATED')
    state = evidence.get('review_state', {})
    require(state.get('source_fch4_numeric_entries_qc_accepted') is False
            and state.get('annual_emissions') is None
            and state.get('certified_tco2e') is None,
            'JPHRT_METHOD_UNSAFE_ATTESTATION')


def number(value, name):
    if value in MISSING:
        return None
    if not native.RATE.fullmatch(value):
        fail('JPHRT_PROXY_NUMBER_INVALID:' + name)
    try:
        found = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError('JPHRT_PROXY_NUMBER_INVALID:' + name) from exc
    require(found.is_finite(), 'JPHRT_PROXY_NONFINITE:' + name)
    return found


def classify_proxies(row):
    """Only screening signals, never accepted observations or definitive exclusions."""
    wd = number(row['WD_1_1_1'], 'WD')
    ustar = number(row['USTAR_1_1_1'], 'USTAR')
    rain = number(row['P_RAIN_1_1_1'], 'RAIN')
    if wd is not None:
        require(0 <= wd <= 360, 'JPHRT_WIND_RANGE')
    if ustar is not None:
        require(ustar >= 0, 'JPHRT_USTAR_RANGE')
    if rain is not None:
        require(rain >= 0, 'JPHRT_RAIN_RANGE')
    possible_wind = wd is not None and WIND_EXCLUSION[0] <= wd <= WIND_EXCLUSION[1]
    possible_low_turbulence = ustar is not None and ustar <= USTAR_THRESHOLD
    possible_rain = rain is not None and rain > 0
    missing = tuple(name for name, value in (('WD', wd), ('USTAR', ustar), ('RAIN', rain))
                    if value is None)
    return {
        'candidate_wind_exclusion': possible_wind,
        'candidate_low_ustar': possible_low_turbulence,
        'candidate_rainfall': possible_rain,
        'proxy_variables_unavailable': missing,
        'candidate_flagged_any': possible_wind or possible_low_turbulence or possible_rain,
        'review_only_not_accepted': True
    }


def audit(archive_path, original_pin, thesis_pdf, evidence, expected_native_sha=None):
    check_thesis(thesis_pdf, evidence)
    # Reuse existing pinned archive/member checks, sequence and alias invariants.
    source_report, native_bytes = native.inspect(archive_path, original_pin)
    if expected_native_sha is not None:
        require(sha(native_bytes) == expected_native_sha, 'JPHRT_NATIVE_EXPORT_HASH_CHANGED')
    with zipfile.ZipFile(archive_path) as archive:
        raw = archive.read(native.HH)
    try:
        source = StringIO(raw.decode('utf-8-sig', 'strict'), newline='')
    except UnicodeDecodeError as exc:
        raise ValueError('JPHRT_PROXY_CSV_ENCODING') from exc
    reader = csv.DictReader(source)
    require(reader.fieldnames is not None and len(reader.fieldnames) == len(set(reader.fieldnames))
            and set(OBS_REQUIRED).issubset(reader.fieldnames),
            'JPHRT_REQUIRED_PROXY_COLUMNS')
    fields = (
        'candidate_wind_exclusion', 'candidate_low_ustar',
        'candidate_rainfall', 'candidate_flagged_any'
    )
    counts = {key: 0 for key in fields}
    unknown = {name: 0 for name in ('WD', 'USTAR', 'RAIN')}
    numerical = missing = 0
    all_proxy_available_no_flag = 0
    unknown_without_flag = 0
    trace = []
    for row in reader:
        require(None not in row and all(x is not None for x in row.values()),
                'JPHRT_MALFORMED_PROXY_ROW')
        value = row['FCH4']
        require(value == row['FCH4_1_1_1'], 'JPHRT_PROXY_FCH4_ALIAS')
        if value in MISSING:
            missing += 1
            continue
        number(value, 'FCH4')
        numerical += 1
        result = classify_proxies(row)
        for key in fields:
            counts[key] += int(result[key])
        for name in result['proxy_variables_unavailable']:
            unknown[name] += 1
        if not result['candidate_flagged_any']:
            if result['proxy_variables_unavailable']:
                unknown_without_flag += 1
            else:
                all_proxy_available_no_flag += 1
        trace.append((row['TIMESTAMP_START'], str(int(result['candidate_wind_exclusion'])),
                      str(int(result['candidate_low_ustar'])),
                      str(int(result['candidate_rainfall'])),
                      '|'.join(result['proxy_variables_unavailable'])))
    require(numerical == source_report['coverage']['valid_native_fch4_rows']
            and missing == source_report['coverage']['missing_native_fch4_rows'],
            'JPHRT_PROXY_NATIVE_COVERAGE_MISMATCH')
    # A compact trace digest binds each source-numeric timestamp and screening reason,
    # without uploading the complete raw dataset or labeling any row as accepted QC.
    trace_bytes = ('\n'.join('|'.join(row) for row in trace) + '\n').encode('utf-8')
    payload = {
        'schema': 'naft-jphrt-dissertation-qc-preflight-v1',
        'status': 'BLOCKED_EXTERNAL_QC_REQUIRED',
        'source': {
            'dataset_id': source_report['dataset_id'],
            'dataset_version': source_report['dataset_version'],
            'archive_sha256': source_report['archive_sha256'],
            'native_series_sha256': source_report['native_series_sha256'],
            'original_flux_csv_sha256': source_report['source_hh_csv_sha256'],
            'user_supplied_dissertation_sha256': sha(thesis_pdf),
            'method_evidence_sha256': sha(json.dumps(
                evidence, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()),
            'candidate_trace_sha256': sha(trace_bytes)
        },
        'method': {
            'japan_2013_historical_method': 'CLOSED_PATH_EDDY_COVARIANCE',
            'thailand_2014_historical_method': 'HYPERBOLIC_RELAXED_EDDY_ACCUMULATION',
            'japan_instruments': ['CSAT3A', 'Picarro G2301-f'],
            'dissertation_calc_unit': 'mg_CH4_m-2_s-1',
            'released_product_fch4_unit_from_this_thesis': None,
            'released_product_method_stream_independently_mapped': False,
            'signal_stationarity_footprint_evidence_available': False,
            'source_ch4_specific_qc_flag_verified': False,
            'study_gap_filled_budget_distinct_from_original_flux_csv': True
        },
        'screening': {
            'native_numeric_fch4_rows': numerical,
            'native_missing_fch4_rows': missing,
            'candidate_wind_exclusion_rows': counts['candidate_wind_exclusion'],
            'candidate_low_ustar_rows': counts['candidate_low_ustar'],
            'candidate_rainfall_rows': counts['candidate_rainfall'],
            'candidate_flagged_any_rows': counts['candidate_flagged_any'],
            'proxy_missing_wd_rows': unknown['WD'],
            'proxy_missing_ustar_rows': unknown['USTAR'],
            'proxy_missing_rain_rows': unknown['RAIN'],
            'no_candidate_flag_all_three_proxies_available': all_proxy_available_no_flag,
            'no_candidate_flag_but_some_proxy_missing': unknown_without_flag,
            'qc_accepted_rows': 0,
            'qc_accepted_rows_are_zero_because_unverified': True,
            'counting_rule': 'OVERLAPPING_PRELIMINARY_PROXY_FLAGS_NOT_FINAL_QC'
        },
        'gates': {
            'wind_direction_threshold_reference_available': True,
            'u_star_threshold_reference_available': True,
            'rainfall_presence_proxy_available': True,
            'stationarity_5min_raw_covariances_available': False,
            'EC150_signal_strength_columns_verified_available': False,
            'rice_field_footprint_fraction_available': False,
            'instrument_start_date_conflict_resolved': False,
            'fch4_flux_units_independently_verified_in_dataset_dictionary': False,
            'safe_to_assign_observed_good_qc': False,
            'safe_to_integrate_flux_mass': False,
            'annual_ch4_emission': None,
            'approved_AG005_reduction': None,
            'certified_tco2e': None
        }
    }
    b=json.dumps(payload,sort_keys=True,separators=(',', ':'),ensure_ascii=True).encode()
    return {**payload, 'report_sha256': sha(b)}


def main(args):
    if len(args) not in (4, 5):
        fail('USAGE: python3 scripts/japanflux-jp-hrt-v200-thesis-qc.py '
             'ORIGINAL.zip SOURCE-PIN.json THESIS.pdf EVIDENCE.json [NATIVE-PROFILE.json]')
    archive, pin, pdf, evidence_path = args[:4]
    source_pin = json.loads(Path(pin).read_text(encoding='utf-8'))
    evidence = json.loads(Path(evidence_path).read_text(encoding='utf-8'))
    native_sha = None
    if len(args) == 5:
        native_sha = json.loads(Path(args[4]).read_text(encoding='utf-8'))['native_series_sha256']
    thesis = Path(pdf).read_bytes()
    require(len(thesis) < 12_000_000, 'JPHRT_THESIS_PDF_TOO_LARGE')
    print(json.dumps(audit(archive, source_pin, thesis, evidence, native_sha),
                     sort_keys=True, indent=2))


if __name__ == '__main__':
    try:
        main(sys.argv[1:])
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as err:
        print('JPHRT_THESIS_QC_GATE_BLOCKED:' + str(err), file=sys.stderr)
        sys.exit(1)
