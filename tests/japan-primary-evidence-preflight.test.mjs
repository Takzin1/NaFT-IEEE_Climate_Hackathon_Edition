import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewJapanPrimarySources,preflightNidFactorCandidate,
 preflightJapanFluxObservations} from '../src/japan-primary-evidence-preflight.mjs';
const load=()=>JSON.parse(fs.readFileSync(new URL('../research/japan-primary-evidence-2026-10-18/source-register.json',import.meta.url),'utf8'));
let n=0;const check=(condition,msg)=>{assert.ok(condition,msg);n++};
const reject=(fn,pattern)=>{assert.throws(fn,new RegExp(pattern));n++};
const doc=load(),a=reviewJapanPrimarySources(doc);
check(a.status==='RESEARCH_SOURCE_DISCOVERY_ONLY');
check(a.sources===7&&a.original_published_summary_ratios===3);
check(a.raw_field_measurements_imported===0);
check(a.official_nid_factor_cells_verified===0&&a.certified_tco2e===null);
check(a.methodology_adoption_verified===false);
for(const [name,change] of [
 ['fakeAuthority',d=>d.policy.official_ag005_v35_adoption_verified=true],
 ['inventedNid',d=>d.sources[0].emission_factor_rows_ingested=1],
 ['forgedFactor',d=>d.sources[2].adopted_method_original_verified=true],
 ['fakeRaw',d=>d.sources[4].flux_rows_ingested=10],
 ['fakePublisher',d=>d.sources[4].source_sha256='f'.repeat(64)],
 ['paperMean',d=>d.sources[3].published_selected_treatment_ratios[0].value_percent=30.5],
 ['wrongOriginal',d=>d.sources[3].source_url='https://example.org/bogus'],
 ['duplicateId',d=>d.sources[1].id=d.sources[0].id],
 ['fakeModelObservation',d=>d.sources[6].field_measurements_present=true],
 ['missingSource',d=>d.sources.pop()]
]){
 const changed=load();change(changed);
 reject(()=>reviewJapanPrimarySources(changed),'INVALID|UNVERIFIED|MISLABELLED|CHANGED|AUTHORITY');
}
const hash='a'.repeat(64);
const nid={source_id:'NID_JAPAN_2026',data_kind:'INVENTORY_FACTOR_CANDIDATE',
 factor_unit:'kg_CH4_C_per_ha_year',gas:'CH4',
 official_method_use_requested:false,source_document_authenticated:false,
 local_pdf_sha256:hash,local_table_sha256:'b'.repeat(64),
 inventory_edition:'2026',factor_year:'2024',region:'Tohoku',
 drainage_class:'four_hour',water_management:'intermittent',organic_management:'straw',
 page_locator:'Chapter5/table-provisional',table_locator:'site-specific-row-unconfirmed',
 factor_value:'100'};
const nf=preflightNidFactorCandidate(nid);
check(nf.jcredit_factor_usable===false&&nf.official_reduction_tco2e===null);
check(nf.factor_value_kind==='USER_TRANSCRIBED_NOT_ADMITTED');
for(const [change,error] of [
 [x=>x.factor_unit='kg_CH4_per_ha_day','NID_FACTOR_DOMAIN'],
 [x=>x.gas='CO2','NID_FACTOR_DOMAIN'],
 [x=>x.official_method_use_requested=true,'NID_FACTOR_DOMAIN'],
 [x=>x.source_document_authenticated=true,'NID_FACTOR_DOMAIN'],
 [x=>x.local_pdf_sha256='bad','NID_SOURCE_BYTES'],
 [x=>x.inventory_edition='2024','NID_INVENTORY_EDITION'],
 [x=>x.factor_year='202X','NID_FACTOR_YEAR'],
 [x=>x.factor_value='NaN','NID_FACTOR_VALUE'],
 [x=>x.factor_value='-2','NID_FACTOR_VALUE'],
 [x=>x.region='','REQUIRED_region']
]){const row=structuredClone(nid);change(row);reject(()=>preflightNidFactorCandidate(row),error);}
const measured={schema:'naft-japanflux-raw-preflight-1',source_id:'JAPANFLUX2024_JP_HRT',
 site_id:'JP-Hrt',study_type:'SINGLE_SITE_EDDY_COVARIANCE',data_status:'STAGED_UNAUTHENTICATED_BYTES',
 gas:'CH4',variable:'FCH4',unit:'UNVERIFIED_PUBLISHER_UNIT',
 preprocessed_gap_filled:false,publication_cited:'https://doi.org/10.5194/essd-17-3807-2025',
 local_file_sha256:'c'.repeat(64),
 rows:[{timestamp_utc:'2023-07-01T00:00:00Z',flux:1.25,quality:'ORIGINAL_MEASURED'},
  {timestamp_utc:'2023-07-01T00:30:00Z',flux:null,quality:'MISSING_OR_UNUSABLE'},
  {timestamp_utc:'2023-07-01T01:00:00Z',flux:-0.25,quality:'ORIGINAL_MEASURED'}]};
const result=preflightJapanFluxObservations(measured);
check(result.observed_flux_samples===2&&result.missing_samples===1);
check(result.seasonal_integrated_kg_ch4===null);
check(result.methodology_emission_reduction_tco2e===null);
check(result.publisher_original_bytes_authenticated===false);
for(const [change,error] of [
 [x=>x.site_id='JP-Tak','JAPANFLUX_PRECHECK'],
 [x=>x.unit='nmol_CH4_m2_s','JAPANFLUX_PRECHECK'],
 [x=>x.data_status='ORIGINAL_PUBLISHER_BYTES_VERIFIED','JAPANFLUX_PRECHECK'],
 [x=>x.preprocessed_gap_filled=true,'JAPANFLUX_PRECHECK'],
 [x=>x.rows.reverse(),'FLUX_TIMESTAMP_DUPLICATE_OR_UNSORTED'],
 [x=>x.rows[1].timestamp_utc=x.rows[0].timestamp_utc,'FLUX_TIMESTAMP_DUPLICATE_OR_UNSORTED'],
 [x=>x.rows[1].flux=0,'GAP_FILL_OR_UNVERIFIED'],
 [x=>x.rows[1].quality='GAP_FILLED','GAP_FILL_OR_UNVERIFIED'],
 [x=>x.rows[0].flux=Infinity,'NONFINITE_FLUX'],
 [x=>x.rows[0].timestamp_utc='2023-02-30T00:00:00Z','FLUX_TIMESTAMP_INVALID'],
 [x=>x.rows[0].flux=1000001,'FLUX_PHYSICAL_RANGE_REVIEW'],
 [x=>x.rows[0].unexpected=1,'FLUX_ROW_SCHEMA_INVALID'],
 [x=>x.local_file_sha256='fake','JAPANFLUX_PRECHECK']
]){const row=structuredClone(measured);change(row);reject(()=>preflightJapanFluxObservations(row),error);}
console.log('JAPAN_PRIMARY_EVIDENCE_PREFLIGHT_PASS: '+n+' guard assertions; all official outputs null');
