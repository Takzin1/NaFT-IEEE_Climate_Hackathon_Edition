'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={Math,Number,Date,Error,Set,Object};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/asia-mrv-compat.js','utf8'),ctx);
let passed=0;
const ok=(v,m)=>{assert.ok(v,m);passed++};
const eq=(v,w)=>{ok(Math.abs(v-w)<1e-8,v+' != '+w)};
const reject=(fn,re)=>{assert.throws(fn,new RegExp(re));passed++};
const fixture=JSON.parse(fs.readFileSync('research/asia-mrv-2026-10-18/fixtures.json','utf8'));
const origin=JSON.parse(fs.readFileSync('research/asia-mrv-2026-10-18/source-manifest.json','utf8'));
ok(fixture.research_only===true&&fixture.official_jcredit_outputs_enabled===false);
ok(origin.original_publisher_bytes_independently_verified===false&&origin.approved_in_japan===false);
ok(fixture.source_original_zip_sha256===origin.source_uploaded_zip_sha256);
const ip=ctx.naftAsiaIpcc2019Example(fixture.ipcc2019_rounded_strata);
eq(ip.annual_gg_ch4,410.472);ok(ip.published_2dp===410.47&&ip.approved_jcredit_tco2e===null);
reject(()=>ctx.naftAsiaIpcc2019Example(fixture.ipcc2019_rounded_strata.slice(0,4)),'IPCC_EXPECTED');
reject(()=>ctx.naftAsiaIpcc2019Example(fixture.ipcc2019_rounded_strata.map((x,i)=>i===1?{...x,id:'CF'}:x)),'IPCC_DUPLICATE');
reject(()=>ctx.naftAsiaIpcc2019Example(fixture.ipcc2019_rounded_strata.map((x,i)=>i===1?{...x,unit:'kg_CH4_C_ha_day'}:x)),'IPCC_UNIT');
reject(()=>ctx.naftAsiaIpcc2019Example(fixture.ipcc2019_rounded_strata.map((x,i)=>i===1?{...x,daily_ef_kg_ch4_ha_day:.9}:x)),'IPCC_REFERENCE_RECORD_MISMATCH');
eq(ctx.naftAsiaCh4Kg(12,'kg_CH4_C'),16);eq(ctx.naftAsiaCh4Kg(16,'kg_CH4'),16);
eq(ctx.naftAsiaN2oKg(28,'kg_N2O_N'),44);
reject(()=>ctx.naftAsiaCh4Kg(12,'kg_C'),'UNSUPPORTED_CH4');
reject(()=>ctx.naftAsiaCh4Kg(Number.NaN,'kg_CH4'),'INVALID_QUANTITY');
const m={assertion_id:'PHYSICAL-TRAINING-001',field_id:'FIELD-A',country:'JP',gas:'CH4',
 quantity_kind:'emission_factor',area_unit:'ha',period_basis:'crop_year',period_id:'2026',
 stratum_id:'SYN-SOIL',water_regime:'MIDSEASON',source_uri:'urn:synthetic:ref',
 methodology_id:'AG-005@3.3-reference',data_status:'SYNTHETIC'};
const a={...m,mass_basis:'kg_CH4_C',value_kg_per_ha:12};
const b={...m,mass_basis:'kg_CH4',value_kg_per_ha:16,methodology_id:'RESEARCH-EDITION'};
const q=ctx.naftAsiaPhysicalCompare(a,b);
eq(q.delta_kg_ch4_per_ha,0);ok(q.numerically_equal_within_1e_9===true&&q.coefficient_transfer_allowed===false);
for(const [k,v] of [['field_id','different'],['country','PH'],['period_id','2025'],['stratum_id','different'],['water_regime','CF'],['period_basis','cropping_season']])
 reject(()=>ctx.naftAsiaPhysicalCompare(a,{...b,[k]:v}),'PHYSICAL_CONTEXT_MISMATCH');
reject(()=>ctx.naftAsiaPhysicalCompare(a,{...b,area_unit:'acre'}),'PHYSICAL_GAS');
reject(()=>ctx.naftAsiaPhysicalCompare(a,{...b,mass_basis:'kg_C'}),'UNSUPPORTED_CH4');
reject(()=>ctx.naftAsiaPhysicalCompare(a,{...b,value_kg_per_ha:Number.POSITIVE_INFINITY}),'INVALID_QUANTITY');
const key={country:'JP',methodology_id:'AG-005',methodology_version:'3.3-reference',period_id:'2026'};
const r=ctx.naftAsiaRegulatoryFactorGate({...key,status:'RESEARCH_REFERENCE'},key);
ok(r.status==='CONFIG_REQUIRED'&&r.regulatory_factor_usable===false);
reject(()=>ctx.naftAsiaRegulatoryFactorGate({...key,country:'PH',status:'RESEARCH_REFERENCE'},key),'CROSS_COUNTRY');
reject(()=>ctx.naftAsiaRegulatoryFactorGate({...key,methodology_id:'PH_AM004',status:'RESEARCH_REFERENCE'},key),'CROSS_METHODOLOGY');
reject(()=>ctx.naftAsiaRegulatoryFactorGate({...key,period_id:'2027',status:'RESEARCH_REFERENCE'},key),'CROSS_PERIOD');
reject(()=>ctx.naftAsiaRegulatoryFactorGate({...key,status:'OFFICIAL'},key),'UNVERIFIED_OR_OFFICIAL');
const flags={paired_water_regime:true,soil_stratum_recorded:true,fertilizer_n_recorded:true,
 preseason_water_recorded:true,pump_boundary_recorded:true,evidence_manifest_present:true};
const ph={country:'PH',methodology_id:'PH_AM004@1.0',data_status:'SYNTHETIC',
 approach:'DIRECT_MEASUREMENT',measurement_interval_years:3,
 reference_tco2e:{CH4:120,N2O:8,PUMP_CO2:0},
 project_tco2e:{CH4:60,N2O:12,PUMP_CO2:6},boundary:flags};
const j=ctx.naftAsiaPhAm004(ph);eq(j.research_net_after_tco2e,47.5);
ok(j.approved_jcm_credits===null&&j.approved_jcredit_credits===null);
eq(ctx.naftAsiaPhAm004({...ph,measurement_interval_years:4}).research_net_after_tco2e,45);
eq(ctx.naftAsiaPhAm004({...ph,approach:'COUNTRY_FACTOR_PLUS_MEASUREMENT',measurement_interval_years:5}).research_net_after_tco2e,42.5);
reject(()=>ctx.naftAsiaPhAm004({...ph,country:'JP'}),'PH_ONLY_METHOD');
reject(()=>ctx.naftAsiaPhAm004({...ph,measurement_interval_years:2}),'PH_UNSUPPORTED');
reject(()=>ctx.naftAsiaPhAm004({...ph,measurement_interval_years:'3'}),'PH_INVALID');
reject(()=>ctx.naftAsiaPhAm004({...ph,project_tco2e:{CH4:60,N2O:12}}),'PH_MISSING');
reject(()=>ctx.naftAsiaPhAm004({...ph,boundary:{...flags,pump_boundary_recorded:false}}),'PH_EVIDENCE');
const negative=ctx.naftAsiaPhAm004({...ph,reference_tco2e:{CH4:0,N2O:0,PUMP_CO2:0}});
ok(negative.status==='NEGATIVE_NET_RESEARCH_ONLY'&&negative.approved_jcm_credits===null);
const s={country:'TW',calendar_year:'2023',field_id:'TEST',area_unit:'ha',gas:'CH4',mass_basis:'kg_CH4',area_ha:1};
const rows=[{...s,season_id:'1',reference_kg_ch4_ha_season:100,project_kg_ch4_ha_season:50},
 {...s,season_id:'2',reference_kg_ch4_ha_season:300,project_kg_ch4_ha_season:240}];
const tw=ctx.naftAsiaSeasonalAggregate(rows);eq(tw.reduction_percent,27.5);
ok(tw.official_jcredit_tco2e===null);
reject(()=>ctx.naftAsiaSeasonalAggregate([rows[0],{...rows[1],calendar_year:'2024'}]),'SEASON_CONTEXT_MISMATCH');
reject(()=>ctx.naftAsiaSeasonalAggregate([rows[0],{...rows[1],season_id:'1'}]),'SEASON_DUPLICATED');
reject(()=>ctx.naftAsiaSeasonalAggregate([{...rows[0],reference_kg_ch4_ha_season:0,project_kg_ch4_ha_season:0}]),'SEASON_ZERO_REFERENCE');
ok(fixture.published_case_metadata.find(x=>x.id==='TAIWAN_2024_FIRST').calendar_year==='2024');
ok(fixture.published_case_metadata.find(x=>x.id==='PH_AM004').status.includes('NOT_JAPAN'));
// Research-only annual coverage must NEVER be inferred from partial seasonal rows.
ok(tw.status==='RESEARCH_WEIGHTED_RECORDED_SEASONS_ONLY');
ok(tw.annual_coverage_verified===false&&tw.original_sources_verified===false);
const sourceHash='a'.repeat(64);
const annual={country:'TW',calendar_year:'2023',field_id:'TEST',methodology_id:'TW-LAB@1',
  data_status:'RESEARCH_REFERENCE',source_manifest_sha256:sourceHash,
  field_area_ha:1,expected_season_ids:['1','2']};
const record=season=>({...season,methodology_id:annual.methodology_id,
  data_status:annual.data_status,source_manifest_sha256:sourceHash,
  source_record_id:'TW-STUDY-'+season.season_id,source_uri:'https://doi.org/10.6165/tai.2025.70.530'});
const yr=[record(rows[0]),record(rows[1])];
const locked=ctx.naftAsiaDeclaredAnnualCoverage(yr,annual);
eq(locked.reduction_percent,27.5);
ok(locked.declared_complete===true&&locked.annual_coverage_verified===false&&
   locked.original_sources_verified===false&&locked.official_jcredit_tco2e===null);
ok(locked.status==='RESEARCH_DECLARED_COVERAGE_ONLY'&&locked.declared_seasons.length===2);
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage(yr.slice(0,1),annual),'ANNUAL_INCOMPLETE');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage([...yr,record({...rows[0],season_id:'3'})],annual),'ANNUAL_INCOMPLETE');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage([yr[0],yr[0]],annual),'ANNUAL_SEASON');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage([yr[0],{...yr[1],season_id:'3'}],annual),'ANNUAL_SEASON');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage(yr,{...annual,expected_season_ids:['1','1']}),'ANNUAL_EXPECTED');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage(yr,{...annual,expected_season_ids:['1']}),'ANNUAL_INCOMPLETE');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage(yr,{...annual,field_area_ha:0}),'ANNUAL_POSITIVE');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage(yr,{...annual,source_manifest_sha256:'bad'}),'ANNUAL_SOURCE_DIGEST');
reject(()=>ctx.naftAsiaDeclaredAnnualCoverage(yr,{...annual,data_status:'CERTIFIED'}),'ANNUAL_UNVERIFIED');
for(const [key,value,code] of [
 ['country','JP','ANNUAL_FIELD_OR_PERIOD'],['calendar_year','2024','ANNUAL_FIELD_OR_PERIOD'],
 ['field_id','DIFFERENT','ANNUAL_FIELD_OR_PERIOD'],['methodology_id','AG-005','ANNUAL_SOURCE_OR_METHOD'],
 ['data_status','SYNTHETIC','ANNUAL_SOURCE_OR_METHOD'],
 ['source_manifest_sha256','b'.repeat(64),'ANNUAL_SOURCE_OR_METHOD'],
 ['source_record_id',null,'MISSING_METADATA'],['source_uri',null,'MISSING_METADATA'],
 ['area_ha',2,'ANNUAL_FIELD_AREA_CHANGED']
])reject(()=>ctx.naftAsiaDeclaredAnnualCoverage([yr[0],{...yr[1],[key]:value}],annual),code);
const negativeYear=ctx.naftAsiaDeclaredAnnualCoverage(
 [{...yr[0],project_kg_ch4_ha_season:130}, {...yr[1],project_kg_ch4_ha_season:360}],annual);
ok(negativeYear.status==='RESEARCH_DECLARED_COVERAGE_NEGATIVE_REDUCTION'&&
   negativeYear.reduction_percent<0&&negativeYear.official_jcredit_tco2e===null);

console.log('ASIA_MRV_COMPAT_PASS: '+passed+' research assertions, 0 failures');
