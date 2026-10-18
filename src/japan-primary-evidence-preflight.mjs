/**
 * NaFT source-level preflight for Japanese rice GHG research.
 * No remote downloads, source authentication, MRV certificate, official coefficient
 * installation, credited reductions, or extrapolation from flux snapshots.
 */
import {createHash} from 'node:crypto';
const fail=c=>{throw Error(c)};
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const shaOk=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const exact=(v,k)=>{if(typeof v!=='string'||!v||v.length>160||/[\r\n]/.test(v))fail('REQUIRED_'+k);return v};
const finite=(v,k)=>{if(typeof v!=='number'||!Number.isFinite(v))fail('NONFINITE_'+k);return v};
const url=x=>typeof x==='string'&&/^https:\/\/[^\s/?#]+(?:\/[^\s]*)?$/.test(x);
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fixed={
 NID_JAPAN_2026:['OFFICIAL_NATIONAL_INVENTORY_PUBLICATION','https://www.nies.go.jp/gio/archive/nir/qu9bd60000050ys2-att/NID-JPN-2026-v3.0_J_gioweb.pdf'],
 NID_AGRI_TABLES_2026:['OFFICIAL_NATIONAL_INVENTORY_TIME_SERIES_PORTAL','https://www.nies.go.jp/gio/archive/nirdata/2026.html'],
 AG005_OFFICIAL_CATALOG:['J_CREDIT_METHOD_CATALOG','https://japancredit.go.jp/about/methodology/'],
 ITOH_2011:['ORIGINAL_PEER_REVIEWED_PAPER_AGGREGATED_EXPERIMENT','https://doi.org/10.1016/j.agee.2011.03.019'],
 JAPANFLUX2024_JP_HRT:['RESEARCH_DATASET_WITH_PRIMARY_MEASUREMENTS','https://doi.org/10.17592/001.2024121020'],
 IPCC_2019_RICE_GUIDELINE:['OFFICIAL_SCIENTIFIC_INVENTORY_GUIDELINE','https://www.ipcc-tfi.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch05_Cropland.pdf'],
 GLOBAL_RICE_1961_2020:['MODELLED_ESTIMATES_NOT_FIELD_MEASUREMENTS','https://figshare.com/articles/dataset/Global_rice_paddy_methane_emissions_from_1961_to_2020/29287904']
};
export function reviewJapanPrimarySources(register){
 if(!obj(register)||register.schema!=='naft-japan-primary-source-register-1'||
 !obj(register.policy)||register.policy.research_only!==true||
 register.policy.official_jcredit_factor_bytes_verified!==false||
 register.policy.official_ag005_v35_adoption_verified!==false||
 register.policy.original_publisher_flux_file_downloaded!==false||
 register.policy.certified_tco2e!==null||
 !Array.isArray(register.sources)||register.sources.length!==Object.keys(fixed).length)
 fail('RESEARCH_SOURCE_REGISTER_INVALID');
 const seen=new Set();
 for(const s of register.sources){
  const x=fixed[s?.id];
  if(!x||seen.has(s.id)||s.source_class!==x[0]||s.source_url!==x[1]||
   !url(s.source_url)||s.source_sha256!==null||
   !exact(s.authority,'AUTHORITY')||!exact(s.access,'ACCESS')||
   typeof s.scope!=='string'||s.scope.length<25)
   fail('SOURCE_AUTHORITY_OR_PROVENANCE_INVALID');
  seen.add(s.id);
 }
 const it=register.sources.find(s=>s.id==='ITOH_2011');
 const expected=[['SEASONAL_CH4_TO_CONVENTIONAL',69.5,3.4],
  ['NET_GWP_TO_CONVENTIONAL',72,3.1],['GRAIN_YIELD_TO_CONVENTIONAL',96.2,2]];
 if(it.experiment_sites!==9||it.raw_field_flux_rows_ingested!==0||
  !Array.isArray(it.published_selected_treatment_ratios)||
  JSON.stringify(it.published_selected_treatment_ratios.map(r=>[r.id,r.value_percent,r.standard_error_percent]))!==JSON.stringify(expected)||
  !it.selection?.includes('selected treatments'))fail('PAPER_ABSTRACT_AGGREGATE_CHANGED');
 const jp=register.sources.find(s=>s.id==='JAPANFLUX2024_JP_HRT');
 if(jp.flux_rows_ingested!==0||!jp.access.includes('NOT_DOWNLOADED'))fail('UNVERIFIED_FLUX_DOWNLOAD_CLAIM');
 for(const id of ['NID_JAPAN_2026','NID_AGRI_TABLES_2026','AG005_OFFICIAL_CATALOG']){
  const x=register.sources.find(s=>s.id===id);
  if(x.emission_factor_rows_ingested!==0||x.id==='AG005_OFFICIAL_CATALOG'&&x.adopted_method_original_verified!==false)
   fail('OFFICIAL_FACTOR_OR_METHOD_NOT_VERIFIED');
 }
 const sim=register.sources.find(s=>s.id==='GLOBAL_RICE_1961_2020');
 if(sim.field_measurements_present!==false)fail('MODEL_OUTPUT_MISLABELLED_AS_MEASUREMENT');
 return {status:'RESEARCH_SOURCE_DISCOVERY_ONLY',sources:seen.size,
  original_published_summary_ratios:expected.length,
  raw_field_measurements_imported:0,official_nid_factor_cells_verified:0,
  methodology_adoption_verified:false,certified_tco2e:null,
  register_sha256:sha(register)};
}
/** Operator-extracted inventory coefficient; requires provenance metadata and
 * NEVER admits its scientific arithmetic into an official J-Credit rule pack.
 * The operator-supplied PDF hash is a local claim, not independent verification.
 */
export function preflightNidFactorCandidate(x){
 if(!obj(x)||x.source_id!=='NID_JAPAN_2026'||
  x.data_kind!=='INVENTORY_FACTOR_CANDIDATE'||
  x.factor_unit!=='kg_CH4_C_per_ha_year'||x.gas!=='CH4'||
  x.official_method_use_requested===true||
  x.source_document_authenticated!==false)fail('NID_FACTOR_DOMAIN_OR_AUTHORITY_INVALID');
 if(!shaOk(x.local_pdf_sha256)||!shaOk(x.local_table_sha256))
  fail('NID_SOURCE_BYTES_HASH_REQUIRED');
 for(const field of ['inventory_edition','factor_year','region','drainage_class',
   'water_management','organic_management','page_locator','table_locator'])
  exact(x[field],field);
 if(x.inventory_edition!=='2026')fail('NID_INVENTORY_EDITION_MISMATCH');
 if(!/^(19|20)\d{2}$/.test(x.factor_year))fail('NID_FACTOR_YEAR_INVALID');
 if(typeof x.factor_value!=='string'||! /^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(x.factor_value)||
 x.factor_value.length>45)fail('NID_FACTOR_VALUE_INVALID');
 return {status:'UNVERIFIED_LOCAL_COEFFICIENT_EXTRACTION',input_digest:sha(x),
  complete_context:{edition:x.inventory_edition,year:x.factor_year,
   region:x.region,drainage:x.drainage_class,water:x.water_management,
   organic:x.organic_management},
  factor_value_kind:'USER_TRANSCRIBED_NOT_ADMITTED',factor_unit:x.factor_unit,
  independent_source_bytes_authenticated:false,
  jcredit_factor_usable:false,official_reduction_tco2e:null};
}
/** Raw JP-Hrt time-series preflight. Neither a seasonal total nor matched
 * treatment-control experiment; never fills missing data or extrapolates.
 * Units remain unconverted until publisher ALLVARS metadata is checked.
 */
export function preflightJapanFluxObservations(x){
 if(!obj(x)||x.schema!=='naft-japanflux-raw-preflight-1'||
 x.source_id!=='JAPANFLUX2024_JP_HRT'||x.site_id!=='JP-Hrt'||
 x.study_type!=='SINGLE_SITE_EDDY_COVARIANCE'||
 x.data_status!=='STAGED_UNAUTHENTICATED_BYTES'||
 x.gas!=='CH4'||x.variable!=='FCH4'||
 x.unit!=='UNVERIFIED_PUBLISHER_UNIT'||
 x.preprocessed_gap_filled!==false||
 x.publication_cited!=='https://doi.org/10.5194/essd-17-3807-2025'||
 !shaOk(x.local_file_sha256)||!Array.isArray(x.rows)||
 x.rows.length<1||x.rows.length>50000)
 fail('JAPANFLUX_PRECHECK_SCHEMA_INVALID');
 let previous=-Infinity,measured=0,missing=0;
 for(const row of x.rows){
  if(!obj(row)||Object.keys(row).sort().join(',')!=='flux,quality,timestamp_utc')
   fail('FLUX_ROW_SCHEMA_INVALID');
  const stamp=exact(row.timestamp_utc,'TIMESTAMP');
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(stamp)||!Number.isFinite(Date.parse(stamp))||
   new Date(stamp).toISOString().replace('.000Z','Z')!==stamp)fail('FLUX_TIMESTAMP_INVALID');
  const t=Date.parse(stamp);if(t<=previous)fail('FLUX_TIMESTAMP_DUPLICATE_OR_UNSORTED');previous=t;
  if(row.quality==='ORIGINAL_MEASURED'&&typeof row.flux==='number'){
   if(Math.abs(finite(row.flux,'FLUX'))>1000000)fail('FLUX_PHYSICAL_RANGE_REVIEW');
   measured++;
  }else if(row.quality==='MISSING_OR_UNUSABLE'&&row.flux===null){missing++;}
  else fail('GAP_FILL_OR_UNVERIFIED_FLUX_REJECTED');
 }
 return {status:'RESEARCH_STAGING_ONLY',site_id:'JP-Hrt',gas:'CH4',
  observed_flux_samples:measured,missing_samples:missing,
  raw_file_claimed_sha256:x.local_file_sha256,
  sample_digest:sha(x.rows),time_window_complete:false,
  measurement_units_approved:false,publisher_original_bytes_authenticated:false,
  seasonal_integrated_kg_ch4:null,methodology_emission_reduction_tco2e:null,
  credits_issued:null};
}

/**
 * Research-only replay of an *unverified manually transcribed* published
 * inventory table. Pinned numeric cells prevent silent local drift but do NOT
 * independently validate the source PDF, scientific legitimacy or AG-005 use.
 */
export function preflightNid2026TohokuPrintedSubset(table, selection){
 if(!obj(table)||table.schema!=='naft-nid-2026-tohoku-2024-published-subset-1'||
  table.source_id!=='NID_JAPAN_2026'||table.table!=='5-45'||
  table.printed_factor_unit!=='kg-CH4-C/ha'||
  table.inventory_edition!=='2026'||table.inventory_factor_year!=='2024'||
  table.region!=='東北'||table.water_management_scope!=='WITHOUT_EXTENDED_MIDSEASON_DRAINAGE'||
  table.original_document_bytes_cryptographically_verified!==false||
  table.official_jcredit_method_use_verified!==false||
  table.source_pdf_sha256!==null||table.certified_credit_quantity!==null||
  table.provenance!=='OFFICIAL_PUBLISHED_TABLE_MANUALLY_TRANSCRIBED_AND_VISUALLY_CROSSCHECKED'||
  table.official_pdf_url!=='https://www.env.go.jp/content/000398403.pdf'||
  !Array.isArray(table.strata)||table.strata.length!==6)
  fail('NID_PRINTED_SUBSET_SOURCE_OR_AUTHORITY_INVALID');
 // Expected is an independent-code copy of the *local transcription*, not a
 // claim of independently verified printed original cells.
 const expected={
  'POOR_DRAINAGE|CONTINUOUS_FLOOD':['5-38',692,665,175],
  'POOR_DRAINAGE|INTERMITTENT_IRRIGATION':['5-38',665,638,153],
  'DAILY_DRAINAGE|CONTINUOUS_FLOOD':['5-39',513,492,119],
  'DAILY_DRAINAGE|INTERMITTENT_IRRIGATION':['5-39',365,349,71],
  'FOUR_HOUR_DRAINAGE|CONTINUOUS_FLOOD':['5-39',472,452,97],
  'FOUR_HOUR_DRAINAGE|INTERMITTENT_IRRIGATION':['5-40',330,316,59]
 };
 const seen=new Set();
 for(const row of table.strata){
  if(!obj(row)||Object.keys(row).sort().join(',')!=='compost,drainage,none,printed_page,straw,water_management')
   fail('NID_SUBSET_STRATUM_SCHEMA_INVALID');
  const key=row.drainage+'|'+row.water_management;
  const want=Object.hasOwn(expected,key)?expected[key]:null;
  if(!want||seen.has(key)||row.printed_page!==want[0]||
    row.straw!==want[1]||row.compost!==want[2]||row.none!==want[3])
   fail('NID_SUBSET_TRANSCRIPTION_MISMATCH');
  seen.add(key);
 }
 if(seen.size!==6)fail('NID_SUBSET_INCOMPLETE');
 if(!obj(selection)||selection.inventory_edition!=='2026'||
   selection.factor_year!=='2024'||selection.region!=='東北'||
   selection.intended_use!=='RESEARCH_REPLAY_ONLY'||
   !['straw','compost','none'].includes(selection.organic))
  fail('NID_SUBSET_SELECTION_INVALID');
 const match=table.strata.find(x=>x.drainage===selection.drainage&&x.water_management===selection.water_management);
 if(!match)fail('NID_SUBSET_STRATUM_UNSUPPORTED');
 return {
  status:'MANUALLY_TRANSCRIBED_INVENTORY_CANDIDATE_ONLY',
  source_table:'NID_2026_TABLE_5_45',source_locator_page:match.printed_page,
  source_pdf_bytes_verified:false,printed_unit:'kg-CH4-C/ha',
  time_basis:'NOT_INFERRED_FROM_PRINTED_UNIT',value:match[selection.organic],
  source_table_candidate_digest:sha(table),official_jcredit_factor_usable:false,
  certification_or_verified_reduction_tco2e:null
 };
}
