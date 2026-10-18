#!/usr/bin/env python3
"""Second independent methane flux replay: Python Decimal + datetime UTC.
Does not import JavaScript, reuse BigInt equations, read verified publisher observations,
estimate official climate claims, or impute missing measurements.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP, localcontext
from pathlib import Path
import hashlib
import json
import re
import sys

ADAPTERS={
 'INTERVAL_MG_CH4_M2_DAY_V1':('mg_CH4_m2_day','CH4_MOLECULAR',604800,None),
 'DAILY_G_CH4_M2_DAY_V1':('g_CH4_m2_day','CH4_MOLECULAR',86400,86400),
 'EDDY_NMOL_CH4_M2_S_V1':('nmol_CH4_m2_s','CH4_MOLECULAR',3600,None),
 'EDDY_UMOL_CH4_M2_S_V1':('umol_CH4_m2_s','CH4_MOLECULAR',3600,None),
 'DAILY_G_CH4_C_M2_DAY_V1':('g_CH4_C_m2_day','CH4_C',86400,86400)}
RATE_RE=re.compile(r'-?(0|[1-9][0-9]{0,5})(\.[0-9]{1,6})?\Z')
DATE_RE=re.compile(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\Z')
ID_RE=re.compile(r'[A-Z0-9_]{5,100}\Z')

def fail(code):
 raise ValueError(code)

def utc(text):
 if not isinstance(text,str) or not DATE_RE.fullmatch(text):fail('INVALID_UTC')
 try:
  dt=datetime.strptime(text,'%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
 except ValueError:fail('INVALID_CALENDAR')
 if dt.strftime('%Y-%m-%dT%H:%M:%SZ')!=text:fail('INVALID_CALENDAR')
 return dt

def number(s):
 if not isinstance(s,str) or not RATE_RE.fullmatch(s):fail('INVALID_DECIMAL')
 return Decimal(s)

def q(value,places):
 return format(value.quantize(Decimal(1).scaleb(-places),rounding=ROUND_HALF_UP),f'.{places}f')

def independent_integrate(case):
 # Structural and provenance guards intentionally implemented separately from the JS engine.
 if not isinstance(case,dict) or not isinstance(case.get('case_id'),str) or not ID_RE.fullmatch(case['case_id']):
  fail('INVALID_CASE')
 if case.get('source_status')!='SYNTHETIC' or not str(case.get('source_ref','')).startswith('urn:naft:synthetic:') \
  or case.get('publisher_original_attested') is not False \
  or case.get('field_conditions_verified') is not False \
  or case.get('certification_eligible') is not False or case.get('jurisdiction') not in ('JP','KR','CN'):
  fail('CASE_PROVENANCE_PROMOTION')
 adapter_id=case.get('adapter_id')
 if adapter_id not in ADAPTERS:fail('ADAPTER_NOT_REGISTERED')
 unit,basis,max_seconds,exact_seconds=ADAPTERS[adapter_id]
 if case.get('rate_unit')!=unit or case.get('mass_basis')!=basis:fail('UNIT_OR_BASIS_MISMATCH')
 start,end=utc(case.get('observation_start_utc')),utc(case.get('observation_end_utc'))
 seconds=int((end-start).total_seconds())
 if seconds<=0 or seconds>366*86400:fail('INVALID_WINDOW')
 rows=case.get('rows')
 if not isinstance(rows,list) or not 1<=len(rows)<=10000:fail('INVALID_OBSERVATION_ROWS')
 measured=excluded=unrepresented=0
 last=start
 amount=Decimal(0)
 with localcontext() as context:
  context.prec=46
  for row in rows:
   if not isinstance(row,dict):fail('MALFORMED_ROW')
   lo,hi=utc(row.get('start_utc')),utc(row.get('end_utc'))
   delta=int((hi-lo).total_seconds())
   if lo<last:fail('OVERLAPPING_OR_REORDERED_ROWS')
   if lo>=end or hi>end or delta<=0 or delta>max_seconds or (exact_seconds and delta!=exact_seconds):
    fail('INVALID_OBSERVATION_INTERVAL')
   unrepresented+=int((lo-last).total_seconds())
   qc=row.get('qc_status')
   if qc in ('OBSERVED_GOOD','OBSERVED_ACCEPTABLE'):
    v=number(row.get('value'))
    if adapter_id=='INTERVAL_MG_CH4_M2_DAY_V1':delta_mg=v*Decimal(delta)/Decimal(86400)
    elif adapter_id=='DAILY_G_CH4_M2_DAY_V1':delta_mg=v*Decimal(1000)*Decimal(delta)/Decimal(86400)
    elif adapter_id=='EDDY_NMOL_CH4_M2_S_V1':delta_mg=v*Decimal(delta)*Decimal('16.04')/Decimal(1000000)
    elif adapter_id=='EDDY_UMOL_CH4_M2_S_V1':delta_mg=v*Decimal(delta)*Decimal('16.04')/Decimal(1000)
    else:delta_mg=v*Decimal(delta)/Decimal(86400)*Decimal(1000)*Decimal(16)/Decimal(12)
    amount+=delta_mg
    measured+=delta
   elif qc in ('MISSING','IMPUTED_RESEARCH'):
    if row.get('value')!='':fail('EXCLUDED_RATE_MUST_BE_BLANK')
    excluded+=delta
   else:fail('QC_STATUS_NOT_SUPPORTED')
   last=hi
  unrepresented+=int((end-last).total_seconds())
  if measured+excluded+unrepresented!=seconds:fail('COVERAGE_IDENTITY_INVALID')
  status='NO_OBSERVATION' if measured==0 else 'COMPLETE_OBSERVED' if measured==seconds else 'PARTIAL_OBSERVED'
  mg=None if measured==0 else q(amount,9)
  kg=None if measured==0 else q(amount/Decimal(100),9)
  pct=q(Decimal(measured)*Decimal(100)/Decimal(seconds),6)
 return {'case_id':case['case_id'],'adapter_id':adapter_id,'source_status':'SYNTHETIC',
  'coverage_status':status,'observed_seconds':str(measured),'qc_excluded_seconds':str(excluded),
  'unrepresented_seconds':str(unrepresented),'window_seconds':str(seconds),
  'measured_coverage_pct':pct,'observed_mg_ch4_m2':mg,'observed_kg_ch4_ha':kg,
  'full_window_mg_ch4_m2':mg if status=='COMPLETE_OBSERVED' else None,
  'certified_tco2e':None,'environment_causal_share':None}

def evaluate(blob):
 if len(blob)>2_000_000:fail('SOURCE_FILE_SIZE_LIMIT')
 item=json.loads(blob)
 if not isinstance(item,dict) or item.get('schema')!='naft-independent-observation-fixtures-v1' \
  or item.get('data_class')!='SYNTHETIC_TEST_ONLY' or item.get('documented_original_observations') is not False \
  or item.get('measured_emissions_claimed') is not False or item.get('source_catalog_only') is not True \
  or item.get('precision_decimals')!=9 or not isinstance(item.get('cases'),list) \
  or not 1<=len(item['cases'])<=100:fail('UNATTESTED_ONLY_SCHEMA')
 seen=set()
 outputs=[]
 for case in item['cases']:
  if not isinstance(case,dict):fail('INVALID_CASE')
  ident=case.get('case_id')
  if ident in seen:fail('DUPLICATE_OR_INVALID_CASE')
  seen.add(ident)
  outputs.append(independent_integrate(case))
 return {'schema':'naft-independent-observation-results-v1','precision_decimals':9,
  'source_fixture_sha256':hashlib.sha256(blob).hexdigest(),
  'source_data_class':'SYNTHETIC_TEST_ONLY','publisher_original_attested':False,
  'official_factor_approved':False,'scientific_replication_verified':False,'cases':outputs}

if __name__=='__main__':
 try:
  if len(sys.argv)>2:fail('USAGE: independent-observation-py.py [input.json]')
  file=Path(sys.argv[1] if len(sys.argv)==2 else 'research/asia-independent-observation-2026-10-19/cases.json')
  print(json.dumps(evaluate(file.read_bytes()),indent=2))
 except (ValueError,AssertionError,KeyError,TypeError,OSError) as e:
  print('PY_ORACLE_BLOCKED:'+str(e),file=sys.stderr)
  sys.exit(1)
