import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const source='data/japan-mrv-research-2026-10-18/baseline.json';
const script='scripts/japan-mrv-baseline.mjs';
const run=(...args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
const original=JSON.parse(readFileSync(source,'utf8'));
const dir=mkdtempSync(join(tmpdir(),'naft-japan-baseline-'));
try{
 const check=run('inspect');
 assert.equal(check.status,0,check.stderr);
 const data=JSON.parse(check.stdout);
 assert.deepEqual(data.coverage,{research_sites:9,selected_study_ratios:3,
   program_aggregates:4,reference_fields:10,source_urls:16});
 assert.equal(data.outcome.method_status,'CONFIG_REQUIRED');
 assert.equal(data.outcome.field_evidence_status,'EVIDENCE_REQUIRED');
 assert.equal(data.outcome.calculated_tco2,null);
 assert.equal(data.outcome.jcredit_eligibility,null);
 assert.equal(data.evidence_gates.sepolia_anchor_performed,false);
 assert.deepEqual(JSON.parse(run('inspect').stdout),data,'deterministic and source-bound');
 const site=run('site','F3');
 assert.equal(site.status,0,site.stderr);
 const sub=JSON.parse(site.stdout);
 assert.equal(sub.selected_site.name,'福島県・郡山');
 assert.equal(sub.selected_site.conventional_days,'14');
 assert.equal(sub.selected_site.treatment_days,'21 / 28');
 assert.equal(sub.selected_site.eligibility_inferred,false);
 assert.equal(sub.outcome.calculated_tco2,null);
 assert.match(run('site','BAD').stderr,/UNKNOWN_TRIAL_SITE_ID/);
 function rejectWith(name,modify,expected){
   const payload=structuredClone(original);
   modify(payload);
   const file=join(dir,name+'.json');
   writeFileSync(file,JSON.stringify(payload));
   const runResult=run('inspect','--file',file);
   assert.notEqual(runResult.status,0,'must refuse '+name);
   assert.match(runResult.stderr,new RegExp(expected),'wrong error for '+name);
 }
 rejectWith('fakeCertified',d=>d.raw_field_observations=true,
   'BASELINE_UNVERIFIED_CAPABILITY_MISREPRESENTED');
 rejectWith('zipReplaced',d=>d.input_zip_sha256='0'.repeat(64),
   'BASELINE_UNEXPECTED_ZIP_SHA256');
 rejectWith('droppedSite',d=>d.trial_sites.pop(),
   'BASELINE_RECORD_COVERAGE_INVALID');
 rejectWith('duplicateSite',d=>d.trial_sites[0].id=d.trial_sites[1].id,
   'BASELINE_RECORD_COVERAGE_INVALID');
 rejectWith('forgedRatio',d=>d.study_ratios[0].value=100,
   'RESEARCH_RATIO_UNEXPECTED_VALUE');
 rejectWith('forgedUnits',d=>d.study_ratios[0].unit='kg CH4-C/ha/year',
   'RESEARCH_RATIO_UNIT_OR_SOURCE_INVALID');
 rejectWith('aggregateAsFarm',d=>d.program_totals[0].source_id='S03',
   'PROGRAM_SOURCE_OR_GRANULARITY_INVALID');
 rejectWith('unknownSource',d=>d.trial_sites[0].source_id='S99',
   'BASELINE_SOURCE_REFERENTIAL_INTEGRITY');
 rejectWith('missingCoefficient',d=>d.ag005_reference_fields.pop(),
   'BASELINE_RECORD_COVERAGE_INVALID');
 const html=readFileSync('src/climatechain-demo.js','utf8');
 assert.match(html,/Japan \/ attributed research baseline/,'visible Japanese research context is present');
 assert.match(html,/The 100-claim demonstration below remains synthetic/,
    'live research card preserves synthetic separation');
 assert.match(html,/japan-mrv-research-2026-10-18/,
    'public demo points to source-attributed baseline');
 console.log('JAPAN_MRV_BASELINE_PASS: 9 trial designs, 3 study ratios, 4 program totals; all negative gates passed');
}finally{rmSync(dir,{recursive:true,force:true});}
