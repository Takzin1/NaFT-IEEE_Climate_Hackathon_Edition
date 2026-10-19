# gasfluxes / independently published benchmark attribution

**Origin:** Roland Fuß (author), Roman Hüppi (contributor); `gasfluxes`
version 0.7-2 (CRAN; Thünen Institute).
https://github.com/cran/gasfluxes/tree/0a50f94bc7c1d6560bb5f32a596c7092d35c079c

**Source:** `vignettes/fluxmeas.csv`, pinned source Git blob
`ff5e9982b5c24583342ce6e358aae368b6a710ea`.
This folder's `fluxmeas-first-five.csv` is an **unaltered excerpt**
consisting of the original header and first 20 data records, not the entire
source file. The original CRLF line endings and source values are preserved.

**Licence:** The upstream package `DESCRIPTION` lists
`License: GPL (>= 2)` (SPDX `GPL-2.0-or-later`).
Its separate benchmark CSV excerpt is distributed with the original
package licence, and is **not relicensed** under NaFT terms.
GPL licence: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
Original CRAN package: https://cran.r-project.org/package=gasfluxes

**Independent expectations:** Upstream
`tests/testthat/test_gasfluxes.R` at the exact pinned commit publishes
the five `linear.f0` and `linear.C0` expected values for the first
20 observations. These golden values and upstream `R/linear.R` are
referenced, but third-party R source is NOT vendored or executed.

**Verification boundary:** Two distinct NaFT implementations
(Python `Decimal` and Node built-in `Number`) replay the five inputs,
and a third comparator checks both against the upstream R test expectations.
No IPCC conversion, physical methane mass, raw Gimje chamber replay,
field agreement, regulatory approval or environmental certification.
