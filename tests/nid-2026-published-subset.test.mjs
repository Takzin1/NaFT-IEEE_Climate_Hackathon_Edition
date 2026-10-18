import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectNidPublishedTohoku2024,selectNidPublishedTohoku2024} from '../src/nid-2026-published-subset.mjs';
const path=new URL('../research/japan-primary-evidence-2026-10-18/nid2026-tohoku-2024-table545.json',import.meta.url);
const original=JSON.parse(fs.readFileSync(path,'utf8'));
let count=0;
const ok=v=>{assert.ok(v);count++};
const no=(change,expected)=>{const data=structuredClone(original);change(data);assert.throws(()=>inspectNidPublishedTohoku2024(data),new RegExp(expected));count++};
const report=inspectNidPublishedTohoku2024(original);
ok(report.published_cells===18&&report.status==='PUBLISHED_NATIONAL_INVENTORY_REFERENCE_ONLY');
ok(report.jcredit_ag005_authorization===false&&report.official_project_tco2e===null);
ok(report.source_pdf_bytes_cryptographically_authenticated===false);
ok(report.printed_factor_unit==='kg-CH4-C/ha');
ok(report.source_record_sha256===inspectNidPublishedTohoku2024(original).source_record_sha256);
const expected=[
 ['POOR_DRAINAGE','CONTINUOUS_FLOOD',[692,665,175]],
 ['POOR_DRAINAGE','INTERMITTENT_IRRIGATION',[665,638,153]],
 ['DAILY_DRAINAGE','CONTINUOUS_FLOOD',[513,492,119]],
 ['DAILY_DRAINAGE','INTERMITTENT_IRRIGATION',[365,349,71]],
 ['FOUR_HOUR_DRAINAGE','CONTINUOUS_FLOOD',[472,452,97]],
 ['FOUR_HOUR_DRAINAGE','INTERMITTENT_IRRIGATION',[330,316,59]]];
for(const [drainage,water,values] of expected){
 for(let i=0;i<3;i++){
  const organic=['straw','compost','none'][i];
  const ret=selectNidPublishedTohoku2024(original,{drainage,water_management:water,
   organic,inventory_edition:'2026',factor_year:'2024',region:'東北'});
  ok(ret.published_kg_ch4_c_per_ha===values[i]);
  ok(ret.certified_tco2e===null&&ret.jcredit_method_factor_approved===false);
 }
}
no(x=>x.strata.pop(),'COVERAGE');
no(x=>x.strata[1]=structuredClone(x.strata[0]),'DUPLICATE');
no(x=>x.strata[2].straw=999,'CELL_MISMATCH');
no(x=>x.strata[5].none=60,'CELL_MISMATCH');
no(x=>x.strata[4].printed_page='5-40','CELL_MISMATCH');
no(x=>x.strata[0].stray=1,'ROW_SCHEMA');
no(x=>x.strata[0].none='175','CELL_MISMATCH');
no(x=>x.strata[0].straw=NaN,'CELL_MISMATCH');
no(x=>x.strata[0].water_management='IRRIGATED','MISSING_STRATUM');
no(x=>x.inventory_factor_year='2025','CONTEXT_OR_VERSION');
no(x=>x.inventory_edition='2025','CONTEXT_OR_VERSION');
no(x=>x.region='北海道','CONTEXT_OR_VERSION');
no(x=>x.official_pdf_url='https://example.org/forged','CONTEXT_OR_VERSION');
no(x=>x.printed_factor_unit='kg_CH4_ha_day','CONTEXT_OR_VERSION');
no(x=>x.source_pdf_sha256='f'.repeat(64),'CONTEXT_OR_VERSION');
no(x=>x.original_document_bytes_cryptographically_verified=true,'CONTEXT_OR_VERSION');
no(x=>x.official_jcredit_method_use_verified=true,'CONTEXT_OR_VERSION');
no(x=>x.certified_credit_quantity=100,'CONTEXT_OR_VERSION');
no(x=>x.provenance='CERTIFIED','CONTEXT_OR_VERSION');
const good={drainage:'FOUR_HOUR_DRAINAGE',water_management:'INTERMITTENT_IRRIGATION',
 organic:'none',inventory_edition:'2026',factor_year:'2024',region:'東北'};
for(const [field,value,expectedCode] of [
 ['factor_year','2025','GEOGRAPHY_VERSION'],['inventory_edition','2025','GEOGRAPHY_VERSION'],
 ['region','関東','GEOGRAPHY_VERSION'],['organic','peat','ORGANIC_CLASS'],
 ['water_management','AWD','STRATUM_UNSUPPORTED'],['drainage','BAD','STRATUM_UNSUPPORTED']
]){
 const req={...good,[field]:value};
 assert.throws(()=>selectNidPublishedTohoku2024(original,req),new RegExp(expectedCode));count++;
}
assert.throws(()=>selectNidPublishedTohoku2024(original,{...good,allow_certify:true}),/GEOGRAPHY_VERSION/);count++;
console.log('NID_2026_TOHOKU_PUBLISHED_TABLE_PASS: '+count+' assertions; 18 visually verified cells, no J-Credit outputs');
