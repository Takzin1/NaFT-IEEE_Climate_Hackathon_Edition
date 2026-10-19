# JP-Hrt: doctoral dissertation-backed methane method and QC preflight

A *user-uploaded 126-page original doctoral dissertation* was inspected in full at the relevant methods sections and hashed locally; its **SHA-256** is `613b17df36750cc0917d5c142c377d4f42f58a21b14c14cdaaf591f63b8d376e`. The PDF is NOT redistributed in this public repository; the author/publisher's original handle is http://hdl.handle.net/10291/19662 .

## What the primary document establishes

Shujiro Komiya, *Methane and carbon dioxide dynamics in temperate and tropical rice paddy fields*, PhD dissertation, Meiji University Graduate School of Agriculture, 2015 academic year; repository metadata published 2018-09-28.

- **PDF page 18, chapter 2.3.4:** 2013 **Japan** (Hiratsuka) CH₄ = **closed-path eddy covariance**; 2014 **Thailand** CH₄ = **HREA**. These are *not* interchangeable method definitions.
- **PDF page 19, §2.3.4.1:** Japan's 30-min flux measurement uses the CSAT3A ultrasonic anemometer and Picarro G2301-f closed-path CH₄/H₂O analyser. Thesis equation (2.5) is expressed in **mg CH₄ m⁻² s⁻¹** for that research calculation. This is **not** proof of the released JapanFlux2024 standardized `FCH4` file unit; do not feed these same numbers into a `mg` versus `nmol` adapter without the dataset variable dictionary.
- **PDF page 22, §2.3.5:** research quality *exclusion* rules (Japan-specific where noted): wind directions from **76° to 107°**; low turbulence when **u\* ≤ 0.07 m/s**; rainfall periods; EC150 CO₂/H₂O strength below 0.7; 30-minute versus six 5-minute covariance difference exceeding 40%; rice field footprint representation below 60%. The source study further rejects CH₄ when CO₂ fails its stationary test. These must not be applied blindly to different later-generation product quality flags.
- **PDF page 23, §2.3.5:** for seasonal **study budgets**, missing half-hourly methane flux was modeled with site-specific exponential/log-CH₄ vs air-temperature regression. That historical **research-modeled annual/seasonal budget is not the same as observed, unfilled 2013 FCH4 rows in ADS**. Do not use it as a hidden gap-fill rule or infer its fitted regression coefficients from this summary.

This narrows the old method mismatch: BADM's **closed-path EC** statement has direct support from a same-site, same-period investigator's dissertation. ADS metadata's broad HREA/chamber phrasing may describe different experiments or streams. The exact **ADS `FCH4` product → study/measurement stream** relation, the 2013-08-31 BADM date, and local QC state remain open for documented review.

## Verified dataset inputs used for *preliminary* audit

From the operator-supplied, SHA-256-pinned JapanFlux2024 v2.00 ZIP: 17,520 half-hour rows in 2013; **1,915 numeric FCH4** and 15,605 missing. Existing source manifest in `research/japanflux-jp-hrt-v200/source-archive-pin.json` pins original ZIP and observed CSV hashes.

The original released 30-minute CSV has `WD_1_1_1`, `USTAR_1_1_1`, `P_RAIN_1_1_1` and `FCH4`; it **does not provide an unambiguously verified FCH4-specific QC column**, nor enough independently reviewed stationarity, footprint, and analyser signal-strength evidence.

A new **overlapping provisional-flag** tally from 1,915 numeric rows:

| Evidence proxy | Rows |
| --- | ---: |
| Wind direction 76°–107° | 8 |
| `USTAR_1_1_1 ≤ 0.07` | 38 |
| `P_RAIN_1_1_1 > 0` | 20 |
| **Union (at least one flag)** | **63** |
| Missing wind measurement | 99 |
| Missing u-star value | 107 |
| Missing rainfall proxy | 98 |
| No proxy flag and all three inputs present | 1,747 |
| No proxy flag, some input missing | 105 |
| **Proven QC-accepted CH₄ observations** | **0** |

*No proxy flag* means only that those three fields did not trigger a provisional filter. It does not verify that source data underwent the exact thesis calculations. Rainfall **period** exclusions may cover more than a `P_RAIN>0` sample; source-generation processing may differ; and threshold endpoints are treated conservatively as potentially excluded, not as final research QC decisions. Multiple reasons may overlap. `qc_accepted_rows=0` means **none independently certified by this checker**, not that all 1,915 are physically invalid.

## Implementation

`research/japanflux-jp-hrt-v200/komiya-2015-thesis-method-evidence.json` records section/page pointers, pinned original PDF bytes, instrumentation/methodology and exact literature screening parameters. It cannot be altered to claim quality acceptance without triggering the review gate.

`scripts/japanflux-jp-hrt-v200-thesis-qc.py` reuses the existing safe ZIP parser and original source SHA-256 pinning, validates the exact local 2015 thesis PDF, verifies the method-reference JSON's cautious status, and scans native `FCH4` rows **without converting or integrating methane mass**. Output is source-bound by four hashes (source ZIP, normalized/native source, doctoral thesis PDF, reviewed method metadata) and a deterministic SHA-256 of the candidate row-level reason trace.

Local invocation (original files remain external to Git):

```bash
python3 scripts/japanflux-jp-hrt-v200-thesis-qc.py \
  /path/to/A20241210-020_2.00_selected.zip \
  research/japanflux-jp-hrt-v200/source-archive-pin.json \
  /path/to/CV_komiya_2016_nou.pdf \
  research/japanflux-jp-hrt-v200/komiya-2015-thesis-method-evidence.json \
  research/japanflux-jp-hrt-v200/native-observation-profile.json \
  > /tmp/jphrt-thesis-qc-report.json
```

CI uses *synthetic* row-level positive/negative tests and the actual dataset-derived summary/pin invariants. The original 153MB observation ZIP and 2.2MB dissertation are not committed, so CI cannot claim to have re-run that full local experiment. The locally observed candidate tallies are research diagnostics only.

**Still blocked**: independently authenticated publisher bytes, reliable source-specific variable/unit dictionary and line-by-line QC, official J-Credit AG-005 applicability, yearly emissions, actual verified climate reduction, and certification. In particular, **never recode `SOURCE_PRESENT_QC_UNASSESSED` as `OBSERVED_GOOD`** merely because a sample has not triggered one of three basic proxies.
