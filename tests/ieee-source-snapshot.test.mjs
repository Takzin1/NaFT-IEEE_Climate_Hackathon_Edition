import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const dir=mkdtempSync(join(tmpdir(),'naft-source-'));
const script='scripts/ieee-source-snapshot.mjs';
const source={url:'https://gspp.berkeley.edu/berkeley-carbon-trading-project/offsets-database',
  release:'v2026-06',retrieved_at:'2026-10-18T00:00:00Z',
  attribution:'University of California Berkeley Carbon Trading Project (test fixture only)',
  license:'CC BY 4.0'};
const create=(name,records,catalog_ids=['A','B','C'],extra={})=>{
  const path=join(dir,name+'.json');
  writeFileSync(path,JSON.stringify({schema:'naft-source-snapshot-1',
    source:{...source,...extra},catalog_ids,records}));
  return path;
};
const row=(id,data)=>({id,data});
const first=[row('A',{v:1,amount:'1.20'}),row('B',{v:1,amount:'7.00'}),row('C',{v:1,amount:'0.00'})];
const second=[row('A',{v:2,amount:'1.20'}),row('C',{v:1,amount:'0.00'}),row('D',{v:1,amount:'9.00'})];
const invoke=(...args)=>spawnSync(process.execPath,[script,...args],{encoding:'utf8'});
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':
  value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');

try{
  const old=create('old',first);
  const next=create('next',second,['A','C','D'],{release:'v2026-08'});
  const result=invoke('compare',old,next);
  assert.equal(result.status,0,result.stderr);
  const p=JSON.parse(result.stdout);
  assert.deepEqual(p.delta.added,['D']);
  assert.deepEqual(p.delta.removed,['B']);
  assert.deepEqual(p.delta.modified,['A']);
  assert.equal(p.delta.unchanged_count,1);
  assert.deepEqual(p.delta.review_candidates,['A','B','D']);
  assert.equal(p.gates.independently_verified_publisher_catalog,false);
  assert.equal(p.gates.validated_methodology_rulepack,false);
  assert.match(p.report_sha256,/^[a-f0-9]{64}$/);
  const report=join(dir,'report.json');
  writeFileSync(report,JSON.stringify(p));
  assert.equal(invoke('verify',old,next,report).status,0,'source-bound replay succeeds');
  const repeated=JSON.parse(invoke('compare',old,next).stdout);
  assert.deepEqual(repeated,p,'the report is fully deterministic');

  const expectReject=(name,rows,catalog,override,code)=>{
    const path=create(name,rows,catalog,override);
    const out=invoke('compare',old,path);
    assert.notEqual(out.status,0,name+' rejects');
    assert.match(out.stderr,new RegExp(code),name+' error code');
  };
  expectReject('missing',second.slice(0,2),['A','C','D'],{release:'v2026-08'},'FAIL_CLOSED_MISSING_CATALOG_ROWS');
  expectReject('duplicate',[first[0],first[0],first[2]],['A','B','C'],{release:'v2026-08'},'DUPLICATE_RECORD_ID');
  expectReject('undeclared',second,['A','C'],{release:'v2026-08'},'UNDECLARED_RECORD_ID');
  expectReject('changedPublisher',second,['A','C','D'],{url:'https://example.org/not-same',release:'v2026-08'},'SOURCE_IDENTITY_CHANGED');
  expectReject('sameRelease',second,['A','C','D'],{},'SAME_RELEASE_DIFFERENT_CONTENT');
  const clone=structuredClone(p);
  clone.delta.unchanged_count=99;
  writeFileSync(report,JSON.stringify(clone));
  assert.match(invoke('verify',old,next,report).stderr,/REPORT_DIGEST_MISMATCH/,
    'root digest catches modified audit receipt');
  const signed=structuredClone(clone);
  const {report_sha256,...body}=signed;
  signed.report_sha256=digest(body);
  writeFileSync(report,JSON.stringify(signed));
  assert.match(invoke('verify',old,next,report).stderr,/SOURCE_BOUND_REPLAY_MISMATCH/,
    'same inputs reject forged count even after attacker re-hashes report');
  writeFileSync(next,readFileSync(next,'utf8').replace('"v":2','"v":123'));
  writeFileSync(report,JSON.stringify(p));
  assert.match(invoke('verify',old,next,report).stderr,/SOURCE_BOUND_REPLAY_MISMATCH/,
    'upstream snapshot mutation breaks replay of old proof');
  console.log('IEEE_SOURCE_PREFLIGHT_PASS: real input adapter preflight; omissions, duplicates, drift, forged reports rejected');
}finally{rmSync(dir,{recursive:true,force:true});}
