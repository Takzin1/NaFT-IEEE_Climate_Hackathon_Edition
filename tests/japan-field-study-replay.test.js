'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const fixture=JSON.parse(fs.readFileSync('data/japan-original-field-observation-aggregates.json','utf8'));
const script=fs.readFileSync('src/japan-field-study-replay.js','utf8');
const box={BigInt,Error,Array,Object,Set,RegExp};vm.createContext(box);vm.runInContext(script,box);
let count=0;
const yes=(x,message)=>{assert.ok(x,message);count++};
const bad=(fn,error)=>{assert.throws(fn,new RegExp(error));count++};
const clone=()=>JSON.parse(JSON.stringify(fixture));
const y=box.naftJpYagiReplay(fixture);
yes(y.results.length===2&&y.official_jcredit_credits===null);
yes(y.results[0].within_year_contrast_g_ch4_m2==='6.17');
yes(y.results[0].within_year_contrast_kg_ch4_ha==='61.7');
yes(y.results[0].relative_contrast_percent==='41.689189');
yes(y.results[1].within_year_contrast_g_ch4_m2==='4.31');
yes(y.results[1].within_year_contrast_kg_ch4_ha==='43.1');
yes(y.results[1].relative_contrast_percent==='45.416228');
yes(y.results[0].environment_attribution_percent===null&&!y.results[0].measured_daily_flux_recreated);
const n=box.naftJpNishimuraReplay(fixture);
yes(n.results[0].independently_summed_mg_m2==='3129');
yes(n.results[0].reported_minus_summed_mg_m2==='-1');
yes(n.results[0].rounding_bound_mg_m2==='1.5');
yes(n.results[0].reported_annual_kg_basis_ha==='31.28');
yes(n.results[1].independently_summed_mg_m2==='60.3');
yes(n.results[1].reported_minus_summed_mg_m2==='-0.1');
yes(n.results[1].rounding_bound_mg_m2==='0.15');
yes(n.results[1].reported_annual_kg_basis_ha==='0.602');
yes(n.results[1].reported_annual_kg_n2o_ha==='0.946');
yes(n.results[1].certified_tco2e===null);
const model={study:'YAGI_1996',year:1991,site_id:'YAGI_EXPERIMENTAL_JAPAN_FIELD',
 crop_cycle:'REPORTED_CROPPING_SEASON',water_regime:'CONTINUOUS_FLOOD',
 mass_basis:'g_CH4_m2',predicted_g_ch4_m2:'15.1',
 environment_validation:'NOT_INDEPENDENTLY_MATCHED',attributed_components:[]};
const m=box.naftJpModelResidual(fixture,model);
yes(m.model_minus_observed_g_ch4_m2==='0.3'&&m.unallocated_difference_g_ch4_m2==='0.3');
yes(m.quantitative_causal_decomposition_allowed===false&&m.environment_component===null);
bad(()=>box.naftJpModelResidual(fixture,{...model,year:2024}),/MODEL_CONTEXT/);
bad(()=>box.naftJpModelResidual(fixture,{...model,site_id:'ANOTHER_SITE'}),/MODEL_CONTEXT/);
bad(()=>box.naftJpModelResidual(fixture,{...model,environment_validation:'MATCHED'}),/MODEL_ENVIRONMENT_MATCH/);
bad(()=>box.naftJpModelResidual(fixture,{...model,attributed_components:[{cause:'climate',value:0.2}]}),/MODEL_CONTEXT/);
bad(()=>box.naftJpModelResidual(fixture,{...model,mass_basis:'kg_CH4_C'}),/MODEL_CONTEXT/);
const badY=clone();badY.studies[0].contrasts[0].baseline_g_ch4_m2='14.9';
bad(()=>box.naftJpYagiReplay(badY),/YAGI_PUBLISHED_OBSERVATION_MUTATED/);
const badYear=clone();badYear.studies[0].contrasts[1].year=1991;
bad(()=>box.naftJpYagiReplay(badYear),/YAGI_PAIRED_YEAR_OR_TREATMENT/);
const badRegime=clone();badRegime.studies[0].contrasts[0].alternative_regime='CF';
bad(()=>box.naftJpYagiReplay(badRegime),/YAGI_PAIRED_YEAR_OR_TREATMENT/);
const badAnnual=clone();badAnnual.studies[1].cumulative[0].annual='3139';
bad(()=>box.naftJpNishimuraReplay(badAnnual),/NISHIMURA_PUBLISHED_MEAN_MUTATED/);
const badN2o=clone();badN2o.studies[1].cumulative[1].mass_basis='mg_N2O_m2';
bad(()=>box.naftJpNishimuraReplay(badN2o),/NISHIMURA_PUBLISHED_MEAN_MUTATED/);
const badSource=clone();badSource.studies[0].doi='wrong';
bad(()=>box.naftJpYagiReplay(badSource),/OBS_SOURCE_ID_OR_DOI_MISMATCH/);
yes(fixture.future_source.original_bytes_downloaded===false&&fixture.future_source.license==='NOT_CONFIRMED');
// IEEE migration deliberately excludes the Japanese Gikuten browser/fixture. 
// Published source JSON and deterministic replay are tested independently.
yes(fixture.legal_status==='RESEARCH_AGGREGATE_ONLY_NOT_J_CREDIT');
yes(fixture.published_reported_aggregates_not_raw_measurements===true);

const accKeys=['site_id','calendar_year','crop_cycle','treatment_regime','measurement_start','measurement_end','soil_class','irrigation_schedule','organic_management','fertilizer_schedule','flux_measurement_method','climate_record_id','gas','mass_basis','plot_lineage'];
const accCtx=Object.fromEntries(accKeys.map(k=>[k,'SYNTH_'+k]));
accCtx.gas='CH4';accCtx.mass_basis='kg_CH4_per_ha_period';
const acc={data_status:'SYNTHETIC',observed:{area_ha:'2',rate_kg_ch4_ha:'100',context:accCtx},predicted:{area_ha:'1',rate_kg_ch4_ha:'90',context:{...accCtx}}};
const split=box.naftJpSyntheticAttribution(acc);
yes(split.status==='SYNTHETIC_ACCOUNTING_NOT_CAUSAL');
yes(split.total_difference_kg_ch4==='110');
yes(split.area_contribution_kg_ch4==='95');
yes(split.rate_contribution_kg_ch4==='15');
yes(split.causal_attribution===null&&split.field_environment_recreated===false);
const denied=box.naftJpSyntheticAttribution({...acc,data_status:'PRIMARY_MEASUREMENT'});
yes(denied.status==='BLOCKED_PRIMARY_ENVIRONMENT_UNVERIFIED'&&denied.total_difference_kg_ch4===undefined);
const mismatch=box.naftJpSyntheticAttribution({...acc,predicted:{...acc.predicted,context:{...accCtx,calendar_year:'1993'}}});
yes(mismatch.status==='BLOCKED_CONTEXT_MISMATCH'&&mismatch.mismatched_context.includes('calendar_year'));
const missing=box.naftJpSyntheticAttribution({...acc,observed:{...acc.observed,context:{...accCtx,soil_class:'UNKNOWN'}}});
yes(missing.status==='BLOCKED_CONTEXT_MISMATCH'&&missing.missing_context.includes('soil_class'));
bad(()=>box.naftJpSyntheticAttribution({...acc,predicted:{...acc.predicted,rate_kg_ch4_ha:'nan'}}),/OBS_INVALID_DECIMAL/);
bad(()=>box.naftJpSyntheticAttribution({...acc,predicted:{...acc.predicted,area_ha:'0'}}),/ACCOUNTING_NONPOSITIVE_AREA/);

console.log('JP_ORIGINAL_FIELD_REPLAY_PASS: '+count+' research-only checks');
