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
  const result=run(['--sizes','100','--iterations','1','--output',file]);
  check(result.status===0,'real synthetic benchmark succeeds: '+result.stderr);
  const data=JSON.parse(fs.readFileSync(file,'utf8'));
  check(data.schema==='naft-ieee-strategy-benchmark-1','versioned benchmark schema');
  check(data.scope.includes('synthetic'),'source boundaries remain explicit');
  check(data.iterations===1&&data.results.length===1,'requested sample bounds observed');
  const row=data.results[0];
  check(row.size===100&&row.counts.total===100,'100-claim case uses full workload');
  check(row.counts.require_reverification===30&&row.counts.UNAFFECTED===70,
    'selective output matches actual fixture');
  check(row.counts.AUTO_REEVALUATED===15&&row.counts.EVIDENCE_REQUIRED===15,
    'unsafe cases retain evidence-required status');
  check(row.output_work_units.full_successor_packages===100 &&
    row.output_work_units.selective_successor_packages===30 &&
    row.output_work_units.skipped_successor_packages===70,
    'package work unit comparison is based on outputs');
  check(Object.values(row.parity).every(Boolean),'baseline parity independently checked by CLI');
  check(/^[0-9a-f]{64}$/.test(row.synthetic_workload_sha256),'dataset identity is hashed');
  check(row.runtime_ms.full_predecessors_plus_all_successors.samples.length===1 &&
    row.runtime_ms.naft_impact_analysis_including_predecessors.samples.length===1,
    'each strategy measured once');
  check(Object.values(row.runtime_ms).every(s=>Number.isFinite(s.median)&&s.median>=0),
    'timings reported without assuming a speedup');
  for(const args of [
    ['--sizes','0'],['--sizes','700'],['--sizes','100,100'],
    ['--sizes','abc'],['--iterations','0'],['--iterations','8'],
    ['--not-real','1'],['--output']
  ]) {
    const invalid=run(args);
    check(invalid.status!==0,'invalid arguments fail closed: '+args.join(' '));
  }
  console.log('IEEE BENCHMARK RESULT: '+passed+
    ' passed, 0 failed (100-claim full-vs-selective parity, explicit runtime boundaries)');
  console.log('IEEE BENCHMARK OBSERVATIONS: '+JSON.stringify({
    full_median_ms:row.runtime_ms.full_predecessors_plus_all_successors.median,
    selective_median_ms:row.runtime_ms.naft_impact_analysis_including_predecessors.median,
    full_successors:row.output_work_units.full_successor_packages,
    selective_successors:row.output_work_units.selective_successor_packages,
    machine:data.environment
  }));
} finally {
  fs.rmSync(dir,{recursive:true,force:true});
}
