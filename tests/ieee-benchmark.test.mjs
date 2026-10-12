import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cli=path.resolve('scripts/ieee-benchmark.mjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'naft-ieee-benchmark-'));
let passed=0;
function check(condition,label) { assert.ok(condition,label);passed++; }
function run(args) {
  return spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:120000});
}
try {
  const file=path.join(dir,'benchmark.json');
  const result=run(['--sizes','100,200,500','--iterations','3','--output',file]);
  check(result.status===0,'real 3-size synthetic benchmark succeeds: '+result.stderr);
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  check(data.schema==='naft-ieee-strategy-benchmark-1','versioned benchmark schema');
  check(data.scope.includes('synthetic'),'source boundaries remain explicit');
  check(data.iterations===3&&data.results.length===3,'three 3-sample size groups observed');
  const sizes=[100,200,500];
  for(let i=0;i<sizes.length;i++) {
    const row=data.results[i],size=sizes[i],factor=size/100;
    check(row.size===size&&row.counts.total===size,
      'case '+size+' uses full synthetic workload');
    check(row.counts.require_reverification===30*factor&&
      row.counts.UNAFFECTED===70*factor,
      'selection counts scale from actually executed fixture: '+size);
    check(row.counts.AUTO_REEVALUATED===15*factor&&
      row.counts.EVIDENCE_REQUIRED===15*factor,
      'blocked evidence cases scale across fixture: '+size);
    check(row.output_work_units.full_successor_packages===size &&
      row.output_work_units.selective_successor_packages===30*factor &&
      row.output_work_units.skipped_successor_packages===70*factor,
      'both actual package work units captured: '+size);
    check(Object.values(row.parity).every(Boolean),
      'all predecessor and selected successor hashes match: '+size);
    check(/^[0-9a-f]{64}$/.test(row.synthetic_workload_sha256),
      'dataset identity is hashed: '+size);
    check(row.runtime_ms.full_predecessors_plus_all_successors.samples.length===3 &&
      row.runtime_ms.naft_impact_analysis_including_predecessors.samples.length===3,
      'three measured samples per strategy: '+size);
    check(Object.values(row.runtime_ms).every(s=>Number.isFinite(s.median)&&s.median>=0 &&
      s.samples.every(ms=>Number.isFinite(ms)&&ms>=0)),
      'no speedup assumption and finite timings: '+size);
  }
  for(const args of [
    ['--sizes','0'],['--sizes','700'],['--sizes','100,100'],
    ['--sizes','abc'],['--sizes','100,200,300,400'],['--iterations','0'],['--iterations','8'],
    ['--not-real','1'],['--output']
  ]) {
    const invalid=run(args);
    check(invalid.status!==0,'invalid arguments fail closed: '+args.join(' '));
  }
  console.log('IEEE BENCHMARK RESULT: '+passed+
    ' passed, 0 failed (100/200/500 synthetic claims; three samples per strategy)');
  console.log('IEEE BENCHMARK OBSERVATIONS: '+JSON.stringify(data.results.map(row=>({
    size:row.size,
    full_median_ms:row.runtime_ms.full_predecessors_plus_all_successors.median,
    selective_median_ms:row.runtime_ms.naft_impact_analysis_including_predecessors.median,
    full_successors:row.output_work_units.full_successor_packages,
    selective_successors:row.output_work_units.selective_successor_packages
  }))));
  console.log('IEEE BENCHMARK ENVIRONMENT: '+JSON.stringify(data.environment));
} finally {
  fs.rmSync(dir,{recursive:true,force:true});
}
