/** Asia rice-MRV research references: NOT a certification, factor registry, or JP AG-005 pack. */
import {createHash} from 'node:crypto';
const fail = code => {throw Error(code);};
const finite = (n, label, positive=false) => {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || (positive && n === 0)) fail('INVALID_'+label);
  return n;
};
const source = url => {if (typeof url !== 'string' || !/^https:\/\/[\w.-]+\//.test(url)) fail('SOURCE_URL_REQUIRED'); return url;};
const idSet = ['IPCC2019_TIER1_MULTIPLE_DRAINAGE','IPCC2019_TIER1_CONTINUOUS_FLOOD',
  'TAIWAN_2023_SECOND_SEASON','TAIWAN_2024_FIRST_SEASON',
  'KOREA_ANSEONG_2026','VIETNAM_CENTRAL_2019_2021','JCM_PH_AM004_V1'];
export function inspectAsiaReferences(data) {
  if (!data || data.schema !== 'naft-asia-mrv-research-fixtures-1' ||
      !Array.isArray(data.reference_cases) || data.reference_cases.length !== 7) fail('ASIA_FIXTURE_SCHEMA_INVALID');
  if (!String(data.policy).includes('RESEARCH_BENCHMARK_ONLY')) fail('ASIA_OFFICIAL_STATUS_FORGED');
  const rows=new Map();
  for (const row of data.reference_cases) {
    if (!row || !idSet.includes(row.id) || rows.has(row.id)) fail('ASIA_DUPLICATE_OR_UNKNOWN_CASE');
    source(row.source); rows.set(row.id,row);
  }
  if (rows.size !== idSet.length) fail('ASIA_MISSING_CASE');
  const ipcc=id=>{
    const x=rows.get(id);
    if (x.type!=='IPCC_WORKED_EXAMPLE' || x.units!=='kg_CH4_ha_day' ||
      x.method_status!=='IPCC_2019_TIER1_ILLUSTRATIVE_NOT_AG005') fail('IPCC_UNIT_OR_AUTHORITY_MISMATCH');
    const ef=finite(x.efc,'EFC',true)*finite(x.sfw,'SF_W')*finite(x.sfp,'SF_P')*finite(x.sfo,'SF_O');
    if (Math.abs(ef-finite(x.expected_exact,'EXPECTED_EF'))>1e-12 ||
        Math.abs(Math.round(ef*100)/100-finite(x.published_rounded,'PUBLISHED_EF'))>1e-12)
      fail('IPCC_REFERENCE_ARITHMETIC_MISMATCH');
    return ef;
  };
  const drainage=ipcc(idSet[0]), flood=ipcc(idSet[1]);
  if (drainage>=flood) fail('IPCC_WATER_REGIME_ORDER_INVALID');
  const taiwan=id=>{
    const x=rows.get(id);
    if (x.type!=='PUBLISHED_FIELD_AGGREGATE' || x.research_only!==true ||
      x.units!=='kg_CH4_ha_season' || !x.season ||
      !(finite(x.cf,'CF',true)>=finite(x.conventional,'CONVENTIONAL') &&
        x.conventional>=finite(x.intermittent,'INTERMITTENT'))) fail('TAIWAN_SCOPE_OR_UNITS_INVALID');
    return x.intermittent/x.cf;
  };
  const tw23=taiwan(idSet[2]),tw24=taiwan(idSet[3]);
  if(Math.abs(tw23-tw24)<=0.10) fail('SEASONAL_DIFFERENCE_LOST');
  const kr=rows.get(idSet[4]),vn=rows.get(idSet[5]),ph=rows.get(idSet[6]);
  if (kr.type!=='PUBLISHED_FIELD_STUDY_ABSTRACT' || kr.research_only!==true ||
      finite(kr.max_ch4_reduction_percent,'KR_CH4')>100 ||
      vn.type!=='PUBLISHED_FIELD_STUDY_ABSTRACT' || vn.research_only!==true ||
      finite(vn.awdcf_ch4_reduction_percent,'VN_CH4')>100 ||
      finite(vn.awdcf_n2o_increase_percent,'VN_N2O',true)===0 ||
      ph.type!=='APPROVED_FOREIGN_JCM_METHODOLOGY_METADATA' ||
      ph.status!=='FOREIGN_REGULATORY_METHOD_DO_NOT_SUBSTITUTE_JAPAN_AG005' ||
      !ph.requirements?.includes('drainage_pump_CO2')) fail('FOREIGN_SCOPE_OR_GAS_BOUNDARY_INVALID');
  const result={scope:'RESEARCH_ONLY',source_documents_authenticated:false,
    japanese_methodology_configured:false,official_jcredit_tco2:null,
    verified_field_claims:0,reference_cases:7,
    ipcc_kg_ch4_ha_day:{multiple_drainage:drainage,continuous_flood:flood},
    taiwan_seasonal_ratio:{crop_2023_2:tw23,crop_2024_1:tw24},
    vietnam_n2o_rebound_retained:true,philippines_method_is_japan_method:false};
  return {...result,fixture_sha256:createHash('sha256').update(JSON.stringify(data)).digest('hex')};
}
export function inventoryIpcc2019Replay() {
  // IPCC 2019 example Table 5.14a-c: ROUNDED illustrative strata, not field measurements.
  const strata=[['continuous',1500000,1.48,102],['multiple',1500000,0.81,102],
    ['rainfed',900000,0.59,102],['upland',450000,0,102],['deepwater',150000,0.18,220]];
  const gg=strata.reduce((sum,[,area,ef,days])=>sum+area*ef*days/1e6,0);
  return {gg_ch4_year:Math.round(gg*100)/100,published_gg_ch4_year:410.47,
    unit:'Gg_CH4_per_year',authority:'IPCC_2019_NATIONAL_INVENTORY_ILLUSTRATION',
    source:'https://www.ipcc-tfi.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch05_Cropland.pdf',
    credit_issuance:null};
}
export function methaneMassKg(value,basis) {
  finite(value,'METHANE_MASS');
  if(basis==='kg_CH4')return value;
  if(basis==='kg_CH4_C')return value*16/12;
  fail('METHANE_MASS_BASIS_REQUIRED');
}
export function n2oMassKg(value,basis) {
  finite(value,'N2O_MASS');
  if(basis==='kg_N2O')return value;
  if(basis==='kg_N2O_N')return value*44/28;
  fail('N2O_MASS_BASIS_REQUIRED');
}
export function compareMethaneSeasons(a,b) {
  for (const x of [a,b]) {
    if(!x || x.gas!=='CH4' || x.period_basis!=='cropping_season' ||
       !x.season_id || !x.country || !x.methodology_id)fail('METADATA_OR_TIME_BASIS_MISSING');
    source(x.source);
  }
  if(a.season_id!==b.season_id)fail('SEASON_MISMATCH');
  if(a.country!==b.country || a.methodology_id!==b.methodology_id)fail('JURISDICTION_METHOD_TRANSFER_BLOCKED');
  return {delta_kg_ch4_per_ha_season:methaneMassKg(a.value_kg_per_ha,a.mass_basis)-methaneMassKg(b.value_kg_per_ha,b.mass_basis),
    institutional_credit:null,scope:'SAME_METHOD_RESEARCH_COMPARISON_ONLY'};
}
export function replayPhAm004Synthetic({country,method,reference,project,approach,interval_years,flags}) {
  if(country!=='PH'||method!=='PH_AM004@1.0')fail('JURISDICTION_METHOD_TRANSFER_BLOCKED');
  if(!Number.isInteger(interval_years))fail('UNSUPPORTED_MEASUREMENT_SCHEDULE');
  const schedules={'DIRECT_MEASUREMENT:3':0.05,'DIRECT_MEASUREMENT:4':0.10,
    'DIRECT_MEASUREMENT:5':0.10,'COUNTRY_FACTOR_PLUS_MEASUREMENT:5':0.15};
  const ud=schedules[approach+':'+interval_years];
  if(ud===undefined)fail('UNSUPPORTED_MEASUREMENT_SCHEDULE');
  const required=['CH4','N2O','PUMP_CO2'];
  for(const item of [reference,project]){
    if(!item||Object.keys(item).length!==3 || required.some(g=>!Object.hasOwn(item,g)))
      fail('MISSING_GAS_OR_PUMP_SCOPE');
    for(const gas of required)finite(item[gas],'GAS_COMPONENT');
  }
  const needed=['project_drainage_pump_included','paired_water_regime','same_soil_stratum',
    'preseason_regime_recorded','fertilizer_n_recorded','evidence_verified'];
  if(!flags||needed.some(key=>flags[key]!==true))fail('RESEARCH_EVIDENCE_BOUNDARY_UNMET');
  const re=required.reduce((a,k)=>a+reference[k],0),pe=required.reduce((a,k)=>a+project[k],0);
  return {research_net_tco2e:(re-pe)*(1-ud),research_gross_delta_tco2e:re-pe,
    uncertainty_deduction:ud,scope:'PH_SYNTHETIC_ARITHMETIC_ONLY',
    verified_ph_credits:null,verified_jp_credits:null,eligibility_verified:false};
}
