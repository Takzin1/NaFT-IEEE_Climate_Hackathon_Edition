# NaFT IEEE — Research-grade external eddy-covariance repo register (2026-10-19)

This records **seven verified accessible public GitHub repositories** and pins their exact commit SHA, license-file Git blob SHA and scientific role. It does **not** fork/clone/install/vendored-import the repositories, commit their third-party code, or run their calculators against JP-Hrt. The connector exposed repository code/metadata and the Git SHA and license files at research time; the no-network GitHub Actions verifier subsequently checks **local recorded invariants** only, not live upstream commit status. The attached paper stays external to this repository.

## Primary research source and scope

Masahito Ueyama et al. (2012), *Influences of various calculation options on heat, water and carbon fluxes determined by open- and closed-path eddy covariance methods*, *Tellus B*, 64, 19048. **DOI https://doi.org/10.3402/tellusb.v64i0.19048**. The user-supplied file named `Tellus2013(1).pdf` is *the 2012 article*, not a 2013 study. Its exact PDF SHA-256: `17f2cc3951d7d853d0ffe269f55dca5d469e4d3f755b761a74a50b2fb0cd5218`. Page 1 labels the article **CC BY-NC 3.0 Unported**; this PDF is **not** copied into public GitHub and may not be freely redistributed for commercial purposes.

The authors tested the impact of raw-flux processing choices on **heat, water vapor and CO₂ fluxes** from seven sites, including a 2005 rice paddy at **Mase (MSE)**, *not* 2013 JapanFlux **Hiratsuka (JP-Hrt)**. Method selections include despiking, coordinate rotation, detrending, open/closed sensor lag, high-frequency loss correction and quality filtering (pages 4–7). Appendix B (page 22) describes a 50% steady-state and 500% integral turbulence test and higher moment criteria in that study; these are **not interchangeable with Komiya's JP-Hrt-specific 40% stationarity rejection threshold**, and are not safe to apply as automatic JP-Hrt QC in NaFT. Appendix E discusses **CO₂/other-paper flux gap filling**, not a validated CH₄ gap-fill for JP-Hrt.

The paper demonstrates *processing-method and annual-aggregation sensitivity*. The source does **not** license NaFT to declare source `FCH4` as QC-accepted nor independently authenticate any original ADS data. Keep the author/site/year/variable distinction in every comparative simulation.

## Confirmed upstream candidates, exact immutable code refs

| Priority | Repository | Pinned commit | Source license | Research use, subject to available original inputs |
| --- | --- | --- | --- | --- |
| P1 | [FreqCor](https://github.com/BernardHeinesch/FreqCor) | `ac2eb2130562707c748673eb08261db65438e4cb` | Apache-2.0 | Frequency-loss spectral correction sensitivity; **requires genuine spectra and instrument transfer data** |
| P1 | [OzFlux-footprint](https://github.com/ternaustralia/OzFlux-footprint) | `fa4d9672e1534c4121ce07cde1863e15e195780a` | BSD-3-Clause | Kormann–Meixner / Kljun footprint climatologies; **needs wind/site/stability geometry** |
| P1 | [ICOS FFP-utils](https://github.com/icos-etc/FFP-utils) | `ea7ae149f8554d2eba15fb97cf162648f705d9f8` | BSD-3-Clause | Alternative Kljun footprint model for sensitivity checks; **needs turbulence, stability and instrument height** |
| P2 | [FLUXNET ONEFlux](https://github.com/fluxnet/ONEFlux) | `ef24050b783f4c7538f8acf15b488b363cd26796` | UC/LBNL custom permissive `LICENSE`, redistribution conditions to review | u\* filtering, **CO₂** gap-filling, partitioning, uncertainty reference; README notes Python 2.7/legacy support |
| P2 | [REddyProc](https://github.com/EarthyScience/REddyProc) | `ce598d94a0cbfa024fbb36e3b438b1bb9f27fe6a` | GPL >= 2, source `DESCRIPTION` | R-based ecosystem/CO₂ flux post-processing reference; **not CH₄ QC certification** |
| P2 | [PyFluxPro](https://github.com/ternaustralia/PyFluxPro) | `147cc6873dde1656bba770f62efd0912aab4a4d5` | GPL-3.0 | OzFlux-style GUI/netCDF flux QC/workflow reference; external tool only |
| P3 | [NEON eddy4R](https://github.com/NEONScience/eddy4R) | `8936beb9a58a7466833074b2b98b076d4645bcb6` | AGPL-3.0 | High-frequency eddy covariance modular QAQC review; **network copyleft review needed before integration** |

Exact license file blob SHA-1 IDs are in [the JSON register](../research/japanflux-jp-hrt-v200/external-eddy-covariance-repositories.json). These are **Git blob object names**, not evidence of successful code execution, approved licensing, scientific validation, or original data custody.

## Acquisition strategy

1. **Acquired now = identifiers and verifiable source pins only.** Do not describe this as owning forks, executing scientific software, acquiring its internal dependencies or redistributing its code. Installing and forking have not been performed. Retaining upstream commit IDs avoids mutable `main` branch drift.
2. Prioritize *FreqCor* for frequency-loss hypothesis testing and the BSD footprint engines for the rice-paddy >60% footprint exclusion test in Komiya's dissertation **once instrument and 10Hz/footprint input material exists**. No automatic inference from a 30-minute summary `FCH4`.
3. Use ONEFlux and REddyProc to cross-check **CO₂-specific** processing semantics or gap-fill sensitivity only; do not transfer standard CO₂ models to CH₄ without independent method evidence. They are not provenance authorities for 2013 JP-Hrt.
4. Keep GPL/AGPL implementations independent; obtain legal review before copying, linking, shipping or embedding into MIT-licensed NaFT. BSD/Apache and the UC/LBNL custom license also require compliance with their attribution/redistribution terms. **Links and manifests can be recorded without vendoring code**.
5. For eventual independent replay in a separately controlled environment, clone upstream at the pinned SHA and run its official test harness using controlled/synthetic input first. Record versions, runtime, inputs, licensing and source byte hashes before comparing outputs. Do not add any GitHub Actions clone or remote code execution silently.

**NaFT status unchanged:** No independently accepted JP-Hrt FCH4 QC, no instrument 10 Hz stream in this source registry, no verified AG-005 eligibility, no annual CH₄ emission or certified tCO₂e. Existing [JP-Hrt thesis QC gate](japanflux-jp-hrt-thesis-qc-2026-10-19.md) remains fail closed.

## Deterministic no-network audit

```bash
python3 scripts/audit-external-ec-repos.py \
  research/japanflux-jp-hrt-v200/external-eddy-covariance-repositories.json
python3 tests/external-ec-repositories.test.py
```

The verifier checks 7 allowed repo identities, known license declarations, SHA format, true **2012** PDF DOI/byte hash, no upstream code import/forks, no CH₄ QC upgrade, and no carbon credit numbers. The tests try forged license, fabricated SHA, 2013 misdating, illegal path, or fake installed/approved status. Network access is intentionally unnecessary and not asserted by the CI.
