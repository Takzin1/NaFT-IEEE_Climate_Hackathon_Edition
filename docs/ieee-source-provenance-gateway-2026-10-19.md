# NaFT IEEE — Source Provenance Gateway v1 (2026-10-19)

**Offline, fail-closed research intake only.** This gates a proposed original dataset source separately from existing scientific arithmetic and Japan AG-005 regulatory review. It does **not** acquire raw publisher files, authenticate a registrant's file, generate valid carbon credits, connect AWS, or sign artifacts.

## Official specifications consulted

- JaLC publishes a publicly accessible DOI metadata REST API: https://japanlinkcenter.org/top/service/service_data.html . Use the service manual for current request parameters, limits, and terms.
- DataCite Public REST API: `GET https://api.datacite.org/dois/{doi}` (https://support.datacite.org/docs/api-get-doi); the **public** API retrieves registration metadata, not the primary observation CSV or a publisher signature.
- JapanFlux2024: https://doi.org/10.5194/essd-17-3807-2025 ; JP-Hrt DOI https://doi.org/10.17592/001.2024121020 . The real JP-Hrt observation file, sensor calibration, time-series column dictionary, QC codes, metadata version and site rights must be separately retrieved and checked before a site-specific parser can be implemented.
- J-Credit official methodology catalog: https://japancredit.go.jp/about/methodology/ . National inventory source factors or a dataset DOI do not establish AG-005 applicability to a particular project.
- S3 Object Lock requires Versioning and stores protections on **individual object versions**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html . No S3 bucket, Object Lock retention, object version ID, AWS permissions or evidence of WORM protection were configured by this PR.

## CLI

Inspect a pending dataset whose original bytes do not exist locally:

```bash
node scripts/ieee-source-provenance-gateway.mjs inspect \
 research/japan-primary-evidence-2026-10-18/japanflux-jp-hrt-intake-pending.json
```

Result: `BLOCKED_ORIGINAL_FILE_NOT_ACQUIRED`; publisher authentication, copyright/license review, accepted AG-005 and certified effects remain false/null. **No placeholder data** are used.

Validate a **local synthetic or operator-supplied unverified** file and separately obtained **DataCite metadata JSON snapshot** (optional):

```bash
node scripts/ieee-source-provenance-gateway.mjs inspect SOURCE-SPEC.json RAW.csv DATACITE.json \
  > /tmp/naft-source-preflight.json

node scripts/ieee-source-provenance-gateway.mjs verify SOURCE-SPEC.json RAW.csv \
  DATACITE.json /tmp/naft-source-preflight.json
```

The source-spec must be exactly `naft-ieee-source-intake-v1` with a DOI identity and data class `USER_SUPPLIED_UNVERIFIED`; or `SYNTHETIC` without a real DOI. `PRIMARY_DATASET_CANDIDATE` is necessarily `ORIGINAL_NOT_RETRIEVED` with `expected_raw_sha256:null` and cannot include bytes. The gateway checks exact source-spec bytes, local file checksum vs **declared** expected checksum, DOI and publisher fields against a DataCite JSON snapshot, declared source site/class/license, then recomputes and pins the full report.

**Never interpret `LOCAL_DATACITE_JSON_DOI_AND_PUBLISHER_MATCHED` as verified API delivery.** That snapshot is user-supplied and may be forged or stale. Likewise, a locally matched SHA-256 is a consistency check between two values an operator may control. The report always says:
- `publisher_api_response_authenticated:false`
- `original_dataset_bytes_independently_acquired:false`
- `source_license_legally_reviewed:false`
- `s3_object_lock_protected_version_confirmed:false`
- `ag005_formal_rulepack_eligibility:null`
- `certified_tco2e:null`

`linkSourceToDualReplay(intake,dual)` only provides a **local consistency link** if the raw bytes already equal a normalized CSV and the data class, site, source URI and CSV digest match the existing two-engine observation receipt. Genuine publisher raw data are not necessarily normalized CSV; they require a source-specific, independently reviewed adapter, and should **not** be passed to the scientific integrator by force.

## Installation phases

1. **Implemented now**: offline source manifest, explicit DOI/data-class flags, bounded UTF-8 DataCite snapshot, SHA consistency, fail-closed states, re-verifiable source intake receipt, pending real JP-Hrt registration, adversarial tests and optional link to prior two-engine research receipt.
2. **Not installed**: production JaLC/DataCite HTTP ingestion; independently verified publisher download with a trusted publisher checksum/signature; permanent S3 Object Lock storage (AWS billing/permissions and irreversible retention require explicit configuration); legal license review; genuine JapanFlux raw-to-normalized CH₄ parser; signed artifact attestations.
3. After authentic original publisher files arrive, verify authoritative server provenance, independent hashes, license, temporal semantics and QC dictionary. Keep `publisher_original_bytes_authenticated:false` until an independent trust path is proven and a separately reviewed implementation changes that gate.
4. Review **official AG-005 PDF bytes, version, applicability date, eligibility, field records and human verification** in a different module before any regulatory result can change from `null`.

## Verification

```bash
node tests/ieee-source-provenance-gateway.test.mjs
bash tests/run.sh
```

The tests use the repository's synthetic daily CH₄ CSV and **fabricated DataCite-shaped JSON solely for parser negative tests**. They do not import, reproduce, attribute or authorize any real field methane observations.
