import fs from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const data = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../research/literature-2026-10-25/source-register.json', import.meta.url)), 'utf8'));
assert.equal(data.schema, 'naft-dmrv-literature-reference-v1');
assert.equal(data.source_count, 5);
assert.equal(data.sources.length, 5);
assert.equal(data.reference_is_executable_methodology, false);
assert.equal(data.certification_claim, false);
assert.equal(data.measured_carbon_data_present, false);
assert.equal(data.emission_factors_supplied, false);
assert.equal(data.can_generate_certified_tco2e, false);
assert.match(data.ingest_mode, /METADATA/);
assert.equal(new Set(data.sources.map(s=>s.id)).size, 5);
for (const s of data.sources) {
  assert.match(s.uploaded_sha256, /^[0-9a-f]{64}$/);
  assert.ok(s.uploaded_filename.endsWith('.pdf'));
  assert.ok(s.landing_url.startsWith('https://'));
  assert.ok(s.pages.every(p=>Number.isInteger(p)&&p>=1));
  assert.equal(s.data_class==='LITERATURE_ONLY'||s.data_class==='NON_BINDING_POLICY_REFERENCE', true);
  assert.equal(s.redistribute_pdf, false);
  assert.equal(s.external_publisher_pdf_authenticated, false);
  assert.match(s.engine_integration, /^NOT_PERMITTED/);
  assert.ok(s.gap.length>30);
}
const icvcm=data.sources.find(s=>s.id==='ICVCM_CIWP_DMRV_2026');
assert.ok(icvcm.kind.includes('NON_BINDING'));
assert.equal(icvcm.exact_document_url, null);
const zk=data.sources.find(s=>s.id==='MAN_EMISSION_IMPOSSIBLE_2025');
assert.match(zk.gap,/placeholder/i);
console.log('DMRV_LITERATURE_REGISTER_PASS: 5 reference-only sources; license, provenance and no-certification gates');
