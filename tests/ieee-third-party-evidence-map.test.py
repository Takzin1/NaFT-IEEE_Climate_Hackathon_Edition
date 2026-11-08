#!/usr/bin/env python3
"""Offline source-backed and tampering tests for third-party candidate links."""
import copy
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parent.parent
PATH=ROOT/"scripts/ieee-third-party-evidence-map.py"
spec=importlib.util.spec_from_file_location("independent_evidence_map",PATH)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class TestIndependentEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry=m.load_json(m.REGISTRY)
        cls.readiness=m.load_readiness()

    def make(self,reg=None,rd=None):
        return m.make_map(self.registry if reg is None else reg,
                          self.readiness if rd is None else rd)

    def test_original_source_is_linked_to_only_unapproved_external_candidates(self):
        result=self.make()
        self.assertEqual(result,self.make())
        self.assertEqual(result["third_party_references_count"],9)
        self.assertEqual(result["source_primary_evidence_gaps"],9)
        self.assertEqual(result["external_dataset_files_downloaded"],3)
        self.assertEqual(result["distinct_external_source_origins_with_raw_data"],2)
        self.assertEqual(result["Harvard_analyzer_sha256"],m.HARVARD_RAW_SHA)
        self.assertEqual(result["Harvard_event_key_sha256"],m.HARVARD_KEY_SHA)
        self.assertEqual(result["third_party_algorithms_executed"],0)
        self.assertEqual(result["independent_human_reviewer_signoffs"],0)
        self.assertEqual(result["status"],
                         "TWO_THIRD_PARTY_RAW_SUBSETS_IMPORTED_REPLAY_AND_QC_ASSESSED_SEPARATELY")
        self.assertEqual(result["source_file_sha256"]["ch4.zip"],m.GIMJE_HASH)
        self.assertIs(result["strict_boundaries"]["independent_field_level_validation"],False)
        self.assertIs(result["strict_boundaries"]["cross_ec_chamber_value_equivalence"],False)
        self.assertIsNone(result["strict_boundaries"]["certified_tco2e"])
        self.assertTrue(all(claim["independently_validated"] is False
                            for claim in result["independent_claims"]))
        acquired=[x["id"] for x in result["external_references"] if x["source_acquired"]]
        self.assertEqual(acquired,["GASFLUXES_CRAN_2026","HARVARD_FOREST_CHAMBER_FLUX"])
        self.assertEqual(result["imported_subset_records"],20)
        self.assertEqual(result["imported_subset_sha256"],m.GASFLUXES_SAMPLE_SHA)
        for ref in result["external_references"]:
            self.assertTrue(ref["primary_url"].startswith("https://"))
            if ref["github_repo"]:
                self.assertEqual(len(ref["pinned_commit"]),40)
        self.assertNotIn("independent_verification_passed",json.dumps(result))

    def test_external_software_commit_and_method_pin_cannot_disappear(self):
        corrupted=copy.deepcopy(self.registry)
        for entry in corrupted["sources"]:
            if entry["id"]=="GASFLUXES_CRAN_2026":
                entry["pinned_commit"]="HEAD"
        with self.assertRaisesRegex(ValueError,"UNPINNED_EXTERNAL_CODE"):
            self.make(corrupted)

    def test_duplicate_missing_references_and_forged_approval_fail_closed(self):
        for modifier,reason in (
          (lambda x:x["sources"].append(copy.deepcopy(x["sources"][0])),"SOURCE_COUNT_MISMATCH"),
          (lambda x:x["sources"][0].update({"analysis_reproduced":True}),"FORGED_EXTERNAL_VALIDATION_STATUS"),
          (lambda x:x["sources"][0].update({"source_data_download_sha256":"1"*64}),"FORGED_EXTERNAL_VALIDATION_STATUS"),
          (lambda x:x["sources"][0].update({"reviewed_by_independent_human":True}),"FORGED_EXTERNAL_VALIDATION_STATUS"),
          (lambda x:x["rules"].update({"ec_and_chamber_not_directly_identical":False}),"INDEPENDENCE_BOUNDARY_DISABLED"),
          (lambda x:x["scientific_readiness"].update({"certified_tco2e":42}),"FORGED_THIRD_PARTY_CERTIFICATION"),
          (lambda x:x["claim_connections"][0].update({"claim_status":"INDEPENDENTLY_VALIDATED"}),"INVALID_CLAIM_OR_EVIDENCE_STATE"),
        ):
            case=copy.deepcopy(self.registry)
            modifier(case)
            with self.assertRaisesRegex(ValueError,reason):
                self.make(case)

    def test_third_party_fixture_import_fingerprint_cannot_be_forged(self):
        forged=copy.deepcopy(self.registry)
        imported=next(x for x in forged["sources"] if x["id"]=="GASFLUXES_CRAN_2026")
        imported["source_data_download_sha256"]="0"*64
        with self.assertRaisesRegex(ValueError,"GASFLUXES_PINNED_SUBSET_IMPORT_INVALID"):
            self.make(forged)
        forged=copy.deepcopy(self.registry)
        other=next(x for x in forged["sources"] if x["id"]=="HARVARD_FOREST_CHAMBER_FLUX")
        other["source_data_download_sha256"]="0"*64
        with self.assertRaisesRegex(ValueError,"HARVARD_RAW_SOURCE_IMPORT_INVALID"):
            self.make(forged)
        forged=copy.deepcopy(self.registry)
        pending=next(x for x in forged["sources"] if x["id"]=="FLUXNET_SHUTTLE")
        pending["external_bytes_imported"]=True
        with self.assertRaisesRegex(ValueError,"FORGED_EXTERNAL_VALIDATION_STATUS"):
            self.make(forged)

    def test_tower_data_are_not_substituted_for_chamber_raw_flux(self):
        fake=copy.deepcopy(self.registry)
        fake["claim_connections"][1]["source_ids"].append("FLUXNET_CH4_JP_MSE")
        with self.assertRaisesRegex(ValueError,"CROSS_METHOD_EQUIVALENCE_FORGED"):
            self.make(fake)
        altered=copy.deepcopy(self.registry)
        for source in altered["sources"]:
            if source["site_id"]=="JP-Mse":
                source["method"]="STATIC_CHAMBER"
        with self.assertRaisesRegex(ValueError,"FLUXNET_SITE_CONTEXT_INVALID"):
            self.make(altered)

    def test_source_readiness_cannot_claim_QC_or_integration(self):
        forgery=copy.deepcopy(self.readiness)
        forgery["scientific_release_decision"]["time_weighted_seasonal_replay_eligible"]=True
        with self.assertRaisesRegex(ValueError,"GIMJE_SOURCE_READINESS_NOT_SAFE"):
            self.make(rd=forgery)
        forgery=copy.deepcopy(self.readiness)
        forgery["required_evidence"][0]["current_state"]="APPROVED"
        with self.assertRaisesRegex(ValueError,"PRIMARY_EVIDENCE_HAS_UNVERIFIED_TRANSITION"):
            self.make(rd=forgery)
        forgery=copy.deepcopy(self.readiness)
        forgery["original_file_sha256"]["ch4.zip"]="0"*64
        with self.assertRaisesRegex(ValueError,"GIMJE_SOURCE_READINESS_NOT_SAFE"):
            self.make(rd=forgery)

    def test_malformed_registry_or_site_policy_blocked(self):
        case=copy.deepcopy(self.registry)
        case["sources"][0]["primary_url"]="http://evil.invalid"
        with self.assertRaisesRegex(ValueError,"SOURCE_URL_INVALID"):
            self.make(case)
        case=copy.deepcopy(self.registry)
        for s in case["sources"]:
            if s["site_id"]=="KR-CRK":
                s["source_data_license"]="UNKNOWN"
        with self.assertRaisesRegex(ValueError,"FLUXNET_SITE_CONTEXT_INVALID"):
            self.make(case)

    def test_mutated_originals_block_upstream_before_linked_map(self):
        with tempfile.TemporaryDirectory() as temp:
            root=pathlib.Path(temp)
            directory=ROOT/"research/ieee-observation-datasets-2026-10-19/originals/KR_GIMJE_DAILY_2022_2024"
            for name in ("ch4.zip","input_fields_meta.xlsx","acquisition-receipt.json"):
                (root/name).write_bytes((directory/name).read_bytes())
            spec=importlib.util.spec_from_file_location("ready_tamper",m.READINESS_SCRIPT)
            readiness=importlib.util.module_from_spec(spec)
            spec.loader.exec_module(readiness)
            self.assertEqual(readiness.create_report(root)["overall_numeric_token_availability"]["fields"],60)
            zip_path=root/"ch4.zip"
            zip_path.write_bytes(zip_path.read_bytes()+b"TAMPER")
            with self.assertRaisesRegex(ValueError,"ORIGINAL_FILE_"):
                readiness.create_report(root)


if __name__=="__main__":
    unittest.main()
