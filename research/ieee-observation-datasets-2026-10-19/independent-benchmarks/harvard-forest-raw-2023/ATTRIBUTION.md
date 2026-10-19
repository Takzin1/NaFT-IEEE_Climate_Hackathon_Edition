# Harvard Forest Picarro raw trace — independent research evidence

Repository: https://github.com/Harvard-Forest-Ecosystems/chamber-flux
Pinned upstream commit: `6f4ff6474a115e785002b7787001b43580585301`
Laboratory / project: Harvard Forest Ecosystems Lab.

Imported original files (byte-for-byte Git blob SHA equality confirmed):

- `input/forecasting_raw_data/CH4nowlm-20230630-160808Z-DataLog_User_Minimal.dat`,
  original blob `ad55b3751cac9d2f09736f02b4aa82a65f4d6c11`
- `input/times_key2.csv`,
  original blob `ace95b610810c7df27c98adc6500b5c6258cbb5e`

The repository has a top-level MIT license (original `LICENSE` blob
`c8dbd4a6ab16c1341c188f36e366e5972d5441d2`).
**It has NOT yet been independently established whether that license
covers research analyzer data redistribution or whether measurement-
specific restrictions apply.** Confirm before broader distribution or
commercial use. The source bytes remain research fixtures only.

`Picarro_CH4_20230630_160808.dat` contains **35** literal records
dated 2023-06-30. `times_key2.csv` contains **24** candidate chamber
event windows. The sample trace is 16:08:03.709–16:14:09.269.
No unshifted, matching same-date chamber window appears in the supplied
key for the selected trace. All 35 samples show the literal alarm code
`2`; the meaning of that code in this device's QC system is not yet
verified. These are blockers, not values to "clean" or override.

NaFT independently audits both original Git blob objects and calculates
a *descriptive concentration-vs-time slope*. No approved sensor QC,
chamber-event geometry, correct time-zone mapping or mass conversion
can be inferred. Never describe this slope as certified CH4 chamber flux.

Internal engineering intake rank: **B+**, not an outside scientific
rating, peer review or verified emissions grade. A- candidate is the
separately published `gasfluxes` fixture with its independently
published R golden results; those results validate limited arithmetic,
not Gimje field measurements.
