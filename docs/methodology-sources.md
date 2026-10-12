# Methodology source verification — 2026-09-20

| Source | Retrieval and implementation boundary |
|---|---|
| [AG-005 public-comment reference PDF](https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000281460) | HTTP 200, 384,171 bytes; document title identifies Ver.3.1. SHA-256 `f861e4af40f3fa1fb3a0b54327cd7720f6e5028ae99455bf39274f97140a2050` |
| [Official methodology index](https://japancredit.go.jp/about/methodology/) | この環境ではfull body取得が安定せず、現行最新版は独立確定していない |
| [AG-005 Ver.3.3 e-Gov primary document](https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000288301) | Ver.3.3原文を一次資料として確認。文書内の改定履歴ではVer.3.1の有効期限は2025-02-24。repositoryのExecutable Packには未反映 |
| AG-005 Ver.3.4 secondary reference | 2025年9月時点の第三者資料がJ-クレジット制度のVer.3.4を参照。ただし本repositoryでは一次原文byte列・SHA-256を固定しておらず、現行最新版とも断定しない |
| AG-004 Ver.2.4 | 2026-09-23時点の研究状況では原文を確認済み。ただし原文byte snapshot / SHA-256を本repositoryへ固定しておらず、Executable Packへの翻訳も未実装。Compilerは`AG-004@UNKNOWN` / `UNSUPPORTED`のfail-closed placeholderを維持 |

The existing AG-005 3.1-reference object is retained as a historical reference, not a current institutional implementation. The separate Compiler Pack binds the retrieved source hash and marks official adoption, effective dates, coefficients and complete rule translation unresolved. The reference PDF describes the two-year baseline and seven-day extension (section 1, pp.1–2); mapping those fragments does not establish complete eligibility. No later version number, official transition, factor or evidence requirement was inferred.

AG-004については、その後の研究でVer.2.4原文を確認した。ただし「原文を確認した」ことと「NaFTが制度対応した」ことは別である。現時点ではExecutable Pack、制度条件の完全翻訳、Pack hash固定、計算実装は行っていないため、Compiler上は`AG-004@UNKNOWN` / `UNSUPPORTED`のfail-closed placeholderを維持する。AG-004特有の条件依存・循環的評価構造は今後の研究対象であり、正式対応済みとは表現しない。既存placeholderの`source_checked_at=UNKNOWN` / `source_attempted_at=2026-09-20`は、repository上のExecutable Packに原文検証結果を取り込んでいないことを示す。

NAFT-SYNTHETIC 1/2 are invented engineering protocols under a separate methodology ID. Their source hash covers canonical Pack JSON without source_hash, as indicated by source_hash_scope. Dates, coefficients and evidence categories are synthetic. The version-2 additional intensive-only rule/parameter/evidence requirement and conditional judgement exception are not AG-005 policy claims. They demonstrate the mechanics without fabricating institutional changes.

## 2026-09-21 repair re-check boundary

AG-005の現行制度版は本repositoryに登録していない。e-Gov一次資料でVer.3.3は確認でき、第三者資料では2025年9月のVer.3.4参照が確認できるが、現行最新版の原文byte snapshot / SHA-256 / effective statusを本repositoryでは独立固定していない。したがって`AG-005@3.1-reference`から実在版へのinstitutional diffをNaFTの実証結果として扱わない。
