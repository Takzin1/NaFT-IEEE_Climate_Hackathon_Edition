# Real-source bridge: versioned dataset snapshot preflight

NaFT's submitted 100-claim methodology example is **synthetic**. The strongest comparable IEEE submissions reference real satellite scenes, real voluntary registry data, and external field-study benchmarks. We should not pretend a synthetic corpus is field validation.

This narrow adapter provides **a source-data integrity and delta gate** for independently obtained records. It does not add an external runtime dependency or claim that a real project has been validated.

## Official source candidate (verified metadata, not ingested)

UC Berkeley's [Voluntary Registry Offsets Database](https://gspp.berkeley.edu/berkeley-carbon-trading-project/offsets-database) publishes v2026-08, previous v2026-06, download links, documentation and a CC BY 4.0 citation requirement. This is a promising *future* source for testing changes in source records across versions. A real snapshot must be downloaded, normalized, and checked against the original workbook by an operator; NaFT does **not** currently bundle, analyze or independently authenticate that dataset.

Attribution if used: Pamela Quartson, Barbara K Haya, Tyler Bernard, Aline Abayo, Xinyun Rong, Ivy S So, Micah Elias (2026), *Voluntary Registry Offsets Database v2026-08*, Berkeley Carbon Trading Project, University of California, Berkeley. License CC BY 4.0. Use the official page for source-of-truth and the download/license terms.

**Different problem from CarbonTwin:** This preflight detects **any changes to a locally normalized source catalog and refuses gaps**; it does not match projects across registries, classify double counting, analyze issuances, or implement CarbonTwin's model or Merkle approach.

## Input (normalized local JSON)

Create two UTF-8 JSON files from independently sourced, same-publisher releases. Use **complete exported record sets** for the intended audit scope. Do not label tiny manual samples as a complete publisher release. The `catalog_ids` list must come from a declared audit inventory, not be silently constructed after dropping inconvenient records.

```json
{
  "schema": "naft-source-snapshot-1",
  "source": {
    "url": "https://publisher.example/dataset",
    "release": "v2026-06",
    "retrieved_at": "2026-10-18T00:00:00Z",
    "attribution": "Original published dataset author and citation",
    "license": "Published source terms"
  },
  "catalog_ids": ["PROJECT-001", "PROJECT-002"],
  "records": [
    {"id": "PROJECT-001", "data": {"methodology": "M1", "status": "active"}},
    {"id": "PROJECT-002", "data": {"methodology": "M1", "status": "active"}}
  ]
}
```

The example above is **invented schema documentation**, not a sample of Berkeley's projects. Dataset releases can add/remove records or rename identifiers. Source-record identity and citation/attribution need external human validation.

## Compare and replay (Node.js, no packages or network)

```bash
node scripts/ieee-source-snapshot.mjs compare old.json new.json > source-delta.json
node scripts/ieee-source-snapshot.mjs verify old.json new.json source-delta.json
```

The report includes the SHA-256 of each **local JSON file**, a digest of the declared catalog IDs and normalized record set, as well as added, removed, modified and unchanged record counts. The review set is the union of added/removed/modified IDs. A replay recalculates everything from the input bytes: editing or rehashing the report without the underlying records is rejected.

## Fail-closed policy and honesty boundaries

- Missing declared catalog row, duplicate ID, undeclared row, different source URL, malformed metadata or changed content under the same release name: **fail**.
- Metadata such as source URL, attribution, release and license are **claims of the importing operator**, not independently authenticated statements. Even a complete locally declared catalog might omit rows that the true publisher included.
- Record changes are **source-drift review candidates**, not automatically impacted carbon claims. Methodology-dependent re-verification can only occur after a **reviewed field mapping and rule pack** connect these source fields to NaFT's compiler.
- No claim of verified carbon reductions, duplicate issuance, fraud, scientific correctness, actual live dataset ingestion, Merkle root or on-chain anchor. Existing [read-only Sepolia verification](../scripts/verify-live-sepolia.sh) operates on separate, previously recorded synthetic evidence.
- No network or wallet request is initiated. Inputs are bounded at 2MB and 10,000 IDs/records; larger datasets require separately reviewed chunking or streaming.

## Competitive follow-on work (must remain explicitly uncompleted)

1. **Source acquisition**: export documented columns and stable project/record IDs from official v2026-06 and v2026-08, record exact upstream XLSX SHA-256, validate completeness against official row counts, obey CC BY 4.0.
2. **Identity mapping**: handle legitimate registry ID renames separately from new/removed projects; use explicit human review of ambiguous cases.
3. **Rules connection**: map supported source fields to a reviewed methodology pack, then prove **which carbon claims are actually affected**. Without this, a data-row change is *only* a review candidate.
4. **Judge demonstration**: publish a reproducible short real-data example with citations, documented limitations, and regenerate the 3–5-minute English video to show the new feature. No new on-chain write is required for preflight.

## Repeat automated checks

`node tests/ieee-source-snapshot.test.mjs` covers deterministic equality, 1 added/1 removed/1 modified/1 unchanged, missing declared evidence, duplicate/unexpected identities, cross-source mixing, unchanged-release tampering, and forged reports even when attackers recompute root hashes.
