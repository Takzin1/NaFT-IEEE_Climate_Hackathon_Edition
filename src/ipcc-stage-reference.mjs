/** Research-only IPCC 2019 Table 5.14B/C rounding-stage replay (no official credits).
 * BigInt rational JS arithmetic independently checked by Python Decimal oracle.
 */
const PINNED={
 CF:['1500000','1.22','1.00','1.00','1.21','1.48','102','226.44'],
 MD:['1500000','1.22','0.55','1.00','1.21','0.81','102','123.93'],
 rainfed:['900000','1.22','0.54','0.89','1.00','0.59','102','54.16'],
 upland:['450000','1.22','0.00','0.89','1.00','0.00','102','0.00'],
 deepwater:['150000','1.22','0.06','2.41','1.00','0.18','220','5.94']};
const stop=(code)=>{throw Error(code)};
const gcd=(a,b)=>{while(b){const t=a%b;a=b;b=t}return a<0n?-a:a};
const rat=(n,d=1n)=>{if(d<=0n)stop('INVALID_RATIONAL');const g=gcd(n,d);return [n/g,d/g]};
const dec=(s)=>{
 if(typeof s!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d{1,16})?$/.test(s)||s.length>48)stop('INVALID_DECIMAL');
 const [i,f='']=s.split('.');return rat(BigInt(i+f),10n**BigInt(f.length));};
const mul=(a,b)=>rat(a[0]*b[0],a[1]*b[1]);
const add=(a,b)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const round=(a,places)=>{const scale=10n**BigInt(places);return rat((a[0]*scale*2n+a[1])/(2n*a[1]),scale)};
const fmt=(a,places)=>{const b=round(a,places),n=b[0]*10n**BigInt(places)/b[1];const s=n.toString().padStart(places+1,'0');return places?s.slice(0,-places)+'.'+s.slice(-places):s};
const eq=(a,b)=>a[0]*b[1]===b[0]*a[1];
export function ipccStageReplay(f){
 if(!f||f.schema!=='naft-ipcc-ph-independent-fixtures-1'||f.research_only!==true||
   f.ipcc?.policy!=='ROUND_ADJUSTED_EF_2DP_THEN_MULTIPLY'||
   f.sources?.IPCC_2019_5_14BC!=='https://www.ipcc-tfi.iges.or.jp/public/2019rf/pdf/4_Volume4/19R_V4_Ch05_Cropland.pdf')
   stop('IPCC_SOURCE_OR_SCHEMA_UNVERIFIED');
 const rows=f.ipcc.rows;if(!Array.isArray(rows)||rows.length!==5)stop('IPCC_REFERENCE_ROW_COUNT');
 const seen=new Set(),keys=['area_ha_year','efc','sfw','sfp','sfo','published_adjusted_ef','season_days','published_gg'];
 let sum=dec('0'),raw=dec('0');
 const row_results=rows.map(r=>{
   if(!r||typeof r.id!=='string'||seen.has(r.id))stop('IPCC_DUPLICATE_OR_MISSING_ID');
   seen.add(r.id);const expected=PINNED[r.id];
   if(!expected||keys.some((k,i)=>!eq(dec(r[k]),dec(expected[i]))))stop('IPCC_PUBLISHED_TABLE_MUTATION:'+r.id);
   const unrounded=['efc','sfw','sfp','sfo'].map(k=>dec(r[k])).reduce(mul,dec('1'));
   const adjusted=round(unrounded,2);
   if(!eq(adjusted,dec(r.published_adjusted_ef)))stop('IPCC_EF_ROUNDING_MISMATCH');
   const x=mul(dec(r.area_ha_year),rat(1n,1000000n)),days=dec(r.season_days);
   const out=mul(mul(x,adjusted),days),pre=mul(mul(x,unrounded),days);
   if(!eq(round(out,2),dec(r.published_gg)))stop('IPCC_ROW_PUBLISHED_TOTAL_MISMATCH');
   sum=add(sum,out);raw=add(raw,pre);
   return {id:r.id,adjusted_ef_2dp:fmt(adjusted,2),annual_gg_from_rounded_ef:fmt(out,9),
      annual_gg_no_ef_rounding:fmt(pre,9)};
 });
 const reported=fmt(sum,2);
 if(reported!==f.ipcc.published_total_gg)stop('IPCC_PUBLISHED_TOTAL_MISMATCH');
 return {status:'RESEARCH_ONLY',official_inventory_or_credit:null,method:'IPCC_2019_TIER1_TABLE_5_14BC',
  intermediate_rounding:'2 decimal EF prior to multiplying',row_results,
  rounded_stage_gg_ch4:fmt(sum,9),no_intermediate_rounding_gg_ch4:fmt(raw,9),
  rounding_stage_difference_gg_ch4:fmt(add(sum,rat(-raw[0],raw[1])),9),
  published_total_gg_ch4:reported,source_original_pdf_byte_hash_verified:false};
}
