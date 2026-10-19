# NaFT IEEE – original research datasets (2026-10-19)

This folder separates **original public research observations** from NaFT's
frozen synthetic ClimateChain demonstration and from all formal MRV/credits.

## Successfully acquired on the research branch: Gimje, Korea

Original depositor: **Hyoung Seok Lee**, Rural Development Administration.
Dataset: *Daily methane (CH₄) emission measurements from paddy fields in
Gimje, Korea (2022–2024)*.
Permanent DOI: https://doi.org/10.5281/zenodo.17111992
Record: https://zenodo.org/records/17111992

Zenodo's record API explicitly declared **Creative Commons Attribution 4.0
International (CC BY 4.0)** when the importer ran. Under that license, the
original `ch4.zip` and `input_fields_meta.xlsx` files were committed *without
modification*, with explicit attribution and per-file MD5 and SHA-256 checks.
The rights belong to their original creators, **not** to NaFT: this repository's
software LICENSE does not replace the dataset's CC BY obligations.
License URL: https://creativecommons.org/licenses/by/4.0/

Exact original checksums are pinned in `intake-catalog.json` and the captured
`originals/KR_GIMJE_DAILY_2022_2024/acquisition-receipt.json`.
To recheck original Git bytes **offline**:

```sh
python3 scripts/ieee-research-original-acquire.py verify-local \
  KR_GIMJE_DAILY_2022_2024 \
  --destination research/ieee-observation-datasets-2026-10-19/originals/KR_GIMJE_DAILY_2022_2024
```

The previous original-file verification run had already observed approximately
60 CSV members inside `ch4.zip`, with reported source headers:
`DAT,tavg,course_type,ch4_flux,rain_mm`. **There is no approved DAT→date
mapping, field-join mapping, QC classification, interval coverage or calibrated
methane validation yet.** No observed emissions were automatically ingested
into the J-Credit or production compiler, and `certified_tco2e` stays null.
Downloaded file hash matching proves reproducibility of the *bytes only*;
it does not prove sensors, methodology or publisher digital signatures.

## Not yet redistributed

- **China Eastern China eddy covariance**: DOI
  https://doi.org/10.5281/zenodo.8067998; `Supporting information data2.csv`
  has a prior SHA-256/MD5 lock, but the live Zenodo API did **not** return an
  unambiguous redistribution license. The importer refused to commit it.
  Keep the source metadata entry and request license confirmation before retry.
  The 13.3 MB hourly original is intentionally out of scope until that review.
- **Japan JP-Mse, FLUXNET-CH₄**: DOI
  https://doi.org/10.18140/FLX/1669647. The site describes CC BY 4.0, but
  obtain its actual files using the official FLUXNET Shuttle/download process:
  https://fluxnet.org/download-data/. Do not skip registration/intended-use
  requirements or treat FLUXNET's gap-filled `_F` series as unmodified raw
  observations. This catalog holds metadata only, no invented file hash.

## Import command (explicit, research only)

```sh
python3 scripts/ieee-research-original-acquire.py acquire \
  KR_GIMJE_DAILY_2022_2024 \
  --destination /tmp/research-gimje-originals
```

The importer uses only the official Zenodo record's metadata and file endpoints,
a strict allowlist of redistributable licenses, the publisher's MD5 values and
NaFT's previously captured original SHA-256. It rejects ambiguous/missing
licenses, edited bytes, wrong record DOI, oversized files and path traversal.
It never parses the original data as valid science, makes an API call during
normal compilation, runs a remote shell script, or accesses wallet/chain keys.
The source-acquisition workflow is restricted to its explicit research feature
branch. Real observation processing needs separate reviewed adapters and QC.

**Citation**: Lee, Hyoung Seok. (2025). *Daily methane (CH₄) emission
measurements from paddy fields in Gimje, Korea (2022–2024)*. Zenodo.
https://doi.org/10.5281/zenodo.17111992
