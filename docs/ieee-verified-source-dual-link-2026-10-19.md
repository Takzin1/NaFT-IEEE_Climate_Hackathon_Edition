# IEEE ClimateChain — verified source ↔ independent replay linkage

## Scope

A source-intake receipt and a two-engine numerical receipt are not independently
trustworthy just because their displayed hashes and site labels happen to match.
The previous `linkSourceToDualReplay()` function checked local context fields,
but did not itself rerun either receipt verifier. The new
`scripts/ieee-verified-source-dual-link.mjs` performs **both source-bound
verifications before linking** them:

1. `verifySourceIntake()` checks the exact source-spec bytes, normalized CSV and
   optional locally supplied DataCite JSON snapshot, then recomputes the source
   report. A DataCite-shaped file is NOT authenticated API delivery.
2. `verifyDualObservationReceipt()` reruns the JavaScript BigInt and independent
   Python Decimal computations on the same normalized CSV and observation
   manifest, checking full hashes, original code lineage and coverage.
3. `linkSourceToDualReplay()` rejects mismatched CSV, source URI, site ID,
   data class or declared local license status. A declaration mismatch is
   blocked even when the two individual source/dual receipts each replay.
   The link also rejects missing required context, malformed digests, and
   unsupported data classes. The combined receipt binds both report hashes and the exact
   source spec, normalized CSV, manifest and optional metadata snapshot hashes.
4. The combined receipt `verify` command independently repeats all steps;
   recomputing a forged combined SHA-256 is not enough to pass.

**Important:** The same CSV bytes are required by both components. The two
license strings must identify the same **claimed local status**; neither
constitutes a legally checked license. Distinct license identifiers/status
representations must be reconciled explicitly before linking, not silently
assumed equivalent. Real
publisher-native JP-Hrt data must pass a separately reviewed parser, license,
QC and data dictionary process before being normalized. This module does not
acquire original data or authorize that conversion.

## Reproduce offline (synthetic example)

The existing source-gateway synthetic fixture is used in tests. To run the
linked verifier with independently generated component receipts:

```bash
node scripts/ieee-source-provenance-gateway.mjs inspect \
  source-spec.json normalized.csv > source-report.json
node scripts/ieee-observation-dual-replay.mjs generate \
  observation.manifest.json normalized.csv > dual-receipt.json

node scripts/ieee-verified-source-dual-link.mjs generate \
  source-spec.json normalized.csv observation.manifest.json \
  source-report.json dual-receipt.json > linked-receipt.json
node scripts/ieee-verified-source-dual-link.mjs verify \
  source-spec.json normalized.csv observation.manifest.json \
  source-report.json dual-receipt.json linked-receipt.json

node tests/ieee-verified-source-dual-link.test.mjs
bash tests/run.sh
```

An optional last `DATACITE.json` argument is supported for both `generate`
and `verify`, if the source-intake report was generated with that same
metadata snapshot. The snapshot is a claim, not external publisher verification.


The standalone `scripts/ieee-observation-dual-replay.mjs` now separately
re-reads its original observation manifest and CSV after Python finishes, and
checks that the Python oracle, JS receipt implementation and replay driver
source files did not change during computation. This closes a metadata-only
TOCTOU gap: different site/treatment/measurement descriptions can produce
identical arithmetic, so arithmetic parity alone must not establish a
single-source result. The receipt hashes refer to the locally checked evaluator
files. Two pre/post file reads detect ordinary concurrent changes, **not**
an external trusted signature or a malicious change-and-restore attack.

The combined verifier also re-reads the **source specification and optional DataCite snapshot** after independent Python execution, alongside the CSV and observation manifest. All four inputs must still match the exact original-byte hashes before a link receipt can be emitted; adversarial regression tests mutate the files during Python replay. The read bound is enforced on the actual bytes as well as the preceding file-stat check.

## Security / scientific limits

Positive verification means **only local byte consistency and reproducible
arithmetic agreement across two implementations**. It does not mean the
source is authentic, the sensor was calibrated, the field is representative,
GHG mitigation occurred, legal licensing is established, a methodology is
applicable, or any carbon credit was issued. Source metadata, filenames and
SHA-256 alone are not trusted third-party attestations. The combined receipt
sets `certified_tco2e:null`, with external authenticity and institutional
approval explicitly unverified. No cloud, wallet, signature, certificate or
blockchain action occurs.

Automated negative tests include self-rehashed forgeries of component and
combined receipts, mismatch of site identity with identical input bytes,
altered observation manifests, mutated CSV bytes, and attempts to substitute
an unacquired original dataset. The published browser demo and frozen
100-claim synthetic scenario are unchanged.
