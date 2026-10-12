#!/usr/bin/env node
/**
 * IEEE synthetic MRV end-to-end strategy comparison.
 *
 * No external dependencies, RPC, wallet keys, or institutional data.
 * Times are observational local runtime samples, NOT labor/cost savings.
 * Both strategies construct predecessor packages; the "full" strategy then
 * recompiles every successor and the "selective" strategy invokes the real
 * impact analyzer (which may itself perform additional work).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const file of ['mrv-core','methodology-packs','mrv-compiler','compiler-demo','climatechain-demo']) {
  const filePath=path.join(root,'src',file+'.js');
  vm.runInThisContext(fs.readFileSync(filePath,'utf8'),{filename:filePath});
}

const oldPack=globalThis.COMPILER_REGISTRY['NAFT-SYNTHETIC@1'];
const newPack=globalThis.COMPILER_REGISTRY['NAFT-SYNTHETIC@2'];
const change={type:'methodology',old_key:'NAFT-SYNTHETIC@1',new_key:'NAFT-SYNTHETIC@2'};

function options(argv) {
  let sizes=[100,200,500],iterations=3,output=null;
  for(let i=0;i<argv.length;i++) {
    const flag=argv[i],value=argv[++i];
    if(value===undefined) throw new Error('MISSING_OPTION_VALUE:'+flag);
    if(flag==='--sizes') {
      if(!/^[0-9]+(?:,[0-9]+)*$/.test(value)) throw new Error('INVALID_SIZES');
      sizes=value.split(',').map(Number);
    } else if(flag==='--iterations') {
      if(!/^[0-9]+$/.test(value)) throw new Error('INVALID_ITERATIONS');
      iterations=Number(value);
    } else if(flag==='--output') {
      if(!value.trim()) throw new Error('INVALID_OUTPUT');
      output=value;
    } else throw new Error('UNKNOWN_OPTION:'+flag);
  }
  if(!sizes.length||sizes.length>3||new Set(sizes).size!==sizes.length||
     sizes.some(n=>!Number.isSafeInteger(n)||n<100||n>500||n%100!==0)) {
    throw new Error('SIZES_MUST_BE_DISTINCT_MULTIPLES_OF_100_UP_TO_500');
  }
  if(!Number.isSafeInteger(iterations)||iterations<1||iterations>7) {
    throw new Error('ITERATIONS_MUST_BE_1_TO_7');
  }
  return {sizes,iterations,output};
}

function workload(size) {
  const claims=[];
  for(let i=1;i<=size;i++) {
    const ordinal=((i-1)%100)+1;
    const variant=ordinal<=70?'standard':ordinal<=85?'intensive':'intensive_complete';
    claims.push(globalThis.syntheticClaim('CLIMATE-'+String(i).padStart(3,'0'),variant));
  }
  return claims;
}

function rebind(original) {
  const next=globalThis.clone(original);
  next.activity.methodology_version=newPack.methodology_version;
  next.evidence=next.evidence.map(e=>e.methodology_version===oldPack.methodology_version
    ? {...e,methodology_version:newPack.methodology_version}:e);
  return next;
}

function fullRecompilation(claims) {
  const predecessors=[],successors=[];
  for(const claim of claims) {
    const old=globalThis.compileEvidence(claim,oldPack);
    predecessors.push(old);
    successors.push(globalThis.compileEvidence(rebind(claim),newPack,{supersedes:old.package_hash}));
  }
  return {predecessors,successors};
}
function selectiveAnalysis(claims) {
  return globalThis.analyzeImpact(claims,change);
}
function assertSameOutcomes(claims,full,selective) {
  assert.equal(selective.counts.total,claims.length);
  assert.equal(selective.claims.length,claims.length);
  let reverified=0,unaffected=0;
  for(let i=0;i<claims.length;i++) {
    const row=selective.claims[i],old=full.predecessors[i],next=full.successors[i];
    assert.equal(row.claim_id,claims[i].activity.id,'stable claim correspondence');
    assert.equal(row.previous_package_hash,old.package_hash,'same predecessor package');
    if(row.requires_reverification) {
      reverified++;
      assert.ok(row.successor,'required successor must exist');
      assert.equal(row.successor.package_hash,next.package_hash,'exact successor parity');
      assert.equal(row.successor.document.evaluation.status,next.document.evaluation.status);
    } else {
      unaffected++;
      assert.equal(row.successor,null,'unchanged claim has no new successor package');
      assert.equal(old.document.evaluation.status,next.document.evaluation.status,
        'unaffected claim must retain synthetic evaluation status');
    }
  }
  assert.equal(reverified,selective.counts.require_reverification);
  assert.equal(unaffected,selective.counts.UNAFFECTED);
  assert.equal(reverified+unaffected,claims.length);
  assert.equal(selective.counts.AUTO_REEVALUATED+selective.counts.EVIDENCE_REQUIRED+
    selective.counts.HUMAN_REVIEW_REQUIRED+selective.counts.UNSUPPORTED,reverified);
  return {
    predecessor_hashes_match:true,
    selected_successor_hashes_match:true,
    unaffected_evaluation_statuses_match:true
  };
}
function timed(fn) {
  const begin=process.hrtime.bigint();
  const result=fn();
  const ms=Number(process.hrtime.bigint()-begin)/1e6;
  return {result,ms:Math.round(ms*1000)/1000};
}
function median(samples) {
  const sorted=samples.slice().sort((a,b)=>a-b);
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:Math.round(((sorted[mid-1]+sorted[mid])/2)*1000)/1000;
}
function measure(size,iterations) {
  const claims=workload(size);
  // Warm both execution paths before collecting any timed samples.
  fullRecompilation(claims);
  selectiveAnalysis(claims);
  const fullMs=[],selectiveMs=[];
  let full,selective;
  for(let i=0;i<iterations;i++) {
    if(i%2===0) {
      const a=timed(()=>fullRecompilation(claims));
      const b=timed(()=>selectiveAnalysis(claims));
      full=a.result;selective=b.result;fullMs.push(a.ms);selectiveMs.push(b.ms);
    } else {
      const a=timed(()=>selectiveAnalysis(claims));
      const b=timed(()=>fullRecompilation(claims));
      selective=a.result;full=b.result;selectiveMs.push(a.ms);fullMs.push(b.ms);
    }
  }
  const parity=assertSameOutcomes(claims,full,selective);
  return {
    size,
    synthetic_workload_sha256:globalThis.hashObject(claims),
    old_pack_sha256:globalThis.hashObject(oldPack),
    new_pack_sha256:globalThis.hashObject(newPack),
    counts:selective.counts,
    output_work_units:{
      full_successor_packages:size,
      selective_successor_packages:selective.counts.require_reverification,
      skipped_successor_packages:size-selective.counts.require_reverification,
      // Excludes baseline predecessor builds and impact-analysis work.
      interpret_as:'Synthetic successor package counts ONLY, not saved CPU time or human labor'
    },
    parity,
    runtime_ms:{
      full_predecessors_plus_all_successors:{samples:fullMs,median:median(fullMs)},
      naft_impact_analysis_including_predecessors:{samples:selectiveMs,median:median(selectiveMs)}
    }
  };
}

try {
  const opt=options(process.argv.slice(2));
  const report={
    schema:'naft-ieee-strategy-benchmark-1',
    scope:'Fully synthetic NAFT-SYNTHETIC@1 -> @2. Not official AG-005, field evidence or measured labor savings.',
    comparison:'Full predecessor+successor recompilation for all claims versus NaFT analyzeImpact on the same input claims.',
    interpretation:'Runtime includes real analyzer overhead and predecessor compilation. Times depend on machine, load, JIT and sample size. No speedup or production throughput guarantee. The baseline is an implemented illustrative strategy, not observed MRV industry practice.',
    environment:{node:process.version,platform:process.platform,arch:process.arch,cpu_model:os.cpus()[0]?.model||'unknown'},
    warmups_per_strategy:1,
    iterations:opt.iterations,
    results:opt.sizes.map(size=>measure(size,opt.iterations))
  };
  const json=JSON.stringify(report,null,2)+'\n';
  if(opt.output) fs.writeFileSync(opt.output,json);
  else process.stdout.write(json);
} catch(error) {
  console.error('IEEE BENCHMARK FAILED: '+error.message);
  process.exitCode=1;
}
