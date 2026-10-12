# AG-005 reference Rule Pack

The retained institutional reference flow is AG-005 `3.1-reference`, an explicit subset. The [public-comment attachment](https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000281460) was re-retrieved on 2026-09-20 and hashed; this does not establish the currently adopted edition. See [source verification](methodology-sources.md). Multi-Pack Compiler execution is separate: AG-004 remains unsupported and NAFT-SYNTHETIC 1/2 demonstrate version transitions without inventing official revisions.

Pinned versions: rule `naft-ag005-0.1`, calculation `naft-ag005-equations-0.1`, evidence adapter `file-manifest-1`. Manifests and packages include the exact Pack hash. Maintainer release approval permits prototype reference use only.

Reference checks include field/activity identity, positive area, current crop-year consistency, inclusive activity periods, drainage before heading, consecutive pre-project baseline years, rounded-up baseline average and a seven-day extension threshold. Unsupported land changes fail closed. Sustainability is a declaration to inspect at final attestation.

Evidence categories: baseline_record per baseline year; project_record, drainage_start, drainage_end, heading_record, area_record and sustainability_record for the crop year. Byte hashes bind file contents and metadata; they do not validate the truth of observations.

The retained arithmetic preview is `A_ha * (EF_baseline - EF_project) * (16/12) * GWP_CH4 * 0.001`, with EF expressed as kg-CH4-C/ha/year. Inputs must be supplied explicitly, positive and finite; the implementation does not select coefficients. `calculation.result` remains null and CONFIG REQUIRED remains visible. Formal eligibility, current adopted rules, coefficient applicability, exceptions, additionality and official submission conformity are not established.

[Human boundaries](human-in-the-loop.md) · [Limitations](known-limitations.md)
