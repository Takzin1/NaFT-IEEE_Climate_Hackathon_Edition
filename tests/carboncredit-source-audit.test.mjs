import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const d=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../research/carboncredit-link-audit-2026-10-25/source-audit.json',import.meta.url)),'utf8'));
assert.equal(d.schema,'naft-carbon-credit-source-link-audit-v1');
assert.equal(d.row_count,32);assert.equal(d.rows.length,32);assert.equal(d.unique_url_count,31);
assert.equal(new Set(d.rows.map(x=>x.id)).size,32);
assert.equal(d.archive_copy_included,false);assert.equal(d.runtime_import_enabled,false);assert.equal(d.redistribution_permission_established,false);
assert.equal(d.local_uploaded_csv_sha256,'1a921b2c5037fd7cd603b33d9e28698278b4f7600d269a88d4e9f640cc19cfe0');
for(const r of d.rows){
 assert.ok(r.web_review_status&&r.web_evidence_url.startsWith('https://'));
 assert.ok(r.normalized_url.startsWith('https://'));
 assert.equal(r.admitted_role,'REFERENCE_AND_DISCOVERY_ONLY');
 assert.equal(r.data_bytes_refetched_this_turn,false);assert.equal(r.claimed_binary_sha256_independently_verified,false);
 assert.equal(r.entire_target_dataset_read,false);assert.equal(r.certified_emission_factor,false);
 assert.equal(r.certified_credit_claim,false);assert.equal(r.source_of_truth_for_pricing,false);
 assert.ok(r.source_file_claims&&typeof r.source_file_claims.claimed_license==='string');
 assert.ok(r.review_note.length>=25);
}
assert.equal(d.rows.find(x=>x.id==='2-02').web_review_status,'STALE_REDIRECT');
assert.equal(d.rows.find(x=>x.id==='3-04').web_review_status,'DEPRECATED_OFFICIAL_DOCUMENT');
assert.equal(d.rows.find(x=>x.id==='3-06').normalized_url,d.rows.find(x=>x.id==='2-01').normalized_url);
console.log('CARBONCREDIT_SOURCE_AUDIT_PASS: 32 records / 31 URLs; no automatic carbon-credit or official method intake');
