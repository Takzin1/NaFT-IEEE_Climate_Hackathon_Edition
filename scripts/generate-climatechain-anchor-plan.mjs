#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import vm from 'node:vm';

const files=[
  'src/mrv-core.js',
  'src/methodology-packs.js',
  'src/mrv-compiler.js',
  'src/compiler-demo.js',
  'src/climatechain-testnet-record.js',
  'src/climatechain-demo.js'
];

const context={
  console,
  TextEncoder,
  TextDecoder,
  crypto:globalThis.crypto,
  setTimeout,
  clearTimeout
};
vm.createContext(context);
for(const file of files){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

const impact=vm.runInContext('runClimateChainImpact()',context);
const plan=vm.runInContext('buildClimateChainAnchorPlan(runClimateChainImpact())',context);

const summary={
  counts:impact.counts,
  claim_id:plan.claim_id,
  transition:plan.transition,
  genesis:plan.genesis,
  successor:plan.successor,
  lineage_checks:plan.lineage_checks,
  chain_status:plan.chain_status,
  formal_certification:plan.formal_certification,
  carbon_credit_issued:plan.carbon_credit_issued
};

process.stdout.write(JSON.stringify(summary,null,2)+'\n');
