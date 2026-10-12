# IEEE Strategy Benchmark — reproducible synthetic comparison

## Research question

Does selective re-verification avoid building unnecessary **successor packages** after a simulated methodology change, without silently excluding claims that need work? Separately, how much **end-to-end CPU time** does the full NaFT analyzer use compared with a full-recompilation strategy on the same synthetic input?

**Do not conflate these two questions.** A result of 70 unaffected claims out of 100 does **not** establish 70% less CPU time, verification cost, carbon emissions, or human labor. The current analyzer compiles baseline predecessor packages for every claim and builds dependency/impact information.

## Reproduce — Node.js 24, no dependencies

From the IEEE feature branch:

```bash
bash tests/run.sh
node scripts/ieee-benchmark.mjs --sizes 100,200,500 --iterations 3 --output /tmp/naft-ieee-benchmark.json
cat /tmp/naft-ieee-benchmark.json
```

For a fast sanity check:

```bash
node scripts/ieee-benchmark.mjs --sizes 100 --iterations 1
```

### Workload

- Size 100 is **exactly** the deterministic ClimateChain demonstration's 100 fictional claims and the transition `NAFT-SYNTHETIC@1 → @2`.
- Sizes 200 and 500 extend the same **100-claim pattern** with unique claim/evidence identities, not new real-world observations. These are workload-scaling fixtures, not a random or representative industry sample.
- The script records SHA-256 of the workload and both rule packs; no external data, wallet, network or institutional methodology implementation is used.
- CLI restricts sizes to unique multiples of 100 up to 500 and repetitions to 1–7 so untrusted commands cannot accidentally trigger unbounded computation.

### Strategies (both actually executed)

1. **Full:** compile every old package, rebind evidence manifests to the synthetic target rule pack, then compile **every** successor package with `supersedes` lineage.
2. **NaFT:** invoke the production `analyzeImpact` function on the **same claims** and same synthetic methodology change. It recompiles baseline packages internally and creates successors only for claims selected for re-verification.

After timing, a **separate parity check** compares each actual predecessor package hash. For every selected claim it compares the complete successor package hash and status to full recompilation. For every unselected claim it checks no successor is emitted and compares its baseline/target evaluation status. An assertion aborts on any disagreement. This is a **same-implementation consistency check**, **not** an independent semantic oracle; the different test `tests/impact-proof.test.js` covers independently reconstructed semantics for 614 adversarial synthetic cases.

### Observations and interpretation

The JSON report contains two distinct measurements:

| Measurement | What it means | What it does NOT mean |
| --- | --- | --- |
| `output_work_units` | Count of resulting successor packages built by full and selective approaches; number avoided | Measured person-hours, financial costs or runtime savings |
| `runtime_ms` | Warm-up plus alternated run order; raw per-run monotonic-clock milliseconds and median on the executing CPU | Guaranteed speedup, fair external-vendor comparison or production capacity |

The full algorithm has to build all target successors; NaFT has impact-analysis overhead and compiles old packages. Therefore **NaFT may be slower on this small fixture even while it avoids creating 70 successor packages**. Report the sign and actual measured values as observed. No threshold on runtime is a CI pass condition.

Outputs change with hardware, Node version, CPU scheduling, garbage collection and small sample size. Median is descriptive only; no confidence intervals or broad asymptotic conclusion are implied. The report includes Node version, platform, architecture and CPU model; do not compare numbers across machines as though controlled. CLI writes a measurement file only when `--output` is passed, so generated timing reports do not pollute version-controlled source.

## Trust and safety limits

All inputs are synthetic. The new rule pack is not an official AG-005 amendment, and matching evaluations do not establish environmental validity, formal verification, registry adoption, authentic source evidence, or credit issuance. This benchmark never writes to chain; existing Sepolia P1/P2 are unaffected. No algorithmic correctness claim beyond tested fixtures is implied.

## CI regression gate

`tests/ieee-benchmark.test.mjs` executes the real CLI for the 100-claim workload, rejects malformed/unbounded arguments and asserts complete predecessor/selected successor parity and status coverage. It validates report structure and finite timings **without** assuming that NaFT must run faster.

Reviewers can rerun the CLI on the exact committed code and compare the machine metadata, workload hashes, output counts, and actual local timing samples.
