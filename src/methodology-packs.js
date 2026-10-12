'use strict';
// Data only. UNKNOWN is an explicit absence of verified institutional requirements.
var VERSIONED_PACKS = [
  {
    methodology_id: 'AG-005', methodology_version: '3.1-reference', rule_pack_version: 'naft-ag005-compiler-1',
    effective_from: 'UNKNOWN', effective_to: 'UNKNOWN',
    source_url: 'https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000281460',
    source_hash: 'f861e4af40f3fa1fb3a0b54327cd7720f6e5028ae99455bf39274f97140a2050',
    source_checked_at: '2026-09-20', status: 'CONFIG_REQUIRED', provenance: 'public',
    scope: 'Public-comment reference; current adoption and applicability unconfirmed. Legacy readiness retained separately.',
    parameters: {minimum_extension_days: {value: 7, status: 'REFERENCE'}, minimum_baseline_years: {value: 2, status: 'REFERENCE'}, emission_factors: {value: 'UNKNOWN', status: 'CONFIG_REQUIRED'}},
    evidence_requirements: {production_record: {category: 'production_record', required: true, source_section: '1, pp.1-2'}, objective_start_end: {category: 'objective_start_end', required: true, source_section: '1, p.2'}},
    rules: {reference_extension: {op: 'gte', input: 'activity.extension_days', parameter: 'minimum_extension_days', source_section: '1, pp.1-2', status: 'REFERENCE'}},
    calculation_spec: {operation: 'UNSUPPORTED', result: null, reason: 'CONFIG_REQUIRED: coefficient applicability and complete rule translation'},
    exceptions: {land_reorganization: {input: 'activity.land_change', equals: true, disposition: 'UNSUPPORTED', source_section: '1, p.2'}},
    unsupported_conditions: {adoption: 'UNKNOWN', complete_translation: 'UNSUPPORTED', current_coefficients: 'CONFIG_REQUIRED'}
  },
  {
    methodology_id: 'AG-004', methodology_version: 'UNKNOWN', rule_pack_version: 'naft-ag004-placeholder-1',
    effective_from: 'UNKNOWN', effective_to: 'UNKNOWN', source_url: 'https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000298548',
    source_hash: 'UNKNOWN', source_checked_at: '2026-09-23', status: 'UNSUPPORTED', provenance: 'public',
    source_attempted_at: '2026-09-20', source_access: 'AG-004 Ver.2.4 source text located in e-Gov; original bytes/hash not pinned and Executable Pack translation not implemented',
    parameters: {institutional_parameters: {value: 'UNKNOWN', status: 'CONFIG_REQUIRED'}}, evidence_requirements: {}, rules: {},
    calculation_spec: {operation: 'UNSUPPORTED', result: null}, exceptions: {}, unsupported_conditions: {official_requirements: 'UNKNOWN'}
  },
  {
    methodology_id: 'NAFT-SYNTHETIC', methodology_version: '1', rule_pack_version: 'synthetic-rules-1',
    effective_from: '2026-01-01', effective_to: '2026-12-31', source_url: 'urn:naft:synthetic:protocol:1',
    source_hash: 'SYNTHETIC', source_checked_at: '2026-09-20', status: 'SYNTHETIC', provenance: 'synthetic',
    scope: 'Engineering experiment only. No institutional requirements, real farmer data or certified reductions.',
    parameters: {minimum_days: {value: 7, status: 'SYNTHETIC'}, factor: {value: 2, status: 'SYNTHETIC'}, unused: {value: 1, status: 'SYNTHETIC'}},
    evidence_requirements: {record: {category: 'record', required: true}, photo: {category: 'photo', required: true, when: {path: 'activity.stratum', equals: 'intensive'}}},
    rules: {duration: {op: 'gte', input: 'activity.days', parameter: 'minimum_days'}, area: {op: 'gt', input: 'field.area_ha', value: 0}},
    calculation_spec: {operation: 'multiply', inputs: ['field.area_ha', 'activity.days'], parameters: ['factor'], unit: 'synthetic-index'},
    exceptions: {expert: {input: 'activity.expert_case', equals: true, disposition: 'HUMAN_REVIEW_REQUIRED'}},
    unsupported_conditions: {special_process: {input: 'activity.special_process', equals: true}}
  },
  {
    methodology_id: 'NAFT-SYNTHETIC', methodology_version: '2', rule_pack_version: 'synthetic-rules-2',
    effective_from: '2026-01-01', effective_to: '2026-12-31', source_url: 'urn:naft:synthetic:protocol:2',
    source_hash: 'SYNTHETIC', source_checked_at: '2026-09-20', status: 'SYNTHETIC', provenance: 'synthetic',
    scope: 'Engineered version transition, not an AG-005 revision.',
    parameters: {minimum_days: {value: 7, status: 'SYNTHETIC'}, factor: {value: 2, status: 'SYNTHETIC'}, intensive_min_days: {value: 9, status: 'SYNTHETIC'}, unused: {value: 1, status: 'SYNTHETIC'}},
    evidence_requirements: {record: {category: 'record', required: true}, photo: {category: 'photo', required: true, when: {path: 'activity.stratum', equals: 'intensive'}}, sensor: {category: 'sensor', required: true, when: {path: 'activity.stratum', equals: 'intensive'}}},
    rules: {duration: {op: 'gte', input: 'activity.days', parameter: 'minimum_days'}, area: {op: 'gt', input: 'field.area_ha', value: 0}, extended: {op: 'gte', input: 'activity.days', parameter: 'intensive_min_days', when: {path: 'activity.stratum', equals: 'intensive'}}},
    calculation_spec: {operation: 'multiply', inputs: ['field.area_ha', 'activity.days'], parameters: ['factor'], unit: 'synthetic-index'},
    exceptions: {expert: {input: 'activity.expert_case', equals: true, disposition: 'HUMAN_REVIEW_REQUIRED'}, sensitive: {input: 'activity.sensitive', equals: true, when: {path: 'activity.sensitive', equals: true}, disposition: 'HUMAN_REVIEW_REQUIRED'}},
    unsupported_conditions: {special_process: {input: 'activity.special_process', equals: true}}
  }
];

// Synthetic source is this declared protocol, not an official publication.
VERSIONED_PACKS.filter(function(p) { return p.provenance==='synthetic'; }).forEach(function(p) {
  p.source_hash_scope='canonical_pack_without_source_hash';delete p.source_hash;p.source_hash=hashObject(p);
});
