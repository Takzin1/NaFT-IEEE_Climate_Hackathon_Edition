# NaFTMRVAnchor

`NaFTMRVAnchor.sol` is the only blockchain contract used by the ClimateChain branch.

It is deliberately dependency-free and contains no token standard, marketplace, payment flow or privileged certification role. The deployment wallet becomes the fixed `anchorWriter`; only that wallet may append package lineage. This writer authorization protects the provenance namespace and does **not** certify climate truth.

## Two-step lineage example

For a claim whose existing NaFT package is `P1` and re-verification creates successor `P2`:

1. anchor `P1` with `previousPackageHash = 0x00…00`;
2. anchor `P2` with `previousPackageHash = P1`.

The second call succeeds only when `P1` exists, belongs to the same claim hash, and is the current head of that claim.

## Safety boundary

An anchor proves that particular bytes32 values were recorded in a chain transaction. It does not prove that evidence is authentic, that an MRV methodology is officially applicable, that a reduction occurred, or that a carbon credit was issued.

The repository does not contain private keys or RPC credentials. Do not commit them.

See [the testnet anchor runbook](../docs/testnet-anchor-runbook.md) before making any public on-chain claim.
