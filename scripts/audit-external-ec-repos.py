#!/usr/bin/env python3
"""Offline audit for third-party EC research repo references, NOT an installer.

All pinned repo/license hashes were looked up using GitHub in the same research
session. This CI check does not verify external network availability in future
and must never be reported as an upstream run or a publisher attestation.
"""
import hashlib
import json
from pathlib import Path
import re
import sys

SOURCE_SHA256 = "17f2cc3951d7d853d0ffe269f55dca5d469e4d3f755b761a74a50b2fb0cd5218"
PAPER_DOI = "10.3402/tellusb.v64i0.19048"
UPSTREAM = {
    "BernardHeinesch/FreqCor": ("Apache-2.0", "P1"),
    "ternaustralia/OzFlux-footprint": ("BSD-3-Clause", "P1"),
    "icos-etc/FFP-utils": ("BSD-3-Clause", "P1"),
    "fluxnet/ONEFlux": ("UC-LBNL-custom-permissive (review actual LICENSE text before redistribution)", "P2"),
    "EarthyScience/REddyProc": ("GPL-2.0-or-later (DESCRIPTION: GPL >= 2)", "P2"),
    "ternaustralia/PyFluxPro": ("GPL-3.0", "P2"),
    "NEONScience/eddy4R": ("AGPL-3.0", "P3"),
}
# Recorded at retrieval time using GitHub commit and LICENSE/DESCRIPTION blob APIs.
# A valid-looking SHA is not evidence that a pinned reference is unchanged.
PINNED_UPSTREAM = {
    "BernardHeinesch/FreqCor": ("ac2eb2130562707c748673eb08261db65438e4cb", "dedd43878b4e92ad5a56de60651a0a825887d534", "main", "LICENSE"),
    "ternaustralia/OzFlux-footprint": ("fa4d9672e1534c4121ce07cde1863e15e195780a", "f6f4be2c1fe95e9884511d062051adee81c7b80a", "master", "LICENSE"),
    "icos-etc/FFP-utils": ("ea7ae149f8554d2eba15fb97cf162648f705d9f8", "fd675dbba1601034bd2b17439601e8f9ded9d64f", "main", "LICENSE"),
    "fluxnet/ONEFlux": ("ef24050b783f4c7538f8acf15b488b363cd26796", "807d2f65e017c9d7358239393e895089e8056d59", "main", "LICENSE"),
    "EarthyScience/REddyProc": ("ce598d94a0cbfa024fbb36e3b438b1bb9f27fe6a", "ee17d83bfe4bb30cb5dd067ca4c667a725db889a", "master", "DESCRIPTION"),
    "ternaustralia/PyFluxPro": ("147cc6873dde1656bba770f62efd0912aab4a4d5", "f288702d2fa16d3cdf0035b15a9fcbc552cd88e7", "main", "LICENSE"),
    "NEONScience/eddy4R": ("8936beb9a58a7466833074b2b98b076d4645bcb6", "dbbe3558157f5861bff35dcb37b328b679b0ccfd", "main", "LICENSE.txt"),
}

SHA40 = re.compile(r"[a-f0-9]{40}\Z")
SHA64 = re.compile(r"[a-f0-9]{64}\Z")


def require(condition, reason):
    if not condition:
        raise ValueError("EXTERNAL_EC_REPO_REGISTER_BLOCKED:" + reason)


def verify(ledger):
    require(isinstance(ledger, dict) and
            ledger.get("schema") == "naft-ieee-external-ec-repository-register-v1",
            "INVALID_SCHEMA")
    paper = ledger.get("paper", {})
    require(paper.get("doi") == PAPER_DOI and paper.get("published_year") == 2012
            and paper.get("original_pdf_sha256") == SOURCE_SHA256
            and paper.get("user_uploaded_filename") == "Tellus2013(1).pdf"
            and paper.get("pdf_license") == "CC BY-NC 3.0 Unported as stated on PDF page 1"
            and paper.get("pdf_is_committed") is False,
            "WRONG_TELLUS_PRIMARY_SOURCE")
    require("calculation-option uncertainty" in paper.get("scientific_scope", [])
            and "JP-Hrt 2013 CH4-specific QC acceptance"
            in paper.get("not_established", []),
            "METHANE_QC_SCOPE_MISREPRESENTED")
    policy = ledger.get("policy", {})
    for name in ("external_git_submodules_installed", "third_party_source_imported",
                 "github_forks_created", "dependency_versions_installed",
                 "automatic_ch4_gapfill_enabled", "automatic_qc_promotion_enabled"):
        require(policy.get(name) is False, "EXTERNAL_INSTALL_OR_QC_OVERCLAIM:" + name)
    require(policy.get("license_review_for_code_import_required") is True
            and policy.get("derived_certified_tco2e") is None,
            "UNSAFE_LEGAL_OR_CREDIT_CLAIM")

    repos = ledger.get("repositories", [])
    require(isinstance(repos, list) and len(repos) == len(UPSTREAM),
            "EXTERNAL_REPO_COUNT_CHANGED")
    require({r.get("repository") for r in repos} == set(UPSTREAM),
            "UNAPPROVED_OR_DUPLICATED_REPOSITORY")
    seen_sha = set()
    for entry in repos:
        name = entry["repository"]
        license_expected, prio_expected = UPSTREAM[name]
        require(entry.get("license") == license_expected
                and entry.get("priority") == prio_expected
                and entry.get("role") == "external_research_reference",
                "UPSTREAM_LICENSE_OR_ROLE_MISMATCH:" + name)
        require(SHA40.fullmatch(str(entry.get("reference_commit", ""))) is not None
                and SHA40.fullmatch(str(entry.get("license_blob_sha", ""))) is not None,
                "INVALID_UPSTREAM_GIT_SHA:" + name)
        require((entry.get("reference_commit"), entry.get("license_blob_sha"),
                 entry.get("reference_branch"), entry.get("license_file"))
                == PINNED_UPSTREAM[name],
                "UPSTREAM_PIN_CHANGED_REQUIRES_SOURCE_REVIEW:" + name)
        require(entry.get("reference_commit") not in seen_sha,
                "DUPLICATE_PINNED_UPSTREAM_SHA")
        seen_sha.add(entry["reference_commit"])
        require(re.fullmatch(r"[A-Za-z0-9._/-]+", str(entry.get("license_file", "")))
                and ".." not in entry.get("license_file", "").split("/")
                and entry.get("reference_branch") in ("main", "master")
                and entry.get("copy_code_approved") is False,
                "UNSAFE_THIRD_PARTY_LICENSE_OR_PATH:" + name)
        require(isinstance(entry.get("purpose"), str) and len(entry["purpose"]) >= 30
                and isinstance(entry.get("fit_to_jphrt"), str)
                and len(entry["fit_to_jphrt"]) >= 20,
                "MISSING_INPUT_SCOPE:" + name)

    # Do not mistake this consistency digest for a digital signature or a
    # real-time check of upstream GitHub branches.
    canonical = json.dumps(ledger, sort_keys=True, separators=(",", ":"),
                           ensure_ascii=True).encode("utf-8")
    return {
        "schema": "naft-external-ec-reference-audit-v1",
        "state": "OFFLINE_SOURCE_REFERENCES_PINNED_ONLY",
        "repository_count": len(repos),
        "reference_manifest_sha256": hashlib.sha256(canonical).hexdigest(),
        "source_pdf_sha256": paper["original_pdf_sha256"],
        "upstream_repository_contents_downloaded": False,
        "source_licenses_legally_cleared_for_embedding": False,
        "reproduction_executed_on_original_jphrt_raw_10hz": False,
        "ch4_qc_verified": False,
        "scientific_mass_flux_integrated": None,
        "certified_tco2e": None
    }


def main(argv):
    if len(argv) != 1:
        raise ValueError("USAGE: python3 scripts/audit-external-ec-repos.py "
                         "research/japanflux-jp-hrt-v200/external-eddy-covariance-repositories.json")
    data = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    print(json.dumps(verify(data), indent=2, sort_keys=True))


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
