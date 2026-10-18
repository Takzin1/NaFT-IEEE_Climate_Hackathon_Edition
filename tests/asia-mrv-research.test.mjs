import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectAsiaReferences,inventoryIpcc2019Replay,methaneMassKg,n2oMassKg,
  compareMethaneSeasons,replayPhAm004Synthetic} from '../src/asia-mrv-research.mjs';
const fixture=JSON.parse(readFileSync(new URL('../data/asia-mrv-research-2026-10-18/reference-cases.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(fixture);
const manifest=JSON.parse(readFileSync(new URL('../data/asia-mrv-research-2026-10-18/source-manifest.json',import.meta.url),'utf8'));
assert.equal(manifest.original_archive_sha256,'f8d4460d8a6e3fa4129469a7e4df5995998d82484a90b7a75fdd8b610e933406');
assert.equal(manifest.official_validation,false);
assert.equal(manifest.downloaded_original_document_sha256_verified,false);
assert.equal(manifest.citations.length,10);
const fail=(fn,code)=>assert.throws(fn,new RegExp(code));
const r=inspectAsiaReferences(fixture);
assert.equal(r.scope,'RESEARCH_ONLY');
assert.equal(r.official_jcredit_tco2,null);
assert.equal(r.reference_cases,7);
assert.ok(Math.abs(r.ipcc_kg_ch4_ha_day.multiple_drainage-0.81191)<1e-12);
assert.ok(Math.abs(r.ipcc_kg_ch4_ha_day.continuous_flood-1.4762)<1e-12);
assert.equal(inventoryIpcc2019Replay().gg_ch4_year,410.47);
assert.equal(methaneMassKg(12,'kg_CH4_C'),16);
assert.equal(methaneMassKg(16,'kg_CH4'),16);
assert.equal(n2oMassKg(28,'kg_N2O_N'),44);
fail(()=>methaneMassKg(16,'kg_CH4_X'),'METHANE_MASS_BASIS_REQUIRED');
fail(()=>methaneMassKg(NaN,'kg_CH4'),'INVALID_METHANE_MASS');
fail(()=>n2oMassKg(28,'kg_CH4_C'),'N2O_MASS_BASIS_REQUIRED');
const a={gas:'CH4',period_basis:'cropping_season',season_id:'2026-1',
  country:'JP',methodology_id:'AG-005@3.3-reference',source:'https://example.org/study',
  value_kg_per_ha:12,mass_basis:'kg_CH4_C'};
assert.equal(compareMethaneSeasons(a,{...a,mass_basis:'kg_CH4',value_kg_per_ha:16}).delta_kg_ch4_per_ha_season,0);
fail(()=>compareMethaneSeasons(a,{...a,country:'PH',methodology_id:'PH_AM004@1.0'}),'JURISDICTION_METHOD_TRANSFER_BLOCKED');
fail(()=>compareMethaneSeasons(a,{...a,season_id:'2026-2'}),'SEASON_MISMATCH');
for(const fn of [
 d=>d.reference_cases.pop(),
 d=>{d.reference_cases[1].id=d.reference_cases[0].id;},
 d=>{d.reference_cases[0].expected_exact=3;},
 d=>{d.reference_cases[2].units='kg_CH4_ha_year';},
 d=>{d.reference_cases[5].awdcf_n2o_increase_percent=-1;},
 d=>{d.reference_cases[6].status='JAPAN_AG005_APPROVED';},
 d=>{d.reference_cases[4].source='https://example.org/forged';},
 d=>{d.policy='CERTIFIED';}
]){const x=copy();fn(x);fail(()=>inspectAsiaReferences(x),'INVALID|MISMATCH|FORGED|LOST|UNMET|SCOPE|DUPLICATE|SCHEMA|PROVENANCE');}
const flags=Object.fromEntries(['project_drainage_pump_included','paired_water_regime','same_soil_stratum',
  'preseason_regime_recorded','fertilizer_n_recorded','evidence_verified'].map(x=>[x,true]));
const p={country:'PH',method:'PH_AM004@1.0',approach:'DIRECT_MEASUREMENT',interval_years:3,
  reference:{CH4:120,N2O:8,PUMP_CO2:0},project:{CH4:60,N2O:12,PUMP_CO2:6},flags};
assert.equal(replayPhAm004Synthetic(p).research_net_tco2e,47.5);
assert.equal(replayPhAm004Synthetic(p).verified_jp_credits,null);
assert.equal(replayPhAm004Synthetic({...p,interval_years:4}).research_net_tco2e,45);
assert.equal(replayPhAm004Synthetic({...p,interval_years:5}).research_net_tco2e,45);
assert.equal(replayPhAm004Synthetic({...p,approach:'COUNTRY_FACTOR_PLUS_MEASUREMENT',interval_years:5}).research_net_tco2e,42.5);
fail(()=>replayPhAm004Synthetic({...p,country:'JP'}),'JURISDICTION_METHOD_TRANSFER_BLOCKED');
fail(()=>replayPhAm004Synthetic({...p,interval_years:2}),'UNSUPPORTED_MEASUREMENT_SCHEDULE');
fail(()=>replayPhAm004Synthetic({...p,project:{CH4:60,N2O:12}}),'MISSING_GAS_OR_PUMP_SCOPE');
fail(()=>replayPhAm004Synthetic({...p,project:{...p.project,PUMP_CO2:-1}}),'INVALID_GAS_COMPONENT');
fail(()=>replayPhAm004Synthetic({...p,flags:{...flags,project_drainage_pump_included:false}}),'RESEARCH_EVIDENCE_BOUNDARY_UNMET');
console.log('ASIA_MRV_RESEARCH_PASS: seven references, IPCC 410.47 Gg/yr, units, seasonal comparisons, PH-only and fail-closed gates');
