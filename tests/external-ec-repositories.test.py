#!/usr/bin/env python3
"""No-network provenance/license anti-overclaim tests for EC repository registry."""
import copy
from importlib.util import spec_from_file_location, module_from_spec
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
module_path=ROOT/"scripts/audit-external-ec-repos.py"
spec=spec_from_file_location("external_ec_audit",module_path)
module=module_from_spec(spec)
spec.loader.exec_module(module)
source=ROOT/"research/japanflux-jp-hrt-v200/external-eddy-covariance-repositories.json"
ledger=json.loads(source.read_text(encoding="utf-8"))
count=0


def check(x):
    global count
    assert x
    count+=1


def denied(op,tag):
    global count
    try:
        op()
    except ValueError as error:
        assert tag in str(error),(tag,str(error))
    else:
        raise AssertionError("Expected rejection "+tag)
    count+=1


def modified(path,value):
    fake=copy.deepcopy(ledger)
    target=fake
    for key in path[:-1]:
        target=target[key]
    target[path[-1]]=value
    return fake


state=module.verify(ledger)
check(state["repository_count"]==7)
check(state["state"]=="OFFLINE_SOURCE_REFERENCES_PINNED_ONLY")
check(state["source_pdf_sha256"]=="17f2cc3951d7d853d0ffe269f55dca5d469e4d3f755b761a74a50b2fb0cd5218")
check(len(state["reference_manifest_sha256"])==64)
check(state["upstream_repository_contents_downloaded"] is False)
check(state["source_licenses_legally_cleared_for_embedding"] is False)
check(state["reproduction_executed_on_original_jphrt_raw_10hz"] is False)
check(state["ch4_qc_verified"] is False)
check(state["certified_tco2e"] is None)
check(module.verify(ledger)==state)
check(len({entry["repository"] for entry in ledger["repositories"]})==7)
check(ledger["paper"]["published_year"]==2012)
check(ledger["policy"]["third_party_source_imported"] is False)
check(ledger["policy"]["external_git_submodules_installed"] is False)
check(ledger["policy"]["github_forks_created"] is False)
check(ledger["policy"]["automatic_ch4_gapfill_enabled"] is False)
check(ledger["policy"]["automatic_qc_promotion_enabled"] is False)
denied(lambda:module.verify(modified(["paper","published_year"],2013)),
       "WRONG_TELLUS_PRIMARY_SOURCE")
denied(lambda:module.verify(modified(["paper","doi"],"10.0000/invented")),
       "WRONG_TELLUS_PRIMARY_SOURCE")
denied(lambda:module.verify(modified(["paper","original_pdf_sha256"],"f"*64)),
       "WRONG_TELLUS_PRIMARY_SOURCE")
denied(lambda:module.verify(modified(["paper","pdf_is_committed"],True)),
       "WRONG_TELLUS_PRIMARY_SOURCE")
denied(lambda:module.verify(modified(["policy","github_forks_created"],True)),
       "EXTERNAL_INSTALL_OR_QC_OVERCLAIM")
denied(lambda:module.verify(modified(["policy","automatic_qc_promotion_enabled"],True)),
       "EXTERNAL_INSTALL_OR_QC_OVERCLAIM")
denied(lambda:module.verify(modified(["policy","automatic_ch4_gapfill_enabled"],True)),
       "EXTERNAL_INSTALL_OR_QC_OVERCLAIM")
denied(lambda:module.verify(modified(["policy","third_party_source_imported"],True)),
       "EXTERNAL_INSTALL_OR_QC_OVERCLAIM")
denied(lambda:module.verify(modified(["policy","derived_certified_tco2e"],100)),
       "UNSAFE_LEGAL_OR_CREDIT_CLAIM")
denied(lambda:module.verify(modified(["policy","license_review_for_code_import_required"],False)),
       "UNSAFE_LEGAL_OR_CREDIT_CLAIM")
fake=copy.deepcopy(ledger);fake["repositories"].pop()
denied(lambda:module.verify(fake),"EXTERNAL_REPO_COUNT_CHANGED")
fake=copy.deepcopy(ledger);fake["repositories"][0]["repository"]="untrusted/newname"
denied(lambda:module.verify(fake),"UNAPPROVED_OR_DUPLICATED_REPOSITORY")
fake=copy.deepcopy(ledger);fake["repositories"][0]["reference_commit"]="not-a-real-sha"
denied(lambda:module.verify(fake),"INVALID_UPSTREAM_GIT_SHA")
fake=copy.deepcopy(ledger);fake["repositories"][0]["license_blob_sha"]="0"
denied(lambda:module.verify(fake),"INVALID_UPSTREAM_GIT_SHA")
fake=copy.deepcopy(ledger);fake["repositories"][0]["copy_code_approved"]=True
denied(lambda:module.verify(fake),"UNSAFE_THIRD_PARTY_LICENSE_OR_PATH")
fake=copy.deepcopy(ledger);fake["repositories"][0]["license"]="MIT"
denied(lambda:module.verify(fake),"UPSTREAM_LICENSE_OR_ROLE_MISMATCH")
fake=copy.deepcopy(ledger);fake["repositories"][3]["license"]="MIT"
denied(lambda:module.verify(fake),"UPSTREAM_LICENSE_OR_ROLE_MISMATCH")
fake=copy.deepcopy(ledger);fake["repositories"][6]["license"]="MIT"
denied(lambda:module.verify(fake),"UPSTREAM_LICENSE_OR_ROLE_MISMATCH")
fake=copy.deepcopy(ledger);fake["repositories"][0]["license_file"]="../LICENSE"
denied(lambda:module.verify(fake),"UNSAFE_THIRD_PARTY_LICENSE_OR_PATH")
fake=copy.deepcopy(ledger);fake["repositories"][0]["role"]="installed_dependency"
denied(lambda:module.verify(fake),"UPSTREAM_LICENSE_OR_ROLE_MISMATCH")
check(all(x["copy_code_approved"] is False for x in ledger["repositories"]))
check(all(x["role"]=="external_research_reference" for x in ledger["repositories"]))
check(sum(x["priority"]=="P1" for x in ledger["repositories"])==3)
check(sum(x["priority"]=="P2" for x in ledger["repositories"])==3)
check(sum(x["priority"]=="P3" for x in ledger["repositories"])==1)
print("IEEE_EXTERNAL_EC_REPOSITORY_REGISTER_PASS:",count,"checks; 7 pinned references, no 3rd-party source copied")
