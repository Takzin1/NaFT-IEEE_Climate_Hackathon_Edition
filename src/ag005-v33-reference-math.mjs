/**
 * AG-005 v3.3 user-supplied clause transcription: deterministic reference math.
 * NEVER adopted AG-005 v3.5 compliance. No official factors, credits or RPC.
 * Uses exact rational arithmetic (BigInt); inputs are decimal numbers/strings.
 */
import {createHash} from 'node:crypto';
const block=(code)=>{throw Error(code)};
const gcd=(a,b)=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){const c=a%b;a=b;b=c;}return a||1n};
function q(n,d=1n){if(d===0n)block('DIVISION_BY_ZERO');if(d<0n){n=-n;d=-d}const g=gcd(n,d);return {n:n/g,d:d/g};}
function dec(x,label='INVALID_DECIMAL'){
 if(typeof x!=='string'&&typeof x!=='number')block(label);
 if(typeof x==='number'&&!Number.isFinite(x))block(label);
 const s=String(x);
 if(!/^-?\d+(?:\.\d+)?$/.test(s))block(label);
 // Bound untrusted decimal scale to avoid attacker-controlled BigInt memory use.
 if(s.length>120)block('DECIMAL_PRECISION_LIMIT_EXCEEDED');
 const [p,part='']=s.split('.');return q(BigInt(p.replace('-','')+part)*(s.startsWith('-')?-1n:1n),10n**BigInt(part.length));
}
const add=(a,b)=>q(a.n*b.d+b.n*a.d,a.d*b.d);
const sub=(a,b)=>q(a.n*b.d-b.n*a.d,a.d*b.d);
const mul=(a,b)=>q(a.n*b.n,a.d*b.d);
const div=(a,b)=>q(a.n*b.d,a.d*b.n);
const cmp=(a,b)=>a.n*b.d<b.n*a.d?-1:a.n*b.d>b.n*a.d?1:0;
const min=(a,b)=>cmp(a,b)<0?a:b;
const max=(a,b)=>cmp(a,b)>0?a:b;
const numberString=(a,scale=9)=>{
 const neg=a.n<0n?'−':'';let n=a.n<0n?-a.n:a.n;const den=a.d;
 const digits=10n**BigInt(scale);const scaled=(n*digits*2n+den)/(2n*den);
 const major=scaled/digits,minor=String(scaled%digits).padStart(scale,'0').replace(/0+$/,'');
 return (neg==='−'?'-':'')+major.toString()+(minor?'.'+minor:'');
};
const asExact=a=>({decimal:numberString(a),fraction:a.n.toString()+'/'+a.d.toString()});
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const pct=v=>{const x=dec(v,'AG005_ORGANIC_PERCENT_INVALID');if(cmp(x,dec(0))<0||cmp(x,dec(100))>0)block('AG005_ORGANIC_PERCENT_INVALID');return x};
const amount=v=>{const x=dec(v,'AG005_COMPOST_TON_10A_INVALID');if(cmp(x,dec(0))<0||cmp(x,dec(1000))>0)block('AG005_COMPOST_TON_10A_INVALID');return x};
function triplet(t){
 if(!t||t.unit!=='kg_CH4_C_per_ha_year'||t.provenance!=='SYNTHETIC'||
    !['none','straw','compost'].every(k=>Object.hasOwn(t,k)))block('AG005_FACTOR_UNIT_OR_PROVENANCE_UNVERIFIED');
 const x={};for(const k of ['none','straw','compost']){
  x[k]=dec(t[k],'AG005_INVALID_FACTOR_'+k.toUpperCase());
  if(cmp(x[k],dec(0))<0)block('AG005_NEGATIVE_FACTOR');
 }
 return x;
}
export function referenceOrganicEF(factors,{straw_percent,compost_t_per_10a}){
 const t=triplet(factors),w=pct(straw_percent),x=amount(compost_t_per_10a);
 const zero=dec(0),ninety=dec(90),one=dec(1);
 const hasS=cmp(w,zero)>0,hasC=cmp(x,zero)>0;
 let ef,branch,overLimit=false;
 if(!hasS&&!hasC){ef=t.none;branch='NONE'}
 else if(hasS&&!hasC){ef=cmp(w,ninety)>=0?t.straw:
    add(t.none,mul(sub(t.straw,t.none),div(w,ninety)));
   branch=cmp(w,ninety)>=0?'STRAW_FULL':'STRAW_INTERPOLATION';
   overLimit=cmp(w,ninety)>0;
 }else if(!hasS&&hasC){ef=cmp(x,one)>=0?t.compost:
    add(t.none,mul(sub(t.compost,t.none),x));
   branch=cmp(x,one)>=0?'COMPOST_FULL':'COMPOST_INTERPOLATION';
   overLimit=cmp(x,one)>0;
 }else{
  const raw=add(add(t.none,mul(sub(t.straw,t.none),div(min(w,ninety),ninety))),
    mul(sub(t.compost,t.none),min(x,one)));
  ef=min(raw,max(t.straw,t.compost));branch='STRAW_COMPOST_CAPPED';
  overLimit=cmp(w,ninety)>0||cmp(x,one)>0;
 }
 return {status:overLimit?'HUMAN_REVIEW_REQUIRED':'REFERENCE_ONLY',
   clause:'Ver.3.3 pp.7-8, (5)-(7) as supplied; v3.5 NOT confirmed',
   branch,ef_ch4_c_kg_ha_year:asExact(ef),
   over_cap_input_review:overLimit,official_applicability:null};
}
function date(s,code){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))block(code);
 const t=Date.parse(s+'T00:00:00Z');
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==s)block(code);
 return Math.floor(t/86400000);
}
export function referenceMidseasonEligibility(input){
 if(!input||!Array.isArray(input.prior_crop_cycles)||input.prior_crop_cycles.length<2)
  block('AG005_BASELINE_CROP_CYCLES_MISSING');
 const start=date(input.project?.start,'AG005_PROJECT_DATE_INVALID');
 const actualEnd=date(input.project?.end,'AG005_PROJECT_DATE_INVALID');
 const heading=date(input.project?.heading_date,'AG005_HEADING_DATE_REQUIRED');
 if(actualEnd<start)block('AG005_PROJECT_DATE_RANGE_INVALID');
 if(heading<=start)block('AG005_HEADING_ON_OR_BEFORE_START');
 const seen=new Set();
 const periods=input.prior_crop_cycles.map(p=>{
   if(!p||typeof p!=='object')block('AG005_BASELINE_CROP_INVALID');
   const a=date(p.start,'AG005_BASELINE_DATE_INVALID');
   const b=date(p.end,'AG005_BASELINE_DATE_INVALID');
   if(b<a||b-a>150)block('AG005_BASELINE_DATE_RANGE_INVALID');
   if(b>=start)block('AG005_BASELINE_NOT_BEFORE_PROJECT');
   if(typeof p.crop_id!=='string'||!p.crop_id||seen.has(p.crop_id))
    block('AG005_BASELINE_CROP_ID_INVALID');
   seen.add(p.crop_id);return b-a+1;
 });
 const baselineDays=Math.ceil(periods.reduce((a,b)=>a+b,0)/periods.length);
 const cutoff=Math.min(actualEnd,heading-1);
 const projectDays=Math.max(0,cutoff-start+1);
 const extension=projectDays-baselineDays;
 const missing=['objective_date_logs','heading_date_record','prior_crop_records','sustainability_review']
   .filter(k=>input.evidence?.[k]!==true);
 return {reference_version:'3.3',historical_crop_count:periods.length,
  historical_days:periods,baseline_mean_raw:periods.reduce((a,b)=>a+b,0)/periods.length,
  baseline_days_ceil:baselineDays,project_days_through_pre_heading:projectDays,
  extension_days:extension,seven_day_reference_condition:extension>=7,
  status:extension<7?'NOT_ELIGIBLE_BY_DAYS':missing.length?'EVIDENCE_REQUIRED':'REFERENCE_DAYS_PASS',
  evidence_missing:missing,official_eligibility:null,
  note:'Reference-day check only; v3.5 adoption, other institutional conditions unknown'};
}
export function referenceDrainageClass({observed_mm_day,evidence}){
 const measure=dec(observed_mm_day,'AG005_DRAINAGE_MEASUREMENT_INVALID');
 if(cmp(measure,dec(0))<0)block('AG005_DRAINAGE_MEASUREMENT_INVALID');
 const calibrated=mul(measure,dec('1.22'));
 const category=cmp(calibrated,dec('7.5'))<0?'POOR_DRAINAGE':
   cmp(calibrated,dec('12.5'))<0?'DAILY_DRAINAGE':'FOUR_HOUR_DRAINAGE';
 const needed=['no_rain_24h','inlet_closed','outlet_closed','measurement_record','objective_evidence'];
 const missing=needed.filter(k=>evidence?.[k]!==true);
 return {reference_version:'3.3',corrected_mm_day:asExact(calibrated),
   class_if_admissible:category,status:missing.length?'EVIDENCE_REQUIRED':'REFERENCE_ONLY',
   selected_official_class:null,missing_evidence:missing,
   fallback_rule:'CONFIG_REQUIRED: compare actual EF by category, never hardcode default'};
}
export function referenceAreaAllocation({new_area_ha,parents,map_evidence,soil_movement_reviewed}){
 if(!Array.isArray(parents)||parents.length<2)block('AG005_FIELD_LINEAGE_MISSING');
 const area=dec(new_area_ha,'AG005_ALLOCATED_AREA_INVALID');
 if(cmp(area,dec(0))<=0)block('AG005_ALLOCATED_AREA_INVALID');
 const ids=new Set();
 const parts=parents.map(p=>{
   if(typeof p.field_id!=='string'||!p.field_id||ids.has(p.field_id))
     block('AG005_FIELD_PARENT_ID_INVALID');
   ids.add(p.field_id);
   const old=dec(p.area_before_ha,'AG005_PARENT_AREA_INVALID');
   if(cmp(old,dec(0))<=0)block('AG005_PARENT_AREA_INVALID');
   return {field_id:p.field_id,old};
 });
 const total=parts.reduce((a,p)=>add(a,p.old),dec(0));
 const allocations=parts.map(p=>({
   field_id:p.field_id,allocated_area_ha:asExact(mul(area,div(p.old,total))),
   historical_records_remain_bound_to_parent:true
 }));
 const missing=[...(!map_evidence?['map_documents']:[]),
   ...(!soil_movement_reviewed?['soil_movement_review']:[])];
 return {status:missing.length?'EVIDENCE_REQUIRED':'HUMAN_REVIEW_REQUIRED',
   allocations,total_area_ha:asExact(area),evidence_missing:missing,
   official_area_rounding:null,official_eligibility:null,
   note:'Proportional allocation concept from supplied v3.3 clause; original legal exceptions unverified'};
}
export function referenceFactorSelector(table,keys){
 // Audit selector only: never upgrades publisher metadata or references to official.
 if(!table||table.status!=='SYNTHETIC'||!Array.isArray(table.rows)||
    !table.source||table.source.original_sha256_verified!==false)
    block('AG005_INVENTORY_CONFIG_REQUIRED');
 const cols=['inventory_edition','factor_year','region','drainage','water_management'];
 if(cols.some(k=>!keys||keys[k]===undefined||keys[k]===null||keys[k]===''))
    block('AG005_FACTOR_SELECTION_KEYS_MISSING');
 const matches=table.rows.filter(r=>cols.every(k=>String(r[k])===String(keys[k])));
 if(matches.length!==1)block(matches.length?'AG005_FACTOR_ROW_AMBIGUOUS':'AG005_FACTOR_ROW_MISSING');
 const v=matches[0];
 const validated=referenceOrganicEF(v.factors,keys.organic);
 return {status:validated.status==='HUMAN_REVIEW_REQUIRED'?'HUMAN_REVIEW_REQUIRED':'REFERENCE_ONLY',
   selection:Object.fromEntries(cols.map(k=>[k,keys[k]])),
   inventory_sha256:sha(table.rows),
   organic:validated,official_factor:null};
}
export function referenceCarbonCalculation({segments,gwp100_ch4,rounding}){
 if(!Array.isArray(segments)||!segments.length||segments.length>100)
   block('AG005_SEGMENTS_MISSING');
 if(rounding!==null)block('AG005_ROUNDING_RULE_UNVERIFIED');
 const gwp=dec(gwp100_ch4,'AG005_GWP_REQUIRED');
 if(cmp(gwp,dec(0))<=0)block('AG005_GWP_REQUIRED');
 let bl=dec(0),pj=dec(0);
 const summary=[];
 for(const [i,seg] of segments.entries()){
  const area=dec(seg.area_ha,'AG005_AREA_INVALID');
  if(cmp(area,dec(0))<=0)block('AG005_AREA_INVALID');
  if(seg.factor_unit!=='kg_CH4_C_per_ha_year'||seg.provenance!=='SYNTHETIC'||
     seg.official_adopted!==false)block('AG005_FACTOR_UNVERIFIED');
  const base=dec(seg.ef_m0,'AG005_EF_INVALID'),factor=dec(seg.project_factor,'AG005_PROJECT_FACTOR_REQUIRED');
  if(cmp(base,dec(0))<0||cmp(factor,dec(0))<0)block('AG005_EF_INVALID');
  if(cmp(factor,dec('0.7'))!==0)block('AG005_REFERENCE_33_FACTOR_NOT_07');
  const project=mul(base,factor);
  const convert=mul(mul(area,div(dec(16),dec(12))),div(gwp,dec(1000)));
  const a=mul(base,convert),b=mul(project,convert);
  bl=add(bl,a);pj=add(pj,b);
  summary.push({segment:i,ef_baseline:asExact(base),ef_project:asExact(project),
    baseline_tco2e:asExact(a),project_tco2e:asExact(b)});
 }
 return {domain:'J_CREDIT_AG005',value_kind:'METHOD_CALCULATION',status:'RESEARCH_ONLY',
   clause_basis:'User-supplied AG-005 v3.3 eqs (1)-(4),(8); NOT VERIFIED v3.5',
   baseline_tco2e:asExact(bl),project_tco2e:asExact(pj),
   indicative_er_tco2e:asExact(sub(bl,pj)),segments:summary,
   official_rounding:null,official_amount:null,credits_issued:null,
   certification_allowed:false,gwp_source_verified:false,
   digest:sha(summary)};
}
export function ag005DependencyDiff(before,after){
 if(!before||typeof before!=='object'||!after||typeof after!=='object')
  block('AG005_DEPENDENCY_INPUT_INVALID');
 const keys=['method_version','inventory_edition','factor_year','gwp_version',
   'organic_material','drainage_measurement','midseason_dates',
   'field_geometry','field_lineage','raw_evidence_bytes',
   'expected_evidence_sha256','human_review_decision'];
 const canonical=x=>{
   if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
   if(x&&typeof x==='object')return '{'+Object.keys(x).sort()
     .filter(k=>x[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
   return JSON.stringify(x===undefined?null:x);
 };
 const changed=keys.filter(k=>canonical(before[k])!==canonical(after[k]));
 // A caller-set evidence_hash_valid flag is untrusted and intentionally ignored.
 // Bytes AND the independently expected digest must be supplied to replay
 // a changed evidence dependency. Matching hashes show bytes, not field truth.
 const evidencePresent=after.raw_evidence_bytes!==undefined ||
   after.expected_evidence_sha256!==undefined;
 const integrityOk=!evidencePresent ||
   typeof after.raw_evidence_bytes==='string' &&
   typeof after.expected_evidence_sha256==='string' &&
   /^[a-f0-9]{64}$/.test(after.expected_evidence_sha256) &&
   createHash('sha256').update(after.raw_evidence_bytes,'utf8').digest('hex')===
     after.expected_evidence_sha256;
 const missingChangedEvidence=changed.includes('raw_evidence_bytes')&&!evidencePresent;
 const fail=!integrityOk||missingChangedEvidence;
 return {status:fail?'UNSUPPORTED':changed.length?'REVERIFY_REQUIRED':'UNCHANGED',
   changed_dependencies:changed,stale_human_decisions:changed.length>0,
   evidence_integrity_checked:evidencePresent,
   evidence_integrity_valid:integrityOk&&!missingChangedEvidence,
   source_drift_only:false,official_certification:null,
   explanation:'Dependency-triggered review candidates; digest checks bytes only, not trusted field measurements'};
}
