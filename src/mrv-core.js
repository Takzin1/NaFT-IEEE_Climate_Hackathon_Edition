// NaFT MRV Core. No UI or external runtime dependencies.
'use strict';
function canonicalize(value){
  if(Array.isArray(value)) return '['+value.map(canonicalize).join(',')+']';
  if(value&&typeof value==='object') return '{'+Object.keys(value).sort().filter(function(k){return value[k]!==undefined;}).map(function(k){return JSON.stringify(k)+':'+canonicalize(value[k]);}).join(',')+'}';
  return JSON.stringify(value===undefined?null:value);
}
// Standard SHA-256 fallback keeps synchronous rendering and offline fixtures portable.
function digestText(value){
  return digestBytes(new TextEncoder().encode(String(value)));
}
function digestBytes(input){
  var bitLength=input.length*8,bytes=new Uint8Array(Math.ceil((input.length+9)/64)*64);
  bytes.set(input);bytes[input.length]=128;
  for(var j=7;j>=0;j--) bytes[bytes.length-1-j]=Math.floor(bitLength/Math.pow(256,j))&255;
  var h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function rr(x,n){return (x>>>n)|(x<<(32-n));}
  var w=new Int32Array(64);
  for(var offset=0;offset<bytes.length;offset+=64){
    for(var i=0;i<16;i++) w[i]=(bytes[offset+4*i]<<24)|(bytes[offset+4*i+1]<<16)|(bytes[offset+4*i+2]<<8)|bytes[offset+4*i+3];
    for(i=16;i<64;i++) w[i]=(w[i-16]+(rr(w[i-15],7)^rr(w[i-15],18)^(w[i-15]>>>3))+w[i-7]+(rr(w[i-2],17)^rr(w[i-2],19)^(w[i-2]>>>10)))|0;
    var va=h[0],vb=h[1],vc=h[2],vd=h[3],ve=h[4],vf=h[5],vg=h[6],vh=h[7];
    for(i=0;i<64;i++){
      var t1=(vh+(rr(ve,6)^rr(ve,11)^rr(ve,25))+((ve&vf)^(~ve&vg))+k[i]+w[i])|0;
      var t2=((rr(va,2)^rr(va,13)^rr(va,22))+((va&vb)^(va&vc)^(vb&vc)))|0;
      vh=vg;vg=vf;vf=ve;ve=(vd+t1)|0;vd=vc;vc=vb;vb=va;va=(t1+t2)|0;
    }
    h[0]=(h[0]+va)|0;h[1]=(h[1]+vb)|0;h[2]=(h[2]+vc)|0;h[3]=(h[3]+vd)|0;
    h[4]=(h[4]+ve)|0;h[5]=(h[5]+vf)|0;h[6]=(h[6]+vg)|0;h[7]=(h[7]+vh)|0;
  }
  return h.map(function(n){return ('00000000'+(n>>>0).toString(16)).slice(-8);}).join('');
}
async function sha256Canonical(value){
  var text=canonicalize(value);
  if(typeof crypto!=='undefined'&&crypto.subtle){
    try { var bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)); return Array.from(new Uint8Array(bytes)).map(function(n){return ('0'+n.toString(16)).slice(-2);}).join(''); } catch(e) { /* Offline fallback, same SHA-256 output. */ }
  }
  return digestText(text);
}

function isoDay(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;var n=Date.parse(s+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?n:null;}
function inclusiveDays(start,end){var s=isoDay(start),e=isoDay(end);return s===null||e===null||e<s?null:(e-s)/86400000+1;}
function drainageDays(p){
  if(!p||isoDay(p.heading_date)===null||inclusiveDays(p.start,p.end)===null||p.heading_date<=p.start) return null;
  var end=p.end<p.heading_date?p.end:new Date(isoDay(p.heading_date)-86400000).toISOString().slice(0,10);
  return inclusiveDays(p.start,end);
}

function calculateAG005(a,pack){
  pack=pack||AG005_RULE;
  // Reference equations 1, 2, 4; no invented emission factors or GWP default.
  var c=a.calculation_parameters||{}, missing=['baseline_ef','project_ef','gwp_ch4','coefficient_source','coefficient_version','stratum'].filter(function(k){return c[k]===undefined||c[k]===null||c[k]==='';});
  var invalid=['baseline_ef','project_ef','gwp_ch4'].some(function(k){return c[k]!==undefined&&c[k]!==null&&(typeof c[k]!=='number'||!Number.isFinite(c[k])||c[k]<=0);});
  if(c.baseline_ef<c.project_ef) invalid=true;
  if(typeof a.field_area_ha!=='number'||!Number.isFinite(a.field_area_ha)||a.field_area_ha<=0) invalid=true;
  var preview=null;
  if(!missing.length&&!invalid){preview=a.field_area_ha*(c.baseline_ef-c.project_ef)*(16/12)*c.gwp_ch4*0.001;if(!Number.isFinite(preview)){preview=null;invalid=true;}}
  return {label:'Calculation Assist / Pre-verification Estimate',inputs:{area_ha:a.field_area_ha,parameters:clone(c)},rule_version:pack.rule_version,calculation_version:'naft-ag005-equations-0.1',
    formula:'ER = A_ha * (EF_baseline - EF_project) * (16/12) * GWP_CH4 * 0.001; EF in kg-CH4-C/ha/year',
    result:null,arithmetic_preview:preview,unit:'tCO2e/year',status:invalid?'INVALID':'CONFIG REQUIRED',
    warnings:['Latest adopted methodology and applicable coefficients are not confirmed. Arithmetic preview uses supplied parameters only; it is not an eligible reduction or certified quantity.'],
    missing_parameters:missing.concat(['current_adopted_methodology_confirmation','coefficient_applicability_review'])};
}

function assessAG005Snapshot(a,snapshot){
  var pack=snapshot.rule||AG005_RULE;
  var ev=snapshot.evidence, checks=[],missing=[];
  function check(id,status,note){checks.push({id:id,status:status,note:note});}
  var required=['methodology_id','methodology_version','field_id','farmer_id','activity_year','crop_year','project_start_year','region','activity_type','activity_start','activity_end'];
  var absent=required.filter(function(k){return a[k]===undefined||a[k]===null||a[k]==='';});
  check('identity',absent.length?'MISSING':'PASS',absent.join(', '));
  check('methodology',a.methodology_id==='AG-005'&&a.methodology_version===pack.methodology_version?'PASS':'FAIL','Reference snapshot only; adopted version requires confirmation.');
  var period=inclusiveDays(a.activity_start,a.activity_end),yearOK=Number.isInteger(a.crop_year)&&Number.isInteger(a.activity_year)&&Number.isInteger(a.project_start_year)&&a.project_start_year<=a.crop_year&&a.activity_year===a.crop_year&&String(a.activity_start||'').slice(0,4)===String(a.crop_year)&&String(a.activity_end||'').slice(0,4)===String(a.crop_year);
  var pd=drainageDays(a.project_drainage);
  check('activity_period',period&&yearOK&&pd!==null&&a.project_drainage.start>=a.activity_start&&a.project_drainage.end<=a.activity_end&&a.project_drainage.heading_date<=a.activity_end?'PASS':'FAIL','Dates inclusive; drainage stops before heading.');
  check('area',typeof a.field_area_ha==='number'&&Number.isFinite(a.field_area_ha)&&a.field_area_ha>0?'PASS':'FAIL','ha');
  var rows=Array.isArray(a.baseline_periods)?a.baseline_periods:[],years=Array.from(new Set(rows.map(function(p){return p.crop_year;}))).sort(),baseDays=rows.map(drainageDays);
  var baseOK=years.length>=2&&years.every(function(y,i){return Number.isInteger(y)&&y===a.project_start_year-years.length+i;})&&rows.every(function(p){return String(p.crop_year)===String(p.start||'').slice(0,4)&&String(p.crop_year)===String(p.end||'').slice(0,4)&&String(p.crop_year)===String(p.heading_date||'').slice(0,4);})&&baseDays.every(function(n){return n!==null;});
  var overlaps=rows.some(function(p,i){return rows.some(function(q,j){return j<i&&p.start<=q.end&&p.end>=q.start;});});
  baseOK=baseOK&&!overlaps;
  var average=baseOK?Math.ceil(baseDays.reduce(function(s,n){return s+n;},0)/rows.length):null,extension=average!==null&&pd!==null?pd-average:null;
  check('baseline',!rows.length?'MISSING':baseOK?'PASS':'FAIL','Recent consecutive pre-project years; average over crop cycles rounded up.');
  check('extension',extension===null?'MISSING':extension>=pack.minimum_extension_days?'PASS':'FAIL','Reference threshold: at least 7 days.');
  check('sustainability',a.sustainability_confirmed===true?'REVIEW':a.sustainability_confirmed===false?'FAIL':'MISSING','Human must review environmental/social compliance; declaration is not proof.');
  check('land_changes',a.land_change===false?'PASS':a.land_change===true?'FAIL':'MISSING','Land consolidation/split/merge special cases NOT IMPLEMENTED.');
  var needs=years.map(function(y){return {type:'baseline_record',year:y};}).concat(['project_record','drainage_start','drainage_end','heading_record','area_record','sustainability_record'].map(function(t){return {type:t,year:a.crop_year};}));
  var inventory=new Set(),integrity=true;
  ev.forEach(function(e){var valid=e.manifest_hash===hashObject(manifestPayload(e));if(!valid) integrity=false;
    if(valid&&Number.isInteger(e.crop_year)&&typeof e.evidence_type==='string'&&e.hash_algorithm==='SHA-256'&&/^[a-f0-9]{64}$/.test(e.hash)&&e.field_id===a.field_id&&e.methodology_id===a.methodology_id) inventory.add(e.evidence_type+':'+e.crop_year);
  });
  needs.forEach(function(n){if(!inventory.has(n.type+':'+n.year))missing.push(n.type+':'+n.year);});
  check('evidence',missing.length?'MISSING':'PASS',missing.join(', '));
  check('content_recheck',snapshot.content_mismatches.length?'FAIL':'PASS','A mismatched reselected file requires a matching original before review/export.');
  check('manifest_integrity',integrity?'PASS':'FAIL','Content hashes bind selected bytes; authenticity requires human inspection.');
  check('official_configuration','REVIEW','CONFIG REQUIRED: current adopted version and coefficient applicability.');
  var calculation=calculateAG005(a,pack);
  check('calculation',calculation.status==='INVALID'?'FAIL':'REVIEW',calculation.status);
  var status=checks.some(function(c){return c.status==='FAIL';})?'FAIL':checks.some(function(c){return c.status==='MISSING';})?'MISSING':'REVIEW';
  return {methodology_id:a.methodology_id,methodology_version:a.methodology_version,rule_version:pack.rule_version,eligibility_status:status,checks:checks,
    baseline_days:average,project_days:pd,extension_days:extension,evidence_completeness:{present:needs.length-missing.length,required:needs.length,missing:missing},calculation_readiness:calculation.status,calculation:calculation,
    human_handling:'exception_then_final_attestation',warnings:(ev.some(function(e){return e.source.indexOf('SYNTHETIC DEMO')>=0;})?['SYNTHETIC evidence: no real field observation.']:[]).concat(['Internal readiness only; no certification.', 'CONFIG REQUIRED: latest adopted methodology not established.', 'Monitoring Package configuration remains incomplete.']),input_fingerprint:hashObject(snapshot)};
}

function exampleActivity(){return {program_name:'Demo rice program',farmer_name:'Demo farmer 001',field_id:'DEMO-FIELD-001',field_area_ha:5,region:'埼玉県',methodology_id:'AG-005',methodology_version:AG005_RULE.methodology_version,activity_year:2026,crop_year:2026,project_start_year:2026,activity_type:'midseason_drainage_extension',activity_start:'2026-04-01',activity_end:'2026-10-31',baseline_periods:[{crop_year:2024,start:'2024-06-01',end:'2024-06-07',heading_date:'2024-08-01'},{crop_year:2025,start:'2025-06-01',end:'2025-06-08',heading_date:'2025-08-01'}],project_drainage:{start:'2026-06-01',end:'2026-06-15',heading_date:'2026-08-01'},sustainability_confirmed:true,land_change:false,calculation_parameters:{}};}

var DISCLAIMER = 'Research prototype. Internal checks and human attestation are not formal certification. No external registry connection. AG-005 adoption and coefficients remain unconfirmed; certified reduction result is null.';
var AG005_RULE = Object.freeze({methodology_id:'AG-005',methodology_version:'3.1-reference',rule_version:'naft-ag005-0.1',calculation_version:'naft-ag005-equations-0.1',adapter_version:'file-manifest-1',minimum_extension_days:7,minimum_baseline_years:2,source:'https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000281460',source_checked_at:'2026-09-10',source_status:'public_comment_reference_adoption_unconfirmed',current_version_verified:false});
var METHODOLOGY_REGISTRY = Object.freeze({'AG-005@3.1-reference':AG005_RULE});
var DB_KEY='naft_mrv_core_v1';
var db=null, actorId='operator';
var memoryStore={};
var store={
  async get(key){if(typeof window!=='undefined'&&window.storage){var item=await window.storage.get(key);return item?item.value:null;}return memoryStore[key]||null;},
  async set(key,value){if(typeof window!=='undefined'&&window.storage){await window.storage.set(key,value);return;}memoryStore[key]=value;}
};
function clone(v){return JSON.parse(JSON.stringify(v));}
function hashObject(v){return digestText(canonicalize(v));}
function nowISO(){return new Date().toISOString();}
function uid(prefix){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);}
function seal(value,key){value[key]=hashObject(value);return value;}
function sealed(value,key){if(!value)return false;var payload=Object.assign({},value);delete payload[key];return value[key]===hashObject(payload);}
function seedDB(){return {schema:'naft-mrv-core-1',users:[{id:'operator',name:'Demo operator',role:'operator',status:'active'},{id:'reviewer',name:'Demo reviewer',role:'reviewer',status:'active'},{id:'maintainer',name:'Demo pack maintainer',role:'maintainer',status:'active'}],programs:[],farmers:[],fields:[],activities:[],evidence_manifests:[],evidence_content_checks:[],evaluations:[],exception_decisions:[],pack_releases:[],attestations:[],compiler_runs:[],compiler_decisions:[],compiler_attestations:[],audit_events:[],audit_head:hashObject([])};}
async function loadDB(){var raw=await store.get(DB_KEY);if(!raw){db=seedDB();return;}var value=JSON.parse(raw);var collections=['users','programs','farmers','fields','activities','evidence_manifests','evidence_content_checks','evaluations','exception_decisions','pack_releases','attestations','audit_events'];if(!value||value.schema!=='naft-mrv-core-1'||collections.some(function(k){return !Array.isArray(value[k]);})||verifyAuditChain(value).status!=='VALID')throw new Error('INVALID_SAVED_DATASET');db=value;}
async function saveDB(){await store.set(DB_KEY,JSON.stringify(db));}
function currentUser(){return db&&db.users.find(function(u){return u.id===actorId&&u.status==='active';});}
function setActor(id){if(!db.users.some(function(u){return u.id===id&&u.status==='active';}))throw new Error('ROLE_BLOCKED');actorId=id;}
function requireRole(role){var u=currentUser();if(!u||u.role!==role)throw new Error('ROLE_BLOCKED');return u;}
function getActivity(id){var a=db.activities.find(function(x){return x.id===id;});if(!a)throw new Error('ACTIVITY_NOT_FOUND');return a;}
function programFor(a){return db.programs.find(function(p){return p.id===a.program_id;});}
function canAccess(a){var u=currentUser(),p=programFor(a);return !!(u&&p&&(u.role==='reviewer'||u.role==='operator'&&p.owner_user_id===u.id));}
function visibleActivities(){return db.activities.filter(canAccess);}
function guard(a,role){if(!a||getActivity(a.id)!==a||!canAccess(a))throw new Error('ROLE_BLOCKED');if(role)requireRole(role);requireAudit();}
function requireAudit(){if(verifyAuditChain().status!=='VALID')throw new Error('AUDIT_CHAIN_BROKEN');}
function audit(action,target,payload){requireAudit();var e={id:uid('event'),actor:currentUser()?currentUser().id:'system',action:action,target:target,payload:clone(payload),created_at:nowISO(),sequence:db.audit_events.length+1,previous_hash:db.audit_head};seal(e,'event_hash');db.audit_events.push(e);db.audit_head=e.event_hash;return e;}
function verifyAuditChain(value){
  value=value||db;if(!value||!Array.isArray(value.audit_events))return {status:'BROKEN'};
  var head=hashObject([]);
  for(var i=0;i<value.audit_events.length;i++){var e=value.audit_events[i];if(!e||e.sequence!==i+1||e.previous_hash!==head||!sealed(e,'event_hash'))return {status:'BROKEN'};head=e.event_hash;}
  return {status:head===value.audit_head?'VALID':'BROKEN',head_hash:head,event_count:value.audit_events.length};
}
function eventBinds(action,target,payload){return db.audit_events.some(function(e){return e.action===action&&e.target===target&&canonicalize(e.payload)===canonicalize(payload);});}
function methodologyPack(a){return METHODOLOGY_REGISTRY[a.methodology_id+'@'+a.methodology_version]||null;}
function packRelease(pack){return db.pack_releases.find(function(r){return r.pack_hash===hashObject(pack);});}
function validRelease(pack){var r=packRelease(pack),u=r&&db.users.find(function(x){return x.id===r.approved_by;});return !!(r&&u&&u.status==='active'&&u.role==='maintainer'&&sealed(r,'release_hash')&&eventBinds('pack_release',r.id,{hash:r.release_hash}));}
function humanNote(note){note=String(note||'').trim();if(note.length<20||note.length>4000)throw new Error('EXPLICIT_HUMAN_REASON_REQUIRED');return note;}
async function approvePack(key,note){
  var u=requireRole('maintainer');requireAudit();var pack=METHODOLOGY_REGISTRY[key];if(!pack)throw new Error('UNSUPPORTED_METHODOLOGY');
  if(packRelease(pack))throw new Error('PACK_ALREADY_RELEASED');
  var r=seal({id:uid('release'),pack_key:key,pack_hash:hashObject(pack),approved_by:u.id,approved_at:nowISO(),note:humanNote(note),scope:'prototype_reference_only',official_adoption_confirmed:false},'release_hash');
  db.pack_releases.push(r);audit('pack_release',r.id,{hash:r.release_hash});await saveDB();return r;
}
function fieldIdentity(a){var f=db.fields.find(function(x){return x.id===a.field_ref;});return {field_id:a.field_id,field_hash:hashObject(f||{field_id:a.field_id})};}
function activityIdentity(a){var p={};['field_id','methodology_id','crop_year','activity_type','activity_start','activity_end'].forEach(function(k){p[k]=a[k];});return {canonical:p,hash:hashObject(p)};}
function activityConflict(a){return db.activities.find(function(b){return b.id!==a.id&&b.field_id===a.field_id&&b.methodology_id===a.methodology_id&&b.activity_type===a.activity_type&&(activityIdentity(a).hash===activityIdentity(b).hash||a.activity_start<=b.activity_end&&a.activity_end>=b.activity_start);});}
function evidenceFor(a){return db.evidence_manifests.filter(function(e){return e.activity_id===a.id;}).sort(function(x,y){return x.evidence_id<y.evidence_id?-1:x.evidence_id>y.evidence_id?1:0;});}
function manifestPayload(e){var p=Object.assign({},e);delete p.manifest_hash;return p;}
function evidenceMismatches(a){var latest=new Map();db.evidence_content_checks.forEach(function(c){latest.set(c.evidence_id,c);});return evidenceFor(a).filter(function(e){var c=latest.get(e.evidence_id);return c&&(!sealed(c,'check_hash')||!eventBinds('evidence_recheck',c.id,{hash:c.check_hash})||c.result==='MISMATCH');}).map(function(e){return e.evidence_id;});}
function snapshotFor(a){return {activity:clone(a),field:clone(db.fields.find(function(f){return f.id===a.field_ref;})||null),farmer:clone(db.farmers.find(function(f){return f.id===a.farmer_id;})||null),program:clone(programFor(a)||null),evidence:clone(evidenceFor(a)),content_mismatches:evidenceMismatches(a),rule:clone(methodologyPack(a))};}
async function registerActivity(input){
  var u=requireRole('operator');requireAudit();
  if(!input||typeof input!=='object'||JSON.stringify(input).length>65536)throw new Error('INVALID_ACTIVITY');
  var a=clone(input);
  if(a.baseline_periods!==undefined&&(!Array.isArray(a.baseline_periods)||a.baseline_periods.some(function(p){return !p||typeof p!=='object';})))throw new Error('INVALID_BASELINE');
  ['program_name','farmer_name','field_id','region'].forEach(function(k){if(typeof a[k]!=='string'||!a[k].trim()||a[k].length>160)throw new Error('INVALID_'+k);a[k]=a[k].normalize('NFKC').trim();});
  if(!methodologyPack(a)||a.activity_type!=='midseason_drainage_extension'||!inclusiveDays(a.activity_start,a.activity_end)||!Number.isInteger(a.crop_year)||typeof a.field_area_ha!=='number'||!Number.isFinite(a.field_area_ha)||a.field_area_ha<=0)throw new Error('INVALID_ACTIVITY');
  var p=db.programs.find(function(x){return x.name===a.program_name&&x.owner_user_id===u.id;})||{id:uid('program'),name:a.program_name,owner_user_id:u.id};
  var farmer=db.farmers.find(function(f){return f.program_id===p.id&&f.name===a.farmer_name;})||{id:uid('farmer'),name:a.farmer_name,program_id:p.id};
  var field=db.fields.find(function(f){return f.field_id===a.field_id;});
  if(field&&(field.farmer_id!==farmer.id||field.area_ha!==a.field_area_ha||field.region!==a.region))throw new Error('FIELD_IDENTITY_CONFLICT');
  field=field||{id:uid('field'),field_id:a.field_id,farmer_id:farmer.id,program_id:p.id,area_ha:a.field_area_ha,region:a.region};
  var clean={id:uid('activity'),program_id:p.id,farmer_id:farmer.id,field_ref:field.id,created_by:u.id,created_at:nowISO()};
  ['field_id','field_area_ha','region','methodology_id','methodology_version','activity_year','crop_year','project_start_year','activity_type','activity_start','activity_end','baseline_periods','project_drainage','sustainability_confirmed','land_change','calculation_parameters'].forEach(function(k){if(a[k]!==undefined)clean[k]=a[k];});
  if(activityConflict(clean))throw new Error('DUPLICATE_FIELD_ACTIVITY_BLOCKED');
  if(!db.programs.some(function(x){return x.id===p.id;}))db.programs.push(p);
  if(!db.farmers.some(function(x){return x.id===farmer.id;}))db.farmers.push(farmer);
  if(!db.fields.some(function(x){return x.id===field.id;}))db.fields.push(field);
  db.activities.push(clean);audit('activity_registered',clean.id,{hash:hashObject(clean)});await saveDB();return clean;
}
async function hashEvidenceBytes(bytes){var copy=new Uint8Array(bytes);if(typeof crypto!=='undefined'&&crypto.subtle){try{var result=await crypto.subtle.digest('SHA-256',copy);return Array.from(new Uint8Array(result)).map(function(n){return ('0'+n.toString(16)).slice(-2);}).join('');}catch(e){/* Standard fallback. */}}return digestBytes(copy);}
function attestationFor(a){return db.attestations.find(function(r){return r.activity_id===a.id;});}
async function attachEvidence(activityId,file,type,year,source){
  var a=getActivity(activityId);guard(a,'operator');if(attestationFor(a))throw new Error('ATTESTED_ACTIVITY_LOCKED');
  if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||file.size<=0||file.size>5*1024*1024)throw new Error('FILE_REQUIRED_MAX_5_MIB');
  var allowed=['baseline_record','project_record','drainage_start','drainage_end','heading_record','area_record','sustainability_record'];
  if(allowed.indexOf(type)<0||!Number.isInteger(year)||!String(source||'').trim()||String(source).length>2000)throw new Error('INVALID_MANIFEST');
  var periods=type==='baseline_record'?(a.baseline_periods||[]).filter(function(p){return p.crop_year===year;}):[];
  if(type==='baseline_record'?!periods.length:year!==a.crop_year)throw new Error('EVIDENCE_YEAR_MISMATCH');
  var pack=methodologyPack(a);if(!pack)throw new Error('UNSUPPORTED_METHODOLOGY');
  var who=actorId,before=hashObject(snapshotFor(a)),size=file.size,name=String(file.name||'evidence');
  var bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==size)throw new Error('FILE_SIZE_CHANGED');var hash=await hashEvidenceBytes(bytes);
  guard(a,'operator');if(actorId!==who||before!==hashObject(snapshotFor(a))||attestationFor(a))throw new Error('STALE_EVIDENCE_OPERATION');
  var e={evidence_id:uid('evidence'),activity_id:a.id,hash:hash,hash_algorithm:'SHA-256',byte_length:size,actor:who,created_at:nowISO(),activity_period:type==='baseline_record'?{start:periods.map(function(p){return p.start;}).sort()[0],end:periods.map(function(p){return p.end;}).sort().slice(-1)[0]}:{start:a.activity_start,end:a.activity_end},field_id:a.field_id,methodology_id:a.methodology_id,methodology_version:a.methodology_version,rule_pack_hash:hashObject(pack),adapter_version:pack.adapter_version,evidence_type:type,crop_year:year,original_filename:name,source:String(source),content_storage:'not_stored'};
  seal(e,'manifest_hash');db.evidence_manifests.push(e);audit('evidence_attached',e.evidence_id,{hash:e.manifest_hash});await saveDB();return e;
}
async function verifyEvidenceContent(id,file){
  var e=db.evidence_manifests.find(function(x){return x.evidence_id===id;});if(!e)throw new Error('EVIDENCE_NOT_FOUND');var a=getActivity(e.activity_id);guard(a);
  if(!file||!Number.isFinite(file.size)||file.size<0||file.size>5*1024*1024||typeof file.arrayBuffer!=='function')throw new Error('FILE_REQUIRED_MAX_5_MIB');
  var who=actorId,before=hashObject(snapshotFor(a)),size=file.size;var bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==size)throw new Error('FILE_SIZE_CHANGED');var hash=await hashEvidenceBytes(bytes);
  guard(a);if(who!==actorId||before!==hashObject(snapshotFor(a)))throw new Error('STALE_EVIDENCE_OPERATION');
  var result=hash===e.hash&&sealed(e,'manifest_hash')?'MATCH':'MISMATCH';var c=seal({id:uid('check'),evidence_id:id,hash:hash,result:result,actor:who,created_at:nowISO()},'check_hash');
  db.evidence_content_checks.push(c);audit('evidence_recheck',c.id,{hash:c.check_hash});await saveDB();return result;
}
function evaluateSnapshot(snapshot){
  var a=snapshot.activity,pack=snapshot.rule;
  var assessment=assessAG005Snapshot(a,snapshot);
  function check(id,status,note){assessment.checks.push({id:id,status:status,note:note});}
  check('pack_version',pack&&a.activity_type==='midseason_drainage_extension'?'PASS':'FAIL','Exact supported methodology/version and activity type required.');
  var bound=snapshot.evidence.every(function(e){
    var periods=e.evidence_type==='baseline_record'?(a.baseline_periods||[]).filter(function(p){return p.crop_year===e.crop_year;}):[];
    var expected=e.evidence_type==='baseline_record'?{start:periods.map(function(p){return p.start;}).sort()[0],end:periods.map(function(p){return p.end;}).sort().slice(-1)[0]}:{start:a.activity_start,end:a.activity_end};
    return pack&&e.methodology_version===a.methodology_version&&e.rule_pack_hash===hashObject(pack)&&e.adapter_version===pack.adapter_version&&e.activity_id===a.id&&e.field_id===a.field_id&&e.methodology_id===a.methodology_id&&e.activity_period&&inclusiveDays(e.activity_period.start,e.activity_period.end)&&canonicalize(e.activity_period)===canonicalize(expected)&&eventBinds('evidence_attached',e.evidence_id,{hash:e.manifest_hash});
  });
  check('manifest_binding',bound?'PASS':'FAIL','Evidence must bind the current rule pack, adapter, field and activity.');
  var f=snapshot.field,farmer=snapshot.farmer,p=snapshot.program;
  check('field_identity',f&&farmer&&p&&f.field_id===a.field_id&&f.area_ha===a.field_area_ha&&f.region===a.region&&f.farmer_id===a.farmer_id&&f.program_id===a.program_id&&farmer.program_id===a.program_id?'PASS':'FAIL','Program, farmer, field and activity must agree.');
  check('duplicate_overlap',activityConflict(a)?'FAIL':'PASS','Same normalized field, methodology, activity type and overlapping period in this dataset.');
  var groups=new Map();snapshot.evidence.forEach(function(e){var key=e.evidence_type+':'+e.crop_year;if(!groups.has(key))groups.set(key,new Set());groups.get(key).add(e.hash);});
  var conflicts=[];groups.forEach(function(hashes,key){if(hashes.size>1)conflicts.push(key);});
  var exceptions=assessment.checks.filter(function(c){return c.status==='FAIL'||c.status==='MISSING';}).map(function(c){return {id:c.id,kind:'blocking',detail:c.note||c.id};});
  conflicts.sort().forEach(function(key){exceptions.push({id:'conflicting_evidence:'+key,kind:'judgement',detail:'Different content hashes for one evidence category/year; inspect originals and document their relationship.'});});
  assessment.exceptions=exceptions;
  assessment.status=exceptions.some(function(e){return e.kind==='blocking';})?'BLOCKED':exceptions.length?'EXCEPTION':'READY_FOR_ATTESTATION';
  assessment.rule_pack_hash=hashObject(pack);
  assessment.disclosures=['CONFIG REQUIRED: adopted methodology and coefficient applicability unconfirmed.','Sustainability declaration and evidence authenticity require final human attestation.','Attestation is for this research package, not formal external verification.'];
  return assessment;
}
function latestEvaluation(a){return db.evaluations.filter(function(r){return r.activity_id===a.id;}).slice(-1)[0];}
function evaluationCurrent(a,r){return !!(r&&sealed(r,'evaluation_hash')&&r.input_fingerprint===hashObject(snapshotFor(a))&&eventBinds('evaluation_created',r.id,{hash:r.evaluation_hash}));}
async function evaluateActivity(id){
  var a=getActivity(id);guard(a);if(attestationFor(a))throw new Error('ATTESTED_ACTIVITY_LOCKED');
  var snapshot=snapshotFor(a),result=evaluateSnapshot(snapshot);
  var r=seal({id:uid('evaluation'),activity_id:id,created_by:actorId,created_at:nowISO(),input_fingerprint:hashObject(snapshot),snapshot:snapshot,result:result,provenance:{audit_head:db.audit_head}},'evaluation_hash');
  db.evaluations.push(r);audit('evaluation_created',r.id,{hash:r.evaluation_hash});await saveDB();return r;
}
function decisionsFor(r){return db.exception_decisions.filter(function(d){return d.evaluation_id===r.id;});}
function validDecision(d){var u=db.users.find(function(x){return x.id===d.reviewer;});return !!(u&&u.status==='active'&&u.role==='reviewer'&&sealed(d,'decision_hash')&&eventBinds('exception_decided',d.id,{hash:d.decision_hash}));}
function unresolvedExceptions(r){return r.result.exceptions.filter(function(e){var d=decisionsFor(r).find(function(x){return x.exception_id===e.id;});return e.kind==='blocking'||!d||!validDecision(d)||d.decision!=='accept_with_reason';});}
async function decideException(id,exceptionId,decision,note){
  var a=getActivity(id);guard(a,'reviewer');if(attestationFor(a))throw new Error('ATTESTED_ACTIVITY_LOCKED');var r=latestEvaluation(a);if(!evaluationCurrent(a,r))throw new Error('STALE_EVALUATION');
  var e=r.result.exceptions.find(function(x){return x.id===exceptionId;});if(!e)throw new Error('EXCEPTION_NOT_FOUND');
  if(['accept_with_reason','reject'].indexOf(decision)<0||e.kind==='blocking'&&decision!=='reject')throw new Error('BLOCKING_EXCEPTION_NOT_OVERRIDABLE');
  if(decisionsFor(r).some(function(x){return x.exception_id===exceptionId;}))throw new Error('EXCEPTION_ALREADY_DECIDED');
  var d=seal({id:uid('decision'),evaluation_id:r.id,input_fingerprint:r.input_fingerprint,exception_id:e.id,decision:decision,note:humanNote(note),reviewer:actorId,created_at:nowISO()},'decision_hash');
  db.exception_decisions.push(d);audit('exception_decided',d.id,{hash:d.decision_hash});await saveDB();return d;
}
function draftPackage(id){
  var a=getActivity(id);guard(a);var r=latestEvaluation(a);if(!evaluationCurrent(a,r))throw new Error('STALE_EVALUATION');
  var decisions=decisionsFor(r);if(decisions.some(function(d){return !validDecision(d);}))throw new Error('DECISION_INTEGRITY_BLOCKED');
  return {schema:'naft-monitoring-package-1',status:'draft_incomplete_configuration',boundary:DISCLAIMER,methodology:clone(r.snapshot.rule),rule_pack_hash:r.result.rule_pack_hash,field_identity:fieldIdentity(a),activity_identity:activityIdentity(a),snapshot:clone(r.snapshot),evaluation:clone(r),exception_decisions:clone(decisions),unresolved_exceptions:clone(unresolvedExceptions(r)),calculation:clone(r.result.calculation),provenance:{evaluation_audit_head:r.provenance.audit_head,evaluation_hash:r.evaluation_hash},formal_verification:'not_performed'};
}
async function attestPackage(id,note,acknowledged){
  var a=getActivity(id);guard(a,'reviewer');if(attestationFor(a))throw new Error('DUPLICATE_ATTESTATION_BLOCKED');
  if(acknowledged!==true)throw new Error('ATTESTATION_ACKNOWLEDGEMENT_REQUIRED');note=humanNote(note);
  var pack=methodologyPack(a);if(!pack||!validRelease(pack))throw new Error('PACK_RELEASE_APPROVAL_REQUIRED');
  var draft=draftPackage(id);if(draft.unresolved_exceptions.length)throw new Error('UNRESOLVED_EXCEPTIONS');
  var document=Object.assign({},draft,{status:'attested_incomplete_configuration',attestation:{reviewer:actorId,at:nowISO(),statement:note,acknowledged:true,scope:'package_only_not_certification',pack_release:clone(packRelease(pack)),audit_head:db.audit_head}});
  var record=seal({id:uid('attestation'),activity_id:id,evaluation_id:draft.evaluation.id,input_fingerprint:draft.evaluation.input_fingerprint,document:document,package_hash:hashObject(document)},'attestation_hash');
  db.attestations.push(record);audit('package_attested',record.id,{hash:record.attestation_hash});await saveDB();return record;
}
function monitoringPackage(id,attested){
  var a=getActivity(id);guard(a);if(!attested)return draftPackage(id);var r=attestationFor(a);
  if(!r||!sealed(r,'attestation_hash')||hashObject(r.document)!==r.package_hash||!eventBinds('package_attested',r.id,{hash:r.attestation_hash}))throw new Error('ATTESTATION_INTEGRITY_BLOCKED');
  if(r.input_fingerprint!==hashObject(snapshotFor(a)))throw new Error('STALE_PACKAGE');
  if(!evaluationCurrent(a,latestEvaluation(a)))throw new Error('STALE_EVALUATION');
  var u=db.users.find(function(x){return x.id===r.document.attestation.reviewer;});if(!u||u.status!=='active'||u.role!=='reviewer')throw new Error('ATTESTATION_INTEGRITY_BLOCKED');
  return {package_hash:r.package_hash,document:clone(r.document)};
}
function exportMonitoringJSON(id,attested){return canonicalize(monitoringPackage(id,attested));}
function programAggregate(id){var p=db.programs.find(function(x){return x.id===id;}),u=currentUser();if(!p||!u||!(u.role==='reviewer'||u.role==='operator'&&p.owner_user_id===u.id))throw new Error('ROLE_BLOCKED');var acts=db.activities.filter(function(a){return a.program_id===id;}),ids=new Set(acts.map(function(a){return a.id;}));return {program_id:id,farmers:db.farmers.filter(function(f){return f.program_id===id;}).length,fields:db.fields.filter(function(f){return f.program_id===id;}).length,area_ha:db.fields.filter(function(f){return f.program_id===id;}).reduce(function(sum,f){return sum+f.area_ha;},0),activities:acts.length,evidence:db.evidence_manifests.filter(function(e){return ids.has(e.activity_id);}).length,attested_packages:db.attestations.filter(function(r){return ids.has(r.activity_id);}).length};}
