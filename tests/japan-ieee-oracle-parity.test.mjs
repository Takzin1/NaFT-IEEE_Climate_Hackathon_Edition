/** Research adapter versus separately implemented two-language methane oracle.
 * All inputs synthetic. Never claim these are independently measured original CH4 rates.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replayObservationSeries} from '../scripts/lib/japan-observation-adapters.mjs';
import {loadAndEvaluate} from '../scripts/independent-observation-js.mjs';
import {compare} from '../scripts/observation-dual-oracle.mjs';
const bench=loadAndEvaluate('research/asia-independent-observation-2026-10-19/cases.json');
const proof=compare();
assert.equal(bench.cases.length,8);
assert.equal(proof.cases_compared,8);
const map=new Map(bench.cases.map(x=>[x.case_id,x]));
const inputs=[
 ['interval','JP_INTERVAL_COMPLETE_SYNTHETIC'],
 ['daily','KR_DAILY_MISSING_SYNTHETIC'],
 ['eddy','KR_EDDY_NMOL_SYNTHETIC'],
 ['umol','CN_EDDY_UMOL_SYNTHETIC'],
 ['carbon','CN_DAILY_CARBON_SYNTHETIC']
];
let n=0;
for(const [name,id] of inputs){
 const root='research/japan-observation-adapters-2026-10-19/'+name;
 const data=readFileSync(root+'.csv');
 const manifest=JSON.parse(readFileSync(root+'.manifest.json','utf8'));
 const actual=replayObservationSeries(data,manifest),reference=map.get(id);
 assert.equal(actual.adapter_id,reference.adapter_id);n++;
 assert.equal(actual.coverage_status,reference.coverage_status);n++;
 assert.equal(actual.measured_coverage_percent,reference.measured_coverage_pct);n++;
 assert.equal(actual.observed_only_integral_mg_ch4_m2,reference.observed_mg_ch4_m2);n++;
 assert.equal(actual.observed_only_integral_kg_ch4_ha,reference.observed_kg_ch4_ha);n++;
 assert.equal(actual.full_window_total_mg_ch4_m2,reference.full_window_mg_ch4_m2);n++;
 assert.equal(actual.observed_seconds,reference.observed_seconds);n++;
 assert.equal(actual.excluded_qc_seconds,reference.qc_excluded_seconds);n++;
 assert.equal(actual.unrepresented_gap_seconds,reference.unrepresented_seconds);n++;
 assert.equal(actual.certified_tco2e,null);n++;
 assert.equal(reference.certified_tco2e,null);n++;
}
console.log('JAPAN_IEEE_ORACLE_PARITY_PASS: '+n+' cross-version comparisons, actual original measurement replication not claimed');
