# NaFT IEEE — Asia rice-MRV research bridge (2026-10-18)

> **RESEARCH ONLY / NOT CERTIFIED.** Neither official Japanese J-Credit AG-005 nor Philippine JCM project credits nor GX-ETS emission reports are calculated or approved by this bridge.

## Inputs and reproducibility

- User-supplied Japan ZIP SHA-256: `73d59baa3819342f56bb42c873571b6707c5c9853f23d8bd8d9ccf309cc2a076`. The existing `data/japan-mrv-research-2026-10-18/baseline.json` and `scripts/verify-japan-research-pack.py` already ingest **this exact** Japan research pack; no duplicate copy was added.
- User-supplied Asia ZIP SHA-256: `f8d4460d8a6e3fa4129469a7e4df5995998d82484a90b7a75fdd8b610e933406`. `scripts/verify-asia-research-pack.py` checks the full archive hash, its 10 per-file checksums, and whether the transcribed fixture / source citations match tracked files.
- `data/asia-mrv-research-2026-10-18/reference-cases.json`: seven source-attributed **research-reference records**, not actual farm daily methane flux data.
- `data/asia-mrv-research-2026-10-18/source-manifest.json`: 10 source references and explicit unverified status. URLs are leads, **not** cryptographically authenticated original PDF bytes.
- Source of the replay: user-supplied Asia benchmark ZIP, which includes 21 Python unit tests and seven research fixture checks. Both suites passed locally before integration. Those archived test results are independent from the new **repo-native Node regression test**, which is also exercised by CI.

## Offline commands

```bash
node scripts/asia-mrv-research.mjs inspect
node scripts/asia-mrv-research.mjs ipcc
node tests/asia-mrv-research.test.mjs
python3 scripts/verify-asia-research-pack.py '/path/to/NaFT_Asia_MRV_Research_And_TestPack_2026-10-18.zip'
python3 scripts/verify-japan-research-pack.py '/path/to/NaFT_Japan_MRV_Research_DataPack_2026-10-18.zip'
```

The original ZIP is **not** uploaded into the public GitHub repository. Archive verification requires the local user-provided bytes and does not run Python code contained in untrusted ZIPs.

## Calculation and authority boundaries

| Domain | What can be replayed | What cannot be inferred |
| --- | --- | --- |
| IPCC 2019 rice Tier 1 | Published worked example: rounded stratum daily emission factors x days x annually harvested ha, reproducing **410.47 Gg CH4/year**; example water-scaling arithmetic (0.81191 vs 1.4762 kg CH4/ha/day) | Any specific Japanese field baseline, J-Credit credit amount or measured farm emissions |
| Japan AG-005 | Existing separate, fail-closed research baseline and v3.3 reference math | AG-005@3.5 official authority / current coefficients until authoritative adopted bytes, hash, date, zone-specific coefficients and farmer records are checked |
| Philippines JCM PH_AM004@1.0 | **Synthetic** CH4 + N2O + drainage-pump CO2 replay; PH-specific Ud 5%, 10% or 15% by valid measurement schedule | Automatic application to Japan, JCM eligibility, JCM credits or verified reductions |
| South Korea / Taiwan / Vietnam | Attributed experimental summaries and season-sensitive cross-checks | Transferable Japan emission factors, observed farm-level proof, regulatory credit quantities |
| Japan GX-ETS | Existing **separate** fuel-only research example | Farm methane reduction as direct corporate CO2 emissions, allowances or reporting eligibility |

**Mass and time basis:** `kg CH4-C × 16/12 = kg CH4`; `kg N2O-N × 44/28 = kg N2O`. Daily, crop-season and year amounts must not be added without matching a validated time window; two-crop totals require measured season weighting. Methane season comparison refuses differing country, method identity or crop season. `replayPhAm004Synthetic` requires every gas and pump component plus supplied scope evidence flags; flags are **assertions**, not independently authenticated monitoring records.

**Integrity and publication limits:** Local fixture SHA-256 is a deterministic file-content fingerprint, **not** a signature or source licensing approval. The original PDFs, present-day adopted Japanese rule text, raw rice-paddy observations and source-document hashes remain unverified. All official outputs remain `null`; `Sepolia` anchors only package hashes and is not invoked by this bridge.

## Next acceptance gates (not yet implemented)

1. Obtain approved, effective official method text and coefficients with hashes, provenance, permissions and version dates per jurisdiction.
2. Model field identity, water-depth evidence, crop season, fertilizer and pump scope with a separately approved schema and source fingerprints.
3. Compare actual multi-season field observations under geographical/year holdouts; account for CH4, N2O, yields and leakage.
4. Validate reviewer-approved results independently; only then consider adding read-only UI evidence cards. Never silently replace the IEEE synthetic 100-claim scenario or promote a foreign scientific factor to Japanese regulatory status.
