// Illustrative re-verification cost estimator. Pure arithmetic: no clock, randomness or network.
// Output is an assumption-driven estimate, never a measured saving.
var COST_ESTIMATOR_DISCLAIMER='Illustrative estimate — not a measured saving, not a guarantee of CO2 reductions or credit issuance. All rates are assumptions; replace with real values.';
function costNumber(value,name,integer) {
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||(integer&&!Number.isSafeInteger(value))) throw new Error('INVALID_COST_INPUT:'+name);
  return value;
}
function costRound(value,digits) { var f=Math.pow(10,digits); return Math.round(value*f)/f; }
function costStrategy(plots,input) {
  var hours=plots*input.hours_per_plot;
  var jpy=hours*input.hourly_rate_jpy+(plots>0?input.fixed_overhead_jpy:0);
  return {plots:plots,hours:costRound(hours,2),cost_jpy:Math.round(jpy),cost_usd:costRound(jpy/input.jpy_per_usd,2)};
}
function estimateReverificationCost(input) {
  var total=costNumber(input.total_plots,'total_plots',true);
  var flagged=costNumber(input.flagged_plots,'flagged_plots',true);
  if(flagged>total) throw new Error('INVALID_COST_INPUT:flagged_plots_exceeds_total');
  var rates={
    hours_per_plot:costNumber(input.hours_per_plot,'hours_per_plot'),
    hourly_rate_jpy:costNumber(input.hourly_rate_jpy,'hourly_rate_jpy'),
    fixed_overhead_jpy:costNumber(input.fixed_overhead_jpy||0,'fixed_overhead_jpy'),
    jpy_per_usd:costNumber(input.jpy_per_usd,'jpy_per_usd')
  };
  if(rates.jpy_per_usd===0) throw new Error('INVALID_COST_INPUT:jpy_per_usd');
  var full=costStrategy(total,rates),selective=costStrategy(flagged,rates);
  return {
    schema:'naft-reverification-cost-estimate-1',
    illustrative:true,
    disclaimer:COST_ESTIMATOR_DISCLAIMER,
    assumptions:rates,
    reasons:input.reasons||null,
    full:full,
    selective:selective,
    difference:{
      plots_not_reverified:total-flagged,
      hours:costRound(full.hours-selective.hours,2),
      cost_jpy:full.cost_jpy-selective.cost_jpy,
      cost_usd:costRound(full.cost_usd-selective.cost_usd,2),
      share_of_plots_not_reverified:total===0?null:costRound((total-flagged)/total,4)
    }
  };
}
function formatCostTable(e) {
  var rows=[['Strategy','Plots','Hours','Cost (JPY)','Cost (USD)'],
    ['Full re-verification',e.full.plots,e.full.hours,e.full.cost_jpy,e.full.cost_usd],
    ['NaFT selective',e.selective.plots,e.selective.hours,e.selective.cost_jpy,e.selective.cost_usd],
    ['Difference (illustrative)',e.difference.plots_not_reverified,e.difference.hours,e.difference.cost_jpy,e.difference.cost_usd]];
  var widths=rows[0].map(function(_,i) { return Math.max.apply(null,rows.map(function(r) { return String(r[i]).length; })); });
  return rows.map(function(r) { return r.map(function(c,i) { return i?String(c).padStart(widths[i]):String(c).padEnd(widths[i]); }).join(' | '); }).join('\n')+'\n'+e.disclaimer;
}
