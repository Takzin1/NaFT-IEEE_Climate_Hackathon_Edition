#!/usr/bin/env node
/**
 * Illustrative full vs selective re-verification cost estimate.
 * Plot counts come from the real impact analyzer on the synthetic 100-claim IEEE workload
 * (or --total/--flagged overrides). Rates come from config/cost-estimator.defaults.json,
 * which holds ASSUMPTIONS, not sourced values. Not a measured saving.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const file of ['mrv-core','methodology-packs','mrv-compiler','compiler-demo','cost-estimator']) {
  const filePath=path.join(root,'src',file+'.js');
  vm.runInThisContext(fs.readFileSync(filePath,'utf8'),{filename:filePath});
}
const defaults=JSON.parse(fs.readFileSync(path.join(root,'config','cost-estimator.defaults.json'),'utf8'));
const flags={'--total':'total_plots','--flagged':'flagged_plots','--hours-per-plot':'hours_per_plot',
  '--rate-jpy':'hourly_rate_jpy','--overhead-jpy':'fixed_overhead_jpy','--jpy-per-usd':'jpy_per_usd'};

function syntheticCounts() {
  const claims=[];
  for(let i=1;i<=100;i++) {
    const variant=i<=70?'standard':i<=85?'intensive':'intensive_complete';
    claims.push(globalThis.syntheticClaim('CLIMATE-'+String(i).padStart(3,'0'),variant));
  }
  const c=globalThis.analyzeImpact(claims,{type:'methodology',old_key:'NAFT-SYNTHETIC@1',new_key:'NAFT-SYNTHETIC@2'}).counts;
  return {total_plots:c.total,flagged_plots:c.require_reverification,reasons:{
    AUTO_REEVALUATED:c.AUTO_REEVALUATED,EVIDENCE_REQUIRED:c.EVIDENCE_REQUIRED,
    HUMAN_REVIEW_REQUIRED:c.HUMAN_REVIEW_REQUIRED,UNSUPPORTED:c.UNSUPPORTED}};
}
try {
  const argv=process.argv.slice(2),input={...defaults};
  let json=false;
  for(let i=0;i<argv.length;i++) {
    if(argv[i]==='--json') { json=true; continue; }
    const key=flags[argv[i]],value=argv[++i];
    if(!key) throw new Error('UNKNOWN_OPTION:'+argv[i-1]);
    if(value===undefined||!/^[0-9]+(?:\.[0-9]+)?$/.test(value)) throw new Error('INVALID_OPTION_VALUE:'+argv[i-1]);
    input[key]=Number(value);
  }
  if(input.total_plots===undefined||input.flagged_plots===undefined) {
    const counts=syntheticCounts();
    input.total_plots??=counts.total_plots;
    input.flagged_plots??=counts.flagged_plots;
    if(input.total_plots===counts.total_plots&&input.flagged_plots===counts.flagged_plots) input.reasons=counts.reasons;
  }
  const estimate=globalThis.estimateReverificationCost(input);
  process.stdout.write(json?JSON.stringify(estimate,null,2)+'\n':globalThis.formatCostTable(estimate)+'\n');
} catch(error) {
  process.stderr.write(error.message+'\n');
  process.exit(2);
}
