/**
 * AG-005 research arithmetic sandbox.
 *
 * NOT the adopted J-Credit calculation methodology. We do not have validated
 * coefficient tables, complete approved rule text or real field measurements.
 * Every result is a bounded experimental estimate with no eligibility claim.
 *
 * Stateless, deterministic, dependency-free; no network, wallet, or RPC.
 */
import {createHash} from 'node:crypto';

const fatal = code => { throw new Error(code); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const canonical = v => {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (object(v)) return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined)
    .map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
};
const digest = v => createHash('sha256').update(canonical(v)).digest('hex');
const textDigest = v => createHash('sha256').update(v, 'utf8').digest('hex');
const hex64 = h => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h);
const requiredString = (v, label) => {
  if (typeof v !== 'string' || !v.trim() || v.length > 200) fatal(label);
  return v;
};
const number = (v, label, min, max) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fatal(label);
  return v;
};
function day(str, label) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) fatal(label);
  const time = Date.parse(str + 'T00:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== str)
    fatal(label);
  return time;
}
function duration(interval, year, label) {
  if (!object(interval)) fatal(label + '_MISSING');
  if (interval.year !== year) fatal(label + '_YEAR_BINDING');
  const start = day(interval.start, label + '_START_INVALID');
  const end = day(interval.end, label + '_END_INVALID');
  if (interval.start.slice(0,4) !== String(year) ||
      interval.end.slice(0,4) !== String(year) || end < start)
    fatal(label + '_INVALID_RANGE');
  const days = Math.round((end-start)/86400000)+1;
  if (days > 90) fatal(label + '_LONGER_THAN_90_DAYS');
  return days;
}
const CATEGORIES = Object.freeze([
  'baseline_history', 'objective_start_end', 'field_area', 'production_record'
]);
function validateEvidence(input) {
  if (!Array.isArray(input.evidence) || input.evidence.length > 100)
    fatal('AG005_EVIDENCE_ARRAY_INVALID');
  const ids = new Set(), observed = new Set();
  const manifests = input.evidence.map(ev => {
    if (!object(ev)) fatal('AG005_EVIDENCE_INVALID');
    requiredString(ev.id,'AG005_EVIDENCE_ID_INVALID');
    if(ids.has(ev.id)) fatal('AG005_DUPLICATE_EVIDENCE_ID');
    ids.add(ev.id);
    if(!CATEGORIES.includes(ev.category)) fatal('AG005_EVIDENCE_CATEGORY_UNSUPPORTED');
    if(ev.scenario_id !== input.scenario_id || ev.field_id !== input.field.id)
      fatal('AG005_EVIDENCE_BOUND_TO_DIFFERENT_CLAIM');
    if(typeof ev.content !== 'string' || !ev.content.length || ev.content.length > 50000)
      fatal('AG005_EVIDENCE_BYTES_INVALID');
    const calculated = textDigest(ev.content);
    if(!hex64(ev.sha256) || ev.sha256 !== calculated)
      fatal('AG005_EVIDENCE_HASH_MISMATCH:'+ev.id);
    observed.add(ev.category);
    return {id:ev.id,category:ev.category,content_sha256:calculated,
      byte_length:Buffer.byteLength(ev.content,'utf8'),
      assertion_scope:'Bytes unchanged, not authoritative measurements'};
  }).sort((a,b) => a.id.localeCompare(b.id));
  return {manifests,missing:CATEGORIES.filter(cat=>!observed.has(cat))};
}
function validateInput(s) {
  if (!object(s) || s.schema !== 'naft-ag005-scenario-1') fatal('AG005_SCHEMA_INVALID');
  requiredString(s.scenario_id,'AG005_SCENARIO_ID_MISSING');
  if(!['SYNTHETIC_EXAMPLE','USER_SUPPLIED_UNVERIFIED'].includes(s.origin))
    fatal('AG005_PROVENANCE_UNSUPPORTED');
  if (!object(s.method) || s.method.id !== 'AG-005' ||
      s.method.version !== '3.1-reference' ||
      s.method.confirmed_adopted !== false ||
      s.method.original_bytes_verified !== false)
    fatal('AG005_UNVERIFIED_METHOD_NOT_ALLOWED_AS_OFFICIAL');
  if (!object(s.field)) fatal('AG005_FIELD_MISSING');
  requiredString(s.field.id,'AG005_FIELD_ID_MISSING');
  const area = number(s.field.area_ha,'AG005_AREA_HA_INVALID',0.000001,100000);
  if (!Array.isArray(s.baseline) || s.baseline.length < 2 || s.baseline.length > 10)
    fatal('AG005_BASELINE_HISTORY_INVALID');
  const seen=new Set(), baselineDays=s.baseline.map((entry,i) => {
    if(!object(entry) || !Number.isInteger(entry.year) || entry.year<1990 || entry.year>2100)
      fatal('AG005_BASELINE_YEAR_INVALID');
    if(seen.has(entry.year))fatal('AG005_DUPLICATE_BASELINE_YEAR');
    seen.add(entry.year);
    return duration(entry,entry.year,'AG005_BASELINE_'+i);
  });
  const project=s.project;
  if(!object(project) || !Number.isInteger(project.year) ||
     project.year<1990 || project.year>2100 || seen.has(project.year) ||
     Math.max(...seen)>=project.year)
    fatal('AG005_PROJECT_YEAR_INVALID');
  const projectDays=duration(project,project.year,'AG005_PROJECT');
  const evidence=validateEvidence(s);
  if (s.unsupported_special_conditions !== undefined &&
      (!Array.isArray(s.unsupported_special_conditions) ||
       s.unsupported_special_conditions.some(v=>typeof v!=='string')))
    fatal('AG005_SPECIAL_CONDITIONS_INVALID');
  return {area,projectDays,baselineDays,evidence,
    unsupported:s.unsupported_special_conditions||[]};
}
function factorInputs(s) {
  if (s.factors === undefined || s.factors === null) return null;
  if (!object(s.factors) || s.factors.mode !== 'ILLUSTRATIVE' ||
      s.factors.official !== false || !object(s.factors.source) ||
      s.factors.source.reviewed_approved_version !== false ||
      s.factors.source.status !== 'USER_SUPPLIED_UNVERIFIED' &&
      s.factors.source.status !== 'SYNTHETIC')
    fatal('AG005_FACTOR_PROVENANCE_INVALID');
  requiredString(s.factors.source.citation,'AG005_FACTOR_CITATION_REQUIRED');
  const b=number(s.factors.baseline_ch4_kg_ha_season,'AG005_BASELINE_FACTOR_INVALID',0,100000);
  const p=number(s.factors.project_ch4_kg_ha_season,'AG005_PROJECT_FACTOR_INVALID',0,100000);
  const gwp=number(s.factors.gwp100_ch4,'AG005_GWP_INVALID',0.000001,1000);
  return {baseline:b,project:p,gwp};
}
export function evaluateAg005Scenario(input) {
  const core=validateInput(input);
  const factors=factorInputs(input);
  const maxHistory=Math.max(...core.baselineDays);
  const meanHistory=core.baselineDays.reduce((a,b)=>a+b,0)/core.baselineDays.length;
  const issues=[
    {code:'OFFICIAL_AG005_ADOPTION_UNVERIFIED',severity:'CONFIG_REQUIRED'},
    {code:'APPROVED_METHOD_RULES_AND_COEFFICIENTS_UNVERIFIED',severity:'CONFIG_REQUIRED'},
    {code:'INDEPENDENT_FIELD_SOURCE_AUTHENTICITY_UNVERIFIED',severity:'EVIDENCE_REQUIRED'}
  ];
  for(const c of core.evidence.missing)
    issues.push({code:'MISSING_EVIDENCE:'+c,severity:'EVIDENCE_REQUIRED'});
  for(const c of core.unsupported)
    issues.push({code:'SPECIAL_CASE_NEEDS_METHOD_REVIEW:'+c,severity:'HUMAN_REVIEW_REQUIRED'});
  if(!factors)
    issues.push({code:'EXPLICIT_RESEARCH_FACTORS_MISSING',severity:'CONFIG_REQUIRED'});
  // An illustrative calculation is allowed only if all required evidence
  // bytes are supplied, properly bound, and hash-valid and no special cases.
  const previewAvailable=!!factors && !core.evidence.missing.length &&
    !core.unsupported.length;
  const arithmetic=previewAvailable?{
    baseline_ch4_kg:core.area*factors.baseline,
    project_ch4_kg:core.area*factors.project,
    indicative_net_tco2e:(core.area*(factors.baseline-factors.project)*factors.gwp)/1000,
    formula:'area_ha * (illustrative_baseline_kg_CH4_ha_season - illustrative_project_kg_CH4_ha_season) * illustrative_GWP100_CH4 / 1000',
    gases_included:['CH4'],excluded_processes:['N2O','additionality','leakage','program adjustments'],
    unit:'indicative tCO2e (research only, not credits)'
  }:null;
  const payload={
    schema:'naft-ag005-research-result-1',
    scenario_id:input.scenario_id,origin:input.origin,
    method_ref:'AG-005@3.1-reference',
    source_input_sha256:digest(input),
    coverage:{area_ha:core.area,baseline_years:input.baseline.map(v=>v.year),
      baseline_drainage_days:core.baselineDays,project_year:input.project.year,
      project_drainage_days:core.projectDays,
      days_above_historical_max:core.projectDays-maxHistory,
      days_above_historical_mean:core.projectDays-meanHistory,
      note:'Duration arithmetic only, NOT a formal AG-005 eligibility threshold'},
    evidence_manifests:core.evidence.manifests,
    issues,arithmetic_preview:arithmetic,
    status:!factors?'CONFIG_REQUIRED':core.evidence.missing.length?
      'EVIDENCE_REQUIRED':core.unsupported.length?
      'HUMAN_REVIEW_REQUIRED':'RESEARCH_PREVIEW_ONLY',
    official_outputs:{methodology_compliance:null,approved_emission_reduction_tco2e:null,
      credits_issued:null,certification:false,can_anchor_as_certified:false},
    semantics:'Reference-only research scenario; no currently verified AG-005 formula, factors, field truth, or J-Credit approval'
  };
  return {...payload,report_sha256:digest(payload)};
}
export function compareAg005Scenarios(before,after) {
  if(before.scenario_id!==after.scenario_id||before.field?.id!==after.field?.id)
    fatal('AG005_DIFFERENT_SCENARIO_OR_FIELD');
  const a=evaluateAg005Scenario(before),b=evaluateAg005Scenario(after);
  const keys=['method','field','baseline','project','factors','evidence','unsupported_special_conditions'];
  const changed=keys.filter(k=>canonical(before[k])!==canonical(after[k]));
  const payload={schema:'naft-ag005-research-change-1',scenario_id:before.scenario_id,
    from_sha256:a.source_input_sha256,to_sha256:b.source_input_sha256,
    changed_dependency_groups:changed,requires_research_review:changed.length>0,
    previous_status:a.status,new_status:b.status,
    previous_preview:a.arithmetic_preview,new_preview:b.arithmetic_preview,
    onchain_transaction_performed:false,
    official_credit_impact:null,
    note:'Full input re-evaluation; cannot infer formal AG-005 credits'};
  return {...payload,report_sha256:digest(payload)};
}
export function verifyAg005Report(input,report) {
  if(!object(report) || !hex64(report.report_sha256))fatal('AG005_REPORT_HASH_INVALID');
  const {report_sha256,...body}=report;
  if(digest(body)!==report_sha256)fatal('AG005_REPORT_TAMPERED');
  if(canonical(evaluateAg005Scenario(input))!==canonical(report))
    fatal('AG005_SOURCE_BOUND_REPLAY_MISMATCH');
  return {verified:true,report_sha256};
}
