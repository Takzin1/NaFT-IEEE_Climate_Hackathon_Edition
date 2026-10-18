#!/usr/bin/env node
// Japan AG-005 research REFERENCE ONLY: no credits, factor defaults or chain writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceFile=path.join(root,'data/japan-mrv-research-2026-10-18/baseline.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const reject=code=>{throw Error(code)};
const plain=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
function load(file=sourceFile) {
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size>150000||stat.size<1000)reject('BASELINE_FILE_SIZE_INVALID');
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!plain(data)||data.schema!=='naft-japan-ag005-research-baseline-1')
   reject('BASELINE_SCHEMA_INVALID');
 for(const key of ['verified_original_source_bytes','raw_field_observations',
   'official_ag005_rulepack_complete','external_redistribution_license_verified'])
   if(data[key]!==false)reject('BASELINE_UNVERIFIED_CAPABILITY_MISREPRESENTED:'+key);
 if(data.input_zip_sha256!=='73d59baa3819342f56bb42c873571b6707c5c9853f23d8bd8d9ccf309cc2a076')
   reject('BASELINE_UNEXPECTED_ZIP_SHA256');
 const files=data.input_file_sha256;
 if(!plain(files)||Object.keys(files).length!==6||
    Object.values(files).some(h=>! /^[0-9a-f]{64}$/.test(h)))
    reject('BASELINE_SOURCE_HASH_MANIFEST_INVALID');
 if(!plain(data.sources)||Object.keys(data.sources).length!==16||
    Object.entries(data.sources).some(([id,url])=>!/^S\d\d$/.test(id)||!/^https:\/\//.test(url)))
    reject('BASELINE_SOURCE_CATALOG_INVALID');
 const unique=(array,key,count)=>Array.isArray(array)&&array.length===count&&
    array.every(x=>plain(x)&&typeof x[key]==='string')&&new Set(array.map(x=>x[key])).size===count;
 if(!unique(data.trial_sites,'id',9)||!unique(data.study_ratios,'metric',3)||
    !unique(data.program_totals,'operator',4)||!Array.isArray(data.ag005_reference_fields)||
    data.ag005_reference_fields.length!==10||new Set(data.ag005_reference_fields).size!==10)
    reject('BASELINE_RECORD_COVERAGE_INVALID');
 const knownSource=row=>/^S\d\d$/.test(row.source_id||'')&&!!data.sources[row.source_id];
 if([...data.trial_sites,...data.study_ratios,...data.program_totals].some(x=>!knownSource(x)))
    reject('BASELINE_SOURCE_REFERENTIAL_INTEGRITY');
 if(data.trial_sites.some(x=>x.source_id!=='S03'))reject('TRIAL_SOURCE_TYPE_MISMATCH');
 if(data.study_ratios.some(x=>x.source_id!=='S04'||x.unit!=='percent of conventional'||
   !Number.isFinite(x.value)||!Number.isFinite(x.standard_error)||x.standard_error<=0))
   reject('RESEARCH_RATIO_UNIT_OR_SOURCE_INVALID');
 const studyExpected=[[69.5,3.4],[72,3.1],[96.2,2]];
 if(data.study_ratios.some((x,i)=>x.value!==studyExpected[i][0]||
    x.standard_error!==studyExpected[i][1]))reject('RESEARCH_RATIO_UNEXPECTED_VALUE');
 if(data.program_totals.some(x=>!(x.source_id==='S05'&&x.provenance==='government-announced'||
    x.source_id==='S09'&&x.provenance==='operator-reported')||
    !Number.isSafeInteger(x.certified_tco2)||x.certified_tco2<0))
    reject('PROGRAM_SOURCE_OR_GRANULARITY_INVALID');
 if(!['emission_factor','field_area','ag005_baseline_years','ag005_extension_days'].every(x=>
    data.ag005_reference_fields.includes(x)))reject('AG005_REFERENCE_FIELDS_MISSING');
 return data;
}
function report(data,mode,siteId) {
 const p={schema:'naft-japan-mrv-reference-evaluation-1',
  source_zip_sha256:data.input_zip_sha256,
  baseline_kind:'RESEARCH_REFERENCE_NOT_JCREDIT_COUNTERFACTUAL',
  coverage:{research_sites:data.trial_sites.length,selected_study_ratios:data.study_ratios.length,
    program_aggregates:data.program_totals.length,reference_fields:data.ag005_reference_fields.length,
    source_urls:Object.keys(data.sources).length},
  three_distinct_baselines:{
    study_comparator:'Selected experiment treatment/conventional contrasts only; original measurements unavailable',
    official_counterfactual:'CONFIG_REQUIRED: adopted AG-005 pack, stratified factors and farmer monitoring missing',
    certified_totals:'Operator program aggregates; NOT farm-level evidence'},
  outcome:{method_status:'CONFIG_REQUIRED',field_evidence_status:'EVIDENCE_REQUIRED',
    calculated_tco2:null,jcredit_eligibility:null,credits_issued:null},
  evidence_gates:{original_source_bytes_verified:false,field_observations_available:false,
    official_methodology_version_confirmed:false,emission_factor_configured:false,
    independently_verifiable_field_claim:false,sepolia_anchor_performed:false},
  source_urls:{guide:data.sources.S02,site_designs:data.sources.S03,
    study:data.sources.S04,government_totals:data.sources.S05,
    operator_total:data.sources.S09,method_registry:data.sources.S10}
 };
 if(mode==='site'){
  const site=data.trial_sites.find(x=>x.id===siteId);
  if(!site)reject('UNKNOWN_TRIAL_SITE_ID');
  p.selected_site={...site,granularity:'experimental treatment design only',
    has_raw_methane_observations:false,eligibility_inferred:false};
 }
 p.report_sha256=hash(JSON.stringify(p));
 return p;
}
try{
 const args=process.argv.slice(2),mode=args[0];
 const expected=mode==='inspect'?1:mode==='site'?2:-1;
 if(expected<0||![expected,expected+2].includes(args.length)||
    args.length===expected+2&&args[expected]!=='--file')
    reject('USAGE: node scripts/japan-mrv-baseline.mjs inspect [--file PATH] | site SITE_ID [--file PATH]');
 const file=args.length===expected+2?args[expected+1]:sourceFile;
 console.log(JSON.stringify(report(load(file),mode,args[1]),null,2));
}catch(e){console.error('JAPAN_MRV_BASELINE_FAIL: '+e.message);process.exitCode=1;}
