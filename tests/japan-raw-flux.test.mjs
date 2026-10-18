import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {replayFlux} from '../scripts/lib/japan-raw-flux.mjs';
const base='research/japan-field-raw-flux-2026-10-19/';
const source=readFileSync(base+'synthetic-flux.csv');
const manifest=JSON.parse(readFileSync(base+'synthetic-manifest.json','utf8'));
let passed=0;
function yes(b){assert.ok(b);passed++;}
function bad(fn,msg){assert.throws(fn,new RegExp(msg));passed++;}
function rewrap(csv,patch={}){
 const data=Buffer.from(csv,'utf8');
 return [data,{...manifest,csv_sha256:createHash('sha256').update(data).digest('hex'),...patch}];
}
const result=replayFlux(source,manifest);
yes(result.integrated_mg_ch4_m2==='2.250000000');
yes(result.integrated_kg_ch4_ha==='0.022500000');
yes(result.record_count===3&&result.sha256_matches_supplied_manifest===true);
yes(result.status==='SOURCE_UNATTESTED_ENVIRONMENT_UNMATCHED');
yes(result.original_publisher_attested===false&&result.approved_jcredit_tco2e===null);
yes(result.environment_evidence_missing.includes('climate_series_ref'));
yes(result.measurement_uncertainty===null&&result.residual_causal_allocation===null);
bad(()=>replayFlux(Buffer.concat([source,Buffer.from('x')]),manifest),'RAW_SHA256');
const lines=source.toString();
bad(()=>replayFlux(...rewrap(lines.replace('OBSERVED','MISSING'))),'RAW_MISSING');
bad(()=>replayFlux(...rewrap(lines.replace('2026-06-02T00:00:00Z,2026-06-02T12:00:00Z','2026-06-02T02:00:00Z,2026-06-02T12:00:00Z'))),'RAW_GAP');
bad(()=>replayFlux(...rewrap(lines.replace('2026-06-02T00:00:00Z,2026-06-02T12:00:00Z','2026-06-01T20:00:00Z,2026-06-02T12:00:00Z'))),'RAW_OVERLAP');
bad(()=>replayFlux(...rewrap(lines.replace('1.500000','not_a_number'))),'INVALID_FLUX');
bad(()=>replayFlux(...rewrap(lines.replace('2.000000','1000000'))),'INVALID_FLUX');
bad(()=>replayFlux(...rewrap(lines.replace('2026-06-02T12:00:00Z,2026-06-03T00:00:00Z','2026-06-02T12:00:00Z,2026-06-03T12:00:00Z'))),'RAW_INTERVAL');
bad(()=>replayFlux(...rewrap(lines.replace('2026-06-02T12:00:00Z,2026-06-03T00:00:00Z','2026-06-02T12:00:00Z,2026-06-02T18:00:00Z'))),'RAW_UNCOVERED_TAIL');
bad(()=>replayFlux(...rewrap(lines.replace('start_utc,end_utc,flux_mg_m2_day,qc_status','start_utc,end_utc,flux_kg_m2_day,qc_status'))),'RAW_CSV_HEADER');
bad(()=>replayFlux(...rewrap(lines.replaceAll('\n','\r\n'))),'RAW_CSV_ENCODING');
bad(()=>replayFlux(source,{...manifest,unit:'mg_CH4_C_m2_day'}),'RAW_GAS_UNIT');
bad(()=>replayFlux(source,{...manifest,gap_fill_policy:'LINEAR'}),'RAW_GAS_UNIT');
bad(()=>replayFlux(source,{...manifest,original_publisher_bytes_verified:true}),'UNTRUSTED_ATTESTATION');
bad(()=>replayFlux(source,{...manifest,data_class:'PRIMARY_MEASUREMENT_VERIFIED'}),'RAW_DATA_CLASS');
bad(()=>replayFlux(...rewrap(lines.replace('-0.500000','-0.5000000'))),'INVALID_FLUX');
const uc=replayFlux(source,{...manifest,data_class:'USER_SUPPLIED_UNVERIFIED',source_uri:'file:unattested'});
yes(uc.status===result.status&&uc.original_publisher_attested===false);
console.log('RAW_FLUX_INGEST_PASS: '+passed+' integrity/coverage/adversarial assertions');
