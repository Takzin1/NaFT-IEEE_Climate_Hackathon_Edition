/** PH_AM004 research-only input boundary: reference pump CO2 optional, project pump CO2 mandatory. */
const block=(code)=>{throw Error(code)};
const num=(x,k)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<0)block('PH_INVALID_QUANTITY:'+k);return x};
const components=(m,side)=>{
 if(!m||typeof m!=='object'||Array.isArray(m))block('PH_COMPONENTS_INVALID:'+side);
 for(const k of Object.keys(m))if(!['CH4','N2O','PUMP_CO2'].includes(k))block('PH_EXTRA_GAS_COMPONENT:'+k);
 for(const k of ['CH4','N2O'])num(m[k],side+':'+k);
 if(side==='project')num(m.PUMP_CO2,'project:PUMP_CO2');
 return m;
};
export function phPrepareExplicitScope(x){
 if(!x||x.country!=='PH'||x.methodology_id!=='PH_AM004@1.0'||x.data_status!=='SYNTHETIC')
   block('PH_SCOPE_COUNTRY_METHOD_DATA_MISMATCH');
 const re=components(x.reference_tco2e,'reference'),pe=components(x.project_tco2e,'project');
 const omitted=!Object.prototype.hasOwnProperty.call(re,'PUMP_CO2');
 if(omitted&&x.reference_pump_policy!=='OMITTED_PER_PH_AM004_REFERENCE_OPTIONAL')
   block('PH_REFERENCE_PUMP_OMISSION_NOT_DECLARED');
 if(!omitted&&x.reference_pump_policy!=='REPORTED_EXPLICIT')
   block('PH_REFERENCE_PUMP_REPORTING_POLICY_MISSING');
 if(!omitted)num(re.PUMP_CO2,'reference:PUMP_CO2');
 if(!x.boundary||x.boundary.pump_boundary_recorded!==true||x.boundary.evidence_manifest_present!==true)
   block('PH_PUMP_SCOPE_EVIDENCE_REQUIRED');
 return {normalized_input:{...x,reference_tco2e:{CH4:re.CH4,N2O:re.N2O,PUMP_CO2:omitted?0:re.PUMP_CO2},
    project_tco2e:{CH4:pe.CH4,N2O:pe.N2O,PUMP_CO2:pe.PUMP_CO2}},
   reference_pump_optional_omitted:omitted,official_jcm_credits:null,
   note:'Optional reference pumping explicitly omitted; no actual pump source was verified'};
}
export function phSyntheticMassConversion(x){
 if(!x||x.method!=='PH_AM004@1.0'||x.data_status!=='SYNTHETIC'||
   x.ch4_mass_basis!=='kg_CH4'||x.n2o_mass_basis!=='kg_N2O_N'||x.pump_unit!=='tCO2')
   block('PH_GAS_MASS_UNIT_OR_METHOD_UNSUPPORTED');
 const ch4=num(x.ch4_kg,'ch4_kg'),n2on=num(x.n2o_n_kg,'n2o_n_kg'),pump=num(x.pump_tco2,'pump_tco2');
 // PH_AM004 Sec I: GWP CH4 28 and N2O 265, AR5.
 const ch4t=ch4*28/1000,n2ot=n2on*44/28*265/1000,total=ch4t+n2ot+pump;
 if(!Number.isFinite(total))block('PH_COMPONENT_OVERFLOW');
 return {status:'SYNTHETIC_RESEARCH_ONLY',ch4_tco2e:ch4t,n2o_tco2e:n2ot,pump_tco2:pump,
   total_tco2e:total,gwp_basis:'PH_AM004_v1.0_AR5_CH4_28_N2O_265',approved_credits:null};
}
