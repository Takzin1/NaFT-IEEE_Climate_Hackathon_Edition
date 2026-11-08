"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const replay=require("../scripts/ieee-independent-gasfluxes-node.cjs");
const BASE=path.resolve(__dirname,"../research/ieee-observation-datasets-2026-10-19/independent-benchmarks/gasfluxes-v0.7-2");
const good=fs.readFileSync(path.join(BASE,"fluxmeas-first-five.csv"));
const manifest=replay.load();
const real=replay.replay(good,manifest);
assert.equal(real.status,"INDEPENDENT_NODE_REPLAY_MATCHED_PUBLISHED_R_GOLDEN_VALUES");
assert.equal(real.selected_source_sha256,manifest.dataset.fixture_sha256);
assert.deepEqual(real.series.map(x=>x.id),["ID1","ID2","ID3","ID4","ID5"]);
assert.equal(real.series.reduce((x,r)=>x+r.samples,0),20);
assert.deepEqual(real.series.map(x=>x.linear_f0_benchmark_value<0),[false,true,true,true,false]);
assert.equal(real.Gimje_field_validation,false);
assert.equal(real.certified_tco2e,null);
assert.equal(real.upstream_R_code_executed,false);
for(let i=0;i<5;i++){
 assert.ok(Math.abs(real.series[i].linear_f0_benchmark_value-
   Number(manifest.reference.expected_linear_f0_by_series[i].f0))<1e-10);
}
assert.throws(()=>replay.replay(Buffer.from(good.toString("utf8").replace("0.331782303","0.431782303")),manifest),
 /ORIGINAL_FIXTURE_HASH/);
const parsed=replay.parseRows(good,manifest.dataset.fixture_sha256);
const bad=structuredClone(parsed);
bad.get("ID1")[0].t=bad.get("ID1")[1].t;
assert.throws(()=>replay.solve(bad),/TIME_DUPLICATE_OR_OUT_OF_SCOPE/);
const area=structuredClone(parsed);
area.get("ID2")[0].A=0;
assert.throws(()=>replay.solve(area),/INCONSISTENT_CHAMBER_GEOMETRY/);
const malicious=structuredClone(manifest);
malicious.safety.certified_tco2e=3;
assert.throws(()=>replay.replay(good,malicious),/MANIFEST_BOUNDARY/);
// Upstream oracle numbers cannot be edited without a failed 5-series gate.
const altered=structuredClone(manifest);
altered.reference.expected_linear_f0_by_series[0].f0="999";
assert.throws(()=>replay.replay(good,altered),/INDEPENDENT_REFERENCE_DISAGREEMENT/);
console.log("IEEE_GASFLUXES_NODE_REFERENCE_PASS: 5 original series, 20 measurements, adverse source/golden/certification cases");
