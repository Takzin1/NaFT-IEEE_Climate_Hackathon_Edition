#!/usr/bin/env node
/**
 * NaFT IEEE: versioned external-source snapshot preflight.
 * Reads locally supplied normalized JSON snapshots. No network, wallet,
 * certification, registry attribution or environmental-effect inference.
 * A locally supplied catalog is NOT a verified publisher catalog.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

const MAX_BYTES = 2_000_000;
const MAX_RECORDS = 10_000;
const error = message => { throw new Error(message); };
const canonical = value => {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' +
    Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
};
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const digest = value => sha(canonical(value));
const isObject = x => x && typeof x === 'object' && !Array.isArray(x);
function readJSON(path) {
  const stat=fs.statSync(path);
  if(!stat.isFile()||stat.size<2||stat.size>MAX_BYTES) error('SNAPSHOT_FILE_SIZE_INVALID');
  const bytes=fs.readFileSync(path);
  return {parsed:JSON.parse(bytes.toString('utf8')),file_sha256:sha(bytes),bytes:bytes.length};
}
function parseSnapshot(path){
  const {parsed:s,file_sha256,bytes}=readJSON(path);
  if(!isObject(s)||s.schema!=='naft-source-snapshot-1'||!isObject(s.source)||
     !Array.isArray(s.catalog_ids)||!Array.isArray(s.records))
    error('SNAPSHOT_SCHEMA_INVALID');
  if(!/^https:\/\/[^\s?#]+/i.test(s.source.url||'') ||
     !/^[a-zA-Z0-9._-]{2,80}$/.test(s.source.release||'') ||
     typeof s.source.attribution!=='string'||s.source.attribution.trim().length<8||
     typeof s.source.license!=='string'||s.source.license.trim().length<3||
     !/^\d{4}-\d{2}-\d{2}T/.test(s.source.retrieved_at||'')||
     !Number.isFinite(Date.parse(s.source.retrieved_at)))
    error('SOURCE_PROVENANCE_INCOMPLETE');
  if(s.catalog_ids.length<1||s.catalog_ids.length>MAX_RECORDS||
     s.records.length<1||s.records.length>MAX_RECORDS)error('CATALOG_SIZE_INVALID');
  const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160&&!/[\r\n]/.test(id);
  if(!s.catalog_ids.every(validId)||new Set(s.catalog_ids).size!==s.catalog_ids.length)
    error('CATALOG_DUPLICATE_OR_INVALID_IDS');
  const expected=new Set(s.catalog_ids);
  const rows=new Map();
  for(const row of s.records){
    if(!isObject(row)||!validId(row.id)||!isObject(row.data))
      error('RECORD_ID_OR_DATA_INVALID');
    if(rows.has(row.id))error('DUPLICATE_RECORD_ID:'+row.id);
    if(!expected.has(row.id))error('UNDECLARED_RECORD_ID:'+row.id);
    rows.set(row.id,digest(row.data));
  }
  const missing=s.catalog_ids.filter(id=>!rows.has(id));
  if(missing.length)error('FAIL_CLOSED_MISSING_CATALOG_ROWS:'+missing.slice(0,4).join(','));
  return {source:s.source,file_sha256,bytes,rows,
    catalog_digest:digest([...expected].sort()),
    record_set_digest:digest([...rows].sort((a,b)=>a[0].localeCompare(b[0]))),
    count:rows.size};
}
function makeReport(oldPath,newPath){
  const old=parseSnapshot(oldPath),next=parseSnapshot(newPath);
  if(old.source.url!==next.source.url)error('SOURCE_IDENTITY_CHANGED');
  if(old.source.release===next.source.release&&old.file_sha256!==next.file_sha256)
    error('SAME_RELEASE_DIFFERENT_CONTENT');
  const ids=new Set([...old.rows.keys(),...next.rows.keys()]);
  const added=[],removed=[],changed=[],unchanged=[];
  for(const id of [...ids].sort()){
    if(!old.rows.has(id))added.push(id);
    else if(!next.rows.has(id))removed.push(id);
    else if(old.rows.get(id)!==next.rows.get(id))changed.push(id);
    else unchanged.push(id);
  }
  const snapshot=x=>({release:x.source.release,source_url:x.source.url,
    attribution:x.source.attribution,license:x.source.license,
    retrieved_at:x.source.retrieved_at,local_file_sha256:x.file_sha256,
    declared_catalog_sha256:x.catalog_digest,
    normalized_records_sha256:x.record_set_digest,records:x.count});
  const payload={schema:'naft-ieee-source-drift-1',
    scope:'Data-level change preflight for local supplied publisher-attributed JSON; NOT methodology impact or measured emissions',
    previous:snapshot(old),current:snapshot(next),
    delta:{added,removed,modified:changed,unchanged_count:unchanged.length,
      review_candidates:[...new Set([...added,...removed,...changed])].sort()},
    gates:{supplied_catalog_coverage:'PASS',
      independently_verified_publisher_catalog:false,
      independently_downloaded_source:false,
      validated_methodology_rulepack:false,
      verified_emissions_or_carbon_credits:false,
      testnet_anchoring_performed:false}};
  return {...payload,report_sha256:digest(payload)};
}
function emit(mode,args){
  if(mode==='compare'&&args.length===2)return makeReport(args[0],args[1]);
  if(mode==='verify'&&args.length===3){
    const candidate=readJSON(args[2]).parsed;
    if(!isObject(candidate)||candidate.schema!=='naft-ieee-source-drift-1')
      error('REPORT_SCHEMA_INVALID');
    const {report_sha256,...payload}=candidate;
    if(typeof report_sha256!=='string'||! /^[0-9a-f]{64}$/.test(report_sha256)||
       digest(payload)!==report_sha256)error('REPORT_DIGEST_MISMATCH');
    const expected=makeReport(args[0],args[1]);
    if(canonical(candidate)!==canonical(expected))
      error('SOURCE_BOUND_REPLAY_MISMATCH');
    return {verified:true,report_sha256,
      review_candidates:expected.delta.review_candidates.length};
  }
  error('USAGE: node scripts/ieee-source-snapshot.mjs compare PREVIOUS.json CURRENT.json | verify PREVIOUS.json CURRENT.json REPORT.json');
}
try{
  const [mode,...args]=process.argv.slice(2);
  const result=emit(mode,args);
  console.log(JSON.stringify(result,null,2));
}catch(e){
  console.error('NAFT_SOURCE_PREFLIGHT_FAILED: '+e.message);
  process.exitCode=1;
}
