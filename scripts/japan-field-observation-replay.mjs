#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
const path='data/japan-original-field-observation-aggregates.json';
const x=JSON.parse(fs.readFileSync(path,'utf8'));
vm.runInThisContext(fs.readFileSync('src/japan-field-study-replay.js','utf8'),{filename:'japan-field-study-replay.js'});
const accKeys=['site_id','calendar_year','crop_cycle','treatment_regime','measurement_start','measurement_end','soil_class','irrigation_schedule','organic_management','fertilizer_schedule','flux_measurement_method','climate_record_id','gas','mass_basis','plot_lineage'];
const accCtx=Object.fromEntries(accKeys.map(k=>[k,'SYNTH_'+k]));
accCtx.gas='CH4';accCtx.mass_basis='kg_CH4_per_ha_period';
const acc={data_status:'SYNTHETIC',observed:{area_ha:'2',rate_kg_ch4_ha:'100',context:accCtx},predicted:{area_ha:'1',rate_kg_ch4_ha:'90',context:{...accCtx}}};
const synthetic_area_rate_accounting=naftJpSyntheticAttribution(acc);
const result={synthetic_area_rate_accounting,source_status:'PUBLISHED_AGGREGATES_NOT_RAW_MEASUREMENTS',
 yagi:naftJpYagiReplay(x),nishimura:naftJpNishimuraReplay(x),
 actual_field_environment_reproduced:false,methodology_certified:false};
console.log(JSON.stringify(result,null,2));
