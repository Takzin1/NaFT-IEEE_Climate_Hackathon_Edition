import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

vm.runInThisContext(fs.readFileSync(path.resolve('src/cost-estimator.js'),'utf8'),{filename:'src/cost-estimator.js'});
const est=globalThis.estimateReverificationCost;
const base={hours_per_plot:2,hourly_rate_jpy:3000,fixed_overhead_jpy:0,jpy_per_usd:150};
let passed=0;
function check(condition,label) { assert.ok(condition,label);passed++; }
function throwsCode(fn,code,label) { assert.throws(fn,e=>e.message.startsWith(code),label);passed++; }

const mid=est({...base,total_plots:100,flagged_plots:30});
check(mid.full.cost_jpy===600000&&mid.selective.cost_jpy===180000,'linear cost from assumptions');
check(mid.difference.plots_not_reverified===70&&mid.difference.cost_usd===2800,'difference columns');
check(mid.illustrative===true&&/not a measured saving/.test(mid.disclaimer)&&/CO2/.test(mid.disclaimer),'disclaimer always present');
const zero=est({...base,total_plots:100,flagged_plots:0,fixed_overhead_jpy:5000});
check(zero.selective.cost_jpy===0&&zero.selective.hours===0,'zero flagged: no selective work or overhead');
check(zero.full.cost_jpy===605000,'overhead applied to full run');
const all=est({...base,total_plots:40,flagged_plots:40,fixed_overhead_jpy:5000});
check(all.difference.cost_jpy===0&&all.difference.hours===0&&all.difference.share_of_plots_not_reverified===0,'all flagged: no difference');
const empty=est({...base,total_plots:0,flagged_plots:0});
check(empty.full.cost_jpy===0&&empty.difference.share_of_plots_not_reverified===null,'zero total: no division by zero');
throwsCode(()=>est({...base,total_plots:10,flagged_plots:11}),'INVALID_COST_INPUT:flagged_plots_exceeds_total','flagged > total rejected');
throwsCode(()=>est({...base,total_plots:-1,flagged_plots:0}),'INVALID_COST_INPUT:total_plots','negative total rejected');
throwsCode(()=>est({...base,total_plots:1.5,flagged_plots:0}),'INVALID_COST_INPUT:total_plots','fractional plots rejected');
throwsCode(()=>est({...base,total_plots:10,flagged_plots:1,jpy_per_usd:0}),'INVALID_COST_INPUT:jpy_per_usd','zero FX rejected');
throwsCode(()=>est({...base,total_plots:10,flagged_plots:1,hourly_rate_jpy:NaN}),'INVALID_COST_INPUT:hourly_rate_jpy','NaN rate rejected');
const input={...base,total_plots:5,flagged_plots:2};const snapshot=JSON.stringify(input);est(input);
check(JSON.stringify(input)===snapshot,'input not mutated');

const cli=spawnSync(process.execPath,['scripts/ieee-cost-estimate.mjs','--json'],{encoding:'utf8'});
check(cli.status===0,'CLI succeeds: '+cli.stderr);
const out=JSON.parse(cli.stdout);
check(out.full.plots===out.reasons.AUTO_REEVALUATED+out.reasons.EVIDENCE_REQUIRED+out.reasons.HUMAN_REVIEW_REQUIRED+out.reasons.UNSUPPORTED+out.difference.plots_not_reverified,'CLI counts come from analyzer reasons');
const table=spawnSync(process.execPath,['scripts/ieee-cost-estimate.mjs','--total','10','--flagged','0'],{encoding:'utf8'});
check(table.status===0&&/NaFT selective/.test(table.stdout)&&/Illustrative estimate/.test(table.stdout)&&!/reasons/.test(table.stdout),'CLI table with overrides + disclaimer');
const bad=spawnSync(process.execPath,['scripts/ieee-cost-estimate.mjs','--rate-jpy','-5'],{encoding:'utf8'});
check(bad.status===2,'CLI rejects invalid value');
const defaults=JSON.parse(fs.readFileSync('config/cost-estimator.defaults.json','utf8'));
check(['hours_per_plot','hourly_rate_jpy','fixed_overhead_jpy','jpy_per_usd'].every(k=>/assumption, replace with real value/.test(defaults['_'+k])),'every default labeled as assumption');
console.log('COST ESTIMATOR RESULT: '+passed+' passed, 0 failed (illustrative assumptions only)');
