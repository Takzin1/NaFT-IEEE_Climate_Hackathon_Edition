# CarbonCredit.csv — independent link and source audit (25 October 2026)

Original CSV: 32 rows in three groups (13 Japanese/geospatial, 13 registry/risk, 6 on-chain/documentation); 31 unique resource URLs after duplicate 3-06 → 2-01. Uploaded CSV SHA-256: `1a921b2c5037fd7cd603b33d9e28698278b4f7600d269a88d4e9f640cc19cfe0`.

**[Machine-readable row-by-row audit](../research/carboncredit-link-audit-2026-10-25/source-audit.json)** includes every CSV source, URL, the original asserted HTTP response and license, independently observed availability class, original publisher/documentation link, caveat and ingestion gate.

## What was—and was not—verified

- Each of 32 rows was reviewed and the unique URLs checked individually using the public web or source-provider documentation. **A reachable landing page is not a verified dataset.**
- No large/raw archives, downloads, per-row contents, numerical calculations, emitted carbon credits, source-file SHA-256 comparisons, or regulatory compliance checks were performed. Claimed checksums are preserved **as unverified CSV claims**, never as recomputed hashes.
- Every row remains **discovery/reference-only**. No source automatically feeds emission factors, credit amounts, actuarial hazards, carbon-pricing returns, official eligibility or on-chain credit transactions. Formal safeguards in other parts of NaFT are unchanged.
- Licenses for underlying files require separate checks before redistribution and production use.

## Critical findings by CSV ID

| IDs | Verification and correction |
|---|---|
| 1-01–1-04 | Four J-Credit XLSX download URLs could not be independently re-fetched; CSV-reported 200s/hashes/counts are not new evidence. |
| 1-05 | J-Credit index returned 403. Do not infer current AG-005 executable rule pack. |
| 1-06 | JapanFlux ADS landing page is JavaScript-only; download and site coverage unverified. |
| 1-07 | JMA observation download UI and QC/missing-value semantics verified from official help page. |
| 1-08 | NARO 1 km agriculture-weather data restricted to registered noncommercial R&D/education/trials. No public production redistribution. |
| 1-09 | JAXA registration and Terms-of-Use acknowledgement required before scene downloads. |
| 1-10–1-13 | MLIT official index found via search, Fukushima GIS reuse needs permissions, MOE seagrass survey landing verified, JRA-3Q DOI 10.20783/DIAS.645 exists. |
| 2-01, 3-06 | CarbonPlan exact ZIP is documented, but archive not fetched. Data from seven registries may carry third-party restrictions; 3-06 is the same **off-chain** dataset, not a chain event feed. |
| 2-02 | APX legacy buffer-report URL now redirects to generic Xpansiv resources. It is not a verified Verra buffer balance source. |
| 2-03 | CRBN buffer comparison is secondary research, not original registry verification. |
| 2-04 | CARB FeatureServer and Forest layer 17 verified through official schema, including buffer and reversal fields; snapshot/version still needed. |
| 2-05–2-06 | Zenodo records and DOIs visible; underlying 2.2GB/2.1GB archives and licenses not independently inspected. |
| 2-07 | ICVCM CCP-approved methodology listing is status/category information; **do not convert automatically into numeric risk weights**. |
| 2-08–2-10 | FDMA and Forestry Agency original statistics catalogs available; private insurance payments are only a hazard proxy, not carbon-credit losses. |
| 2-11–2-12 | JMA best-track ZIP / NASA FIRMS CSV direct bytes unavailable to this reader; original claims about SHA and number of rows remain unconfirmed. |
| 2-13 | Dynamic JPX price/volume PDF available, visually inspected, and continually updated: fix the actual snapshot date/hash before numerical claims. |
| 3-01 | Polkachu endpoint not verified, Regen ecocredit Batch schema confirmed through official protocol docs. |
| 3-02–3-03 | Toucan official subgraph needs The Graph API key; Dune route exists but dynamically loaded query data unverified. |
| 3-04 | KlimaDAO official Carbon Pools page now explicitly states **deprecated**. Historical architecture reference only. |
| 3-05 | Sepolia PublicNode endpoint should be validated by JSON-RPC POST `eth_chainId = 0xaa36a7`; web root GET cannot confirm it. |

## Proposed safe use in NaFT

1. Put documentation entries through **manual source/version/terms review**. No source is automatically approved for calculations.
2. For Excel/CSV/ZIP: independently obtain the original source, log HTTP status/content length/ETag, recompute SHA-256, check license, variable dictionary, units/time coverage/QC and stable version.
3. For API feeds: pin query, as-of timestamp, chain identifier, pagination and result checksums; reject stale schema, unauthorized API, truncated pages, or credentials in Git.
4. For actual research validation: choose a bounded, lawfully accessible subset; build an independently calculated oracle and publish test cases including conflicts and missing evidence.
5. Preserve traceable provenance without claiming that blockchain evidence is equivalent to environmental integrity or a registry's legally effective approval.

### Reference links
[CarbonPlan terms](https://github.com/carbonplan/offsets-db-data/blob/main/TERMS_OF_DATA_ACCESS) · [CARB layers](https://gis.carb.arb.ca.gov/hosting/rest/services/Hosted/CARB_offset_projects_by_type/FeatureServer/layers) · [NARO criteria](https://amu.rd.naro.go.jp/wiki_open/doku.php?id=criteria) · [Fukushima GIS caveats](https://www.pref.fukushima.lg.jp/sec/36055a/shinrinkeikakuzu-koukai.html) · [Klima deprecated pools](https://docs.klimadao.finance/ecosystem/carbon-pools)

**Limit:** This audit is metadata and source discovery, not full-text verification of 31 external underlying datasets. Do not treat unverified hashes or rights claims from the uploaded CSV as validated.
