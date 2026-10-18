/** 2026 Japanese NID Chapter 5 table 5-45 published subset: source-bound and non-credit.
 * Verbatim published kg-CH4-C/ha numerical cells for Tohoku 2024 only.
 * Official national inventory != official J-Credit AG-005 adopted rule/coefficient.
 * Original publisher PDF SHA-256 is unknown; table manually visually transcribed.
 */
import {createHash} from 'node:crypto';
const stop=x=>{throw Error(x)};
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const pdf='https://www.env.go.jp/content/000398403.pdf';
const FROZEN=[
 ['POOR_DRAINAGE','CONTINUOUS_FLOOD','5-38',692,665,175],
 ['POOR_DRAINAGE','INTERMITTENT_IRRIGATION','5-38',665,638,153],
 ['DAILY_DRAINAGE','CONTINUOUS_FLOOD','5-39',513,492,119],
 ['DAILY_DRAINAGE','INTERMITTENT_IRRIGATION','5-39',365,349,71],
 ['FOUR_HOUR_DRAINAGE','CONTINUOUS_FLOOD','5-39',472,452,97],
 ['FOUR_HOUR_DRAINAGE','INTERMITTENT_IRRIGATION','5-40',330,316,59]
];
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function inspectNidPublishedTohoku2024(data){
 if(!obj(data)||data.schema!=='naft-nid-2026-tohoku-2024-published-subset-1'||
  data.source_id!=='NID_JAPAN_2026'||data.official_pdf_url!==pdf||
  data.table!=='5-45'||
  data.table_description!=='各区分の稲作からのCH4排出係数（中干し延長なし）'||
  data.printed_factor_unit!=='kg-CH4-C/ha'||
  data.inventory_edition!=='2026'||data.inventory_factor_year!=='2024'||
  data.region!=='東北'||data.water_management_scope!=='WITHOUT_EXTENDED_MIDSEASON_DRAINAGE'||
  data.source_pdf_sha256!==null||
  data.original_document_bytes_cryptographically_verified!==false||
  data.official_jcredit_method_use_verified!==false||
  data.certified_credit_quantity!==null||
  data.provenance!=='OFFICIAL_PUBLISHED_TABLE_MANUALLY_TRANSCRIBED_AND_VISUALLY_CROSSCHECKED')
  stop('NID_TABLE_OFFICIAL_CONTEXT_OR_VERSION_INVALID');
 if(!Array.isArray(data.strata)||data.strata.length!==6)
  stop('NID_TABLE_COVERAGE_INVALID');
 const found=new Map();
 for(const row of data.strata){
  if(!obj(row)||Object.keys(row).sort().join('|')!==
   'compost|drainage|none|printed_page|straw|water_management')
    stop('NID_TABLE_ROW_SCHEMA_INVALID');
  const key=row.drainage+':'+row.water_management;
  if(found.has(key))stop('NID_TABLE_DUPLICATE_STRATUM');
  found.set(key,row);
 }
 for(const [drainage,water,page,straw,compost,none] of FROZEN){
  const row=found.get(drainage+':'+water);
  if(!row)stop('NID_TABLE_MISSING_STRATUM');
  if(row.printed_page!==page||!Number.isSafeInteger(row.straw)||
   !Number.isSafeInteger(row.compost)||!Number.isSafeInteger(row.none)||
   row.straw!==straw||row.compost!==compost||row.none!==none)
   stop('NID_PUBLISHED_OFFICIAL_CELL_MISMATCH');
 }
 return {status:'PUBLISHED_NATIONAL_INVENTORY_REFERENCE_ONLY',
  published_source_url:pdf,published_table:'5-45',region:'東北',
  edition:'2026',inventory_factor_year:'2024',published_cells:18,
  printed_factor_unit:'kg-CH4-C/ha',
  excluded_midseason_extension:true,
  published_cells_visually_checked:true,
  source_pdf_bytes_cryptographically_authenticated:false,
  jcredit_ag005_authorization:false,official_project_tco2e:null,
  source_record_sha256:sha(data)};
}
export function selectNidPublishedTohoku2024(data,request){
 inspectNidPublishedTohoku2024(data);
 if(!obj(request)||Object.keys(request).sort().join('|')!==
  'drainage|factor_year|inventory_edition|organic|region|water_management'||
  request.inventory_edition!=='2026'||request.factor_year!=='2024'||
  request.region!=='東北')stop('NID_SELECTION_GEOGRAPHY_VERSION_MISMATCH');
 if(!['straw','compost','none'].includes(request.organic))
  stop('NID_SELECTION_ORGANIC_CLASS_INVALID');
 const row=data.strata.find(s=>s.drainage===request.drainage &&
     s.water_management===request.water_management);
 if(!row)stop('NID_SELECTION_STRATUM_UNSUPPORTED');
 return {status:'OFFICIAL_INVENTORY_PUBLISHED_VALUE_RESEARCH_ONLY',
  source_url:pdf,table:'5-45',page:row.printed_page,
  inventory_edition:'2026',factor_year:'2024',region:'東北',
  inventory_stratum:{drainage:row.drainage,water_management:row.water_management,
    organic:request.organic},
  published_kg_ch4_c_per_ha:row[request.organic],
  published_factor_unit:'kg-CH4-C/ha',
  source_pdf_hash_verified:false,jcredit_method_factor_approved:false,
  ag005_project_eligibility:null,certified_tco2e:null};
}
