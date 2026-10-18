---
title: "NaFT — J-Credit AG-005 & GX-ETS 計算ロジック技術仕様"
version: "0.1.0-research"
prepared_at: "2026-10-18"
status: "RESEARCH_ONLY / NOT_CERTIFIED"
focus: "AG-005, rule pack, evidence dependency, formula selection, GX-ETS isolation"
---

# NaFT — J-Credit AG-005 / GX-ETS 計算ロジック・ギャップ仕様書

> **重要：研究・実装設計用。J-クレジット認証・GX-ETS報告・公的検証の代替ではない。**
>
> 調査基準日：**2026-10-18**。本仕様のAG-005 Ver.3.3数式・細則とVer.3.5版の表示情報は**ユーザーが提供した調査メモからの転記**。このPRでは公式原典のPDFバイト列を取得して独立検証していない。特にVer.3.5の本文・SHA-256・施行日・経過措置は未確認であり、**Ver.3.3参照計算をVer.3.5の正式実装として扱わない**。

## 0. 3種類の値と信頼境界

| 種類 | 定義 | 実装時の扱い |
| --- | --- | --- |
| `RESEARCH_OBSERVATION` | 試験圃場・衛星・測定器の科学的観測や推計 | 証憑候補。未認証 |
| `METHOD_CALCULATION` | 適用方法論と入力に基づく算定結果 | 計算照合に使用。単体では未認証 |
| `CERTIFIED_AMOUNT` | 所定の認証・登録・発行手続きを経た量 | 独立した外部記録と照合できる場合に限る |

過去の研究慣行区比、制度上の案件別ベースライン、事業者の公表認証総量は**相互に代用しない**。既存データ9地点・研究集計比率3件・公表集計4件を、特定農家の係数・原証拠に自動昇格させない。

## 1. ソースロックとRule Pack

[機械可読の版・原典・依存関係ベースライン](../data/japan-mrv-research-2026-10-18/ag005-gxets-gap-baseline.json)を同時格納。前述の研究用データパックとは別ファイル。

| Source key | 原典候補 | 今回の状態 |
| --- | --- | --- |
| METHOD_INDEX | https://japancredit.go.jp/about/methodology/ | Ver.3.5掲載とのユーザー報告。独立未確認 |
| AG005_V35_PDF | https://japancredit.go.jp/pdf/methodology/AG-005_v3.5.pdf | **原本未取得／SHAなし** |
| AG005_V33_PRIMARY | https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000288301 | 式(1)–(8)についてユーザーの原典転記。再照合未完了 |
| MAFF_R8_TECH | https://www.maff.go.jp/j/kanbo/kihyo03/gityo/g_kihon_sisin/attach/pdf/r8sisin-2.pdf | 3.5への案内と報告。未検証 |
| NID_2026 | https://www.nies.go.jp/gio/aboutghg/ | 発行年ごとの係数の参照先候補 |
| NID_2026_AGRI_TABLES | https://www.nies.go.jp/gio/archive/nirdata/2026.html | 年次・地域・排水性別表の取得待ち |
| MAFF_AG_SIMULATOR | https://www.maff.go.jp/j/kanbo/kankyo/seisaku/climate/jcredit/241226.html | 算定Excelの独立比較待ち |
| GX_ETS_MANUAL | https://www.meti.go.jp/policy/energy_environment/global_warming/ets_santeihoukoku.pdf | GXの独立ドメイン一次資料候補 |
| GX_ETS_VERIFICATION | https://www.meti.go.jp/policy/energy_environment/global_warming/ets_kakunin.pdf | 第三者確認手順、単位・丸め確認待ち |
| GX_ETS_PORTAL | https://www.meti.go.jp/policy/energy_environment/global_warming/ets.html | 最新版への入口 |

### 1.1 必須メタデータとFail-Closed条件

`AG-005@3.5`を`src/methodology-packs.js`内に明示したが、`status: CONFIG_REQUIRED`、`source_hash: UNKNOWN`、`calculation_spec.operation: UNSUPPORTED`で固定している。ベースライン側は`original_sha256: null`、`effective_from/to: null`、`transition_policy: null`、`rounding_spec: null`、`certification_allowed: false`。

実施日・審査申請日・適用方法論の施行日・公表インベントリ版・係数対象年・GWP版を**別々のキー**にする。改定日を施行日と推定しない。確認できない正式係数・丸め位置・経過措置・法定承認を補完しない。

## 2. AG-005 Ver.3.3 — 転記された参考計算式

**以下はユーザーがVer.3.3の該当ページから転記した研究用関数。Ver.3.5適用を示さない。**

式(1)–(4)、pp.3–4：

```text
ER[tCO2e/year]   = EM_BL - EM_PJ
EM_BL             = Σ_f A_BL,f[ha] × EF_f,m0[kg-CH4-C/ha/year] × (16/12) × GWP_CH4 × (1/1000)
EM_PJ             = Σ_f A_PJ,f[ha] × EF_f,m1[kg-CH4-C/ha/year] × (16/12) × GWP_CH4 × (1/1000)
A_BL,f = A_PJ,f   = A_f  (V3.3 reference; subject to confirmed field identity)
ER                = Σ_f A_f × (EF_f,m0 - EF_f,m1) × (16/12) × GWP_CH4 × (1/1000)
```

`kg-CH4-C` と `kg-CH4`、`t-CH4`、`t-CO2e`、`t-CO2`は異なる。質量変換16/12とkg→t変換1/1000を省略しない。

Ver.3.3 p.8 式(8)として転記された参照処理：

```text
EF_m1 = EF_m0 × (1 − 0.3) = 0.7 × EF_m0
```

この30%は規則上の参考係数で、個々の実圃場で30%減ったという観測事実ではない。**Ver.3.5へ自動継承しない**。

### 2.1 係数選択の複合キー（pp.5–6の転記）

`region_i × drainage_j × water_management_k × organic_l × period_y × inventory_edition × factor_kind` を一体として記録。

- 地域区分：都道府県→NIDの公式地域。
- 排水性：排水不良／日排除／4時間排除。
- 水管理：該当版で許容される水管理区分（Ver.3.3転記は間断灌漑）。
- 有機物：無施用／稲わら／堆肥／混合・部分施用。
- 係数年：活動発生年。インベントリ発行版は検証申請日と適用規則で選ぶ。

原典テーブルの`source_url`・`source_sha256`・`table_id`・`inventory_edition`・`factor_year`・`unit`・`rounding`が揃うまで公式係数リゾルバは`CONFIG_REQUIRED`。

### 2.2 稲わら／堆肥（pp.7–8 式(5)–(7)の転記）

`E0=無施用`、`Es=稲わら`、`Ec=堆肥`、`w=稲わらすき込み%`、`x=堆肥[t/10a]`。

| ケース | 転記された研究用式 |
| --- | --- |
| w=0, x=0 | E0 |
| 0 < w < 90, x=0 | E0 + (Es-E0) × w/90 |
| w≥90, x=0 | Es |
| w=0, 0 < x < 1 | E0 + (Ec-E0) × x |
| w=0, x≥1 | Ec |
| w>0, x>0 | min(E0 + (Es-E0) × min(w,90)/90 + (Ec-E0) × min(x,1), max(Es,Ec)) |

`w/90` を `w/100`に置換しない。入力範囲`0≤w≤100`、`x≥0`。w>90またはx>1には、転記で示された飽和キャップに加えて**入力超過の人的レビュー**を要求する。合筆・換地の土壌移動時に「稲わらなし」とみなす可能性のある条件は、原典と証憑を確認するまで自動判断しない。

境界値例：E0=100, Es=200, Ec=150（**全て架空、kg-CH4-C/ha/year**）。

`w=45,x=0 → 150`、`w=0,x=0.5 → 125`、`w=90,x=1 → 200（raw=250をcap）`。

### 2.3 排水性（Ver.3.3 p.7の転記）

```text
adjusted_d = 1.22 × measured_d_mm_per_day
adjusted_d < 7.5        -> POOR_DRAINAGE
7.5 <= adjusted_d <12.5 -> DAILY_DRAINAGE
12.5 <= adjusted_d      -> FOUR_HOUR_DRAINAGE
```

補正後`7.499/7.500/12.499/12.500`の境界テストを用意する。実測を採用するには測定日時・無降雨24h・取水／排水口閉鎖・測定記録・客観的証拠を要求し、不足なら`EVIDENCE_REQUIRED`。係数最小となるデフォルト排水性は公式NIDの候補係数を**実際に比較した後**でなければ選ばない。特定クラスを固定値として代入しない。

### 2.4 中干し延長（Ver.3.3 pp.1–2の転記）

```text
base_average = sum(prior_crop_drainage_days) / number_of_prior_crop_cycles
base_days    = ceil(base_average)
effective_end = min(actual_drainage_end, heading_date - 1 calendar day)
project_days = inclusive_days(drainage_start, effective_end)
day_condition_met = project_days - base_days >= 7
```

- 過去**2年以上**の対象栽培回を明示し、複数回栽培も栽培回単位で平均。年平均の再平均をしない。
- `YYYY-MM-DD`を厳密検証。出穂日の前日で打切り、開始・終了日は両方含める。
- 参考例：過去平均10.01日→切上げ11日、実施17日→6日延長（未達）、18日→7日（**日数条件のみ達成**）。
- 客観的証憑・環境社会配慮・既往実績・農地同一性を別審査し、日数通過だけで認証しない。

### 2.5 合筆・分筆に伴う旧圃場の系譜

```text
allocated_area_i = merged_area × previous_area_i / Σ(previous_area_j)
```

`parent_field_ids`、面積台帳、地図資料、作土の移動、再測定、元圃場の旧栽培記録との対応が必要。按分**だけ**の純粋な数学関数を公開するが、親子対応が未証明なら`EVIDENCE_REQUIRED`。公式の面積丸めは未確認。

## 3. 例示計算と精度規約

- 架空の`area=2 ha`、`EF_BL=100 kg-CH4-C/ha/year`、`EF_PJ=70`、`GWP_demo=30`なら、`ER=2×(100−70)×(16/12)×30×0.001=2.4` **indicative tCO₂e/year**。
- 正式GWPとNID係数は`null`のまま。架空の30を公式値へ昇格させない。
- 計算内部は10進入力文字列から構成した既約有理数（BigInt numerator/denominator）。外部出力には**正確な分数**と、有限小数にできる場合だけ`decimal_exact`を出力。公式丸めは**未実装**であり、認証可能値は全経路で`null`。

## 4. APIと実装経路

| 実装 | 役割 |
| --- | --- |
| `src/mrv-rational.mjs` | 単位付き演算に使用する正確な10進文字列→有理数 |
| `src/ag005-v33-reference.mjs` | Ver.3.3転記の有機物、排水性、7日判定、出穂打切り、面積按分、研究用BL/PJ/ER、影響差分 |
| `src/gxets-fuel-reference.mjs` | GX-ETSの燃料燃焼だけを別会計モデルで演算 |
| `src/methodology-packs.js` | `AG-005@3.5`を**計算不可**の正式版候補として登録 |
| `tests/japan-method-gap.test.mjs` | 単位・境界・日数・版・証憑・非混合の回帰テスト |
| `scripts/japan-methods.mjs` | 入力JSONのローカルCLI例示と評価 |
| `data/japan-mrv-research-2026-10-18/ag005-gxets-gap-baseline.json` | 原典／未確認フィールド／依存項目一覧 |

方法論の正式係数選択`resolveBaseEF`は**保留**。公式採用版、NIDテーブル、経過措置、GWP、端数処理が欠ける場合に「公式計算成功」を返さない。

## 5. GX-ETS Edition — 計算ドメイン完全分離

燃料燃焼による**直接CO₂**の例示式（ユーザー提示のMETIマニュアル第1章）：

```text
CO2_fuel[tCO2] = fuel_Q[t|kl|1000m3] × HV[GJ/unit] × CF[tC/GJ] × (44/12)
```

`fuel_Q.unit` と `HV.unit`の分母が一致すること、CFは`tC/GJ`であることを型として検証。係数が正式に検証されたという偽装や購入電力`PURCHASED_ELECTRICITY`を直接燃料CO₂へ追加する処理を拒否。

`FUEL_COMBUSTION`のみ研究用算術を実装。`INDUSTRIAL_PROCESS`、`REDUCTANT`、`BYPRODUCT_FUEL`、`SCOPE_BOUNDARY_CHANGE`は規則未実装で`UNSUPPORTED`。組織境界・燃料単位・体積補正・第三者確認が不足する場合もブロックする。

`tCO2e`（J-クレジットの削減値）、`tCO2`（GX-ETS直接排出）、`allowances`（排出枠）、`credits_issued`（発行量）、`credit_surrenders`（無効化）は**決して同一の数値に合算しない**。外部登録簿と確認業務フローは別の承認手続き。

## 6. 変更影響解析（NaFT独自の再検証境界）

| Changed dependency | 再検証対象・判断 |
| --- | --- |
| method_version | 正本の版・施行日・経過措置 → `REVERIFY_REQUIRED` |
| inventory_edition | NID版・該当表・参照年 → `REVERIFY_REQUIRED` |
| factor_year | 活動年・検証申請日の係数選択 → `REVERIFY_REQUIRED` |
| gwp_version | メタンのtCO₂e換算 → `REVERIFY_REQUIRED` |
| organic_material | 稲わら比率・堆肥量・原記録 → `REVERIFY_REQUIRED` |
| drainage_measurement | 1.22倍補正・境界区分・天候記録 → `REVERIFY_REQUIRED` |
| midseason_dates | 中干し日数、出穂前日、過去年の平均 → `REVERIFY_REQUIRED` |
| field_geometry/lineage | 合筆・分筆・旧記録対応、作土変化 → `REVERIFY_REQUIRED` |
| raw_evidence_bytes | 生データと期待SHA不一致 → `UNSUPPORTED` |
| human_review_decision | 旧条件に紐付いた判断の失効 → `HUMAN_REVIEW_REQUIRED` |

レコード変更の発見は`source-drift candidate`、レビュー済み依存関係の対応は`claim-impact candidate`、固定版・固定入力での独立計算は`bounded re-verification evidence`。**外部制度認証とは異なる**。同じ出力値になっても原典／証憑／判断ハッシュは再確認する。

## 7. 最小テストマトリクス

| ID | 操作 | 期待 |
| --- | --- | --- |
| AG-DAY-01/02 | 基準11日、実施17／18日 | 6日→未達、7日→日数条件達成のみ |
| AG-DAY-03 | 実施終了が出穂日以降 | 出穂日前日に打切り |
| AG-ORG-01/02 | 稲わら89%／90% | 補間式／直接Es |
| AG-ORG-03/04 | 90%+1t／100%+5t | 上限200／上限200+人的レビュー |
| AG-DRN-01/02/03 | d*=7.499/7.500/12.500 | 不良／日排除／4時間 |
| AG-DRN-04 | 降雨証拠欠落 | EVIDENCE_REQUIRED |
| AG-LAND-01 | 合筆だが元筆の対応なし | EVIDENCE_REQUIRED |
| AG-FACT-01 | NID原典SHA未確認 | 公式CONFIG_REQUIRED |
| AG-VERSION-01 | V3.5原本未取得 | UNSUPPORTED |
| AG-TAMPER-01 | 計算レポート・証憑変更 | 再実行検証失敗 |
| GX-FUEL-01 | HVと使用量の単位不一致 | 例外で拒否 |
| GX-FUEL-02 | 購入電力を直接排出に加算 | 合算禁止 |
| GX-BOUND-01 | M&A・合併による境界変更 | 集計無効、要人的レビュー |

### 受入ゲート（未完了のものは明示的にブロック）

- [ ] Ver.3.5原本のバイト列とSHA-256、正式施行日を取得・検証。
- [ ] Ver.3.3対3.5の条項・式・係数・経過措置差分を原典同士で検証。
- [ ] NID 2026の対象年度・地域・排水性・有機物区分ごとの表とSHA固定。
- [ ] 農水省Excelの独立計算結果と版ごとに照合。
- [ ] 丸め・区分・端数・複数圃場按分の専門家レビュー。
- [x] Ver.3.5原本未確認時、公式計算を実行不能として管理。
- [x] Ver.3.3参考数式の代表境界値に自動テスト。
- [x] GX-ETS燃料CO₂とAG-005を分離。
- [ ] 現地測定原記録と真性・権利処理の確認。
- [ ] 外部監査、認証、制度適用判定（NaFT単独では行わない）。

## 8. 次のPRロードマップ

1. **docs(source-lock)**: V3.5原本とV3.3原本を独立取得、バイトSHAと条項Diff。
2. **feat(factor-resolver)**: NID年別テーブルと複合キー、係数最小の排水フォールバック、原本ハッシュに固定。
3. **feat(eligibility)**: 実圃場証憑・出穂日の確認・合筆系譜・社会配慮レビュー。
4. **feat(calculation)**: 係数とGWP・正式端数処理を検証した後に、認証前の計算パッケージを試作。
5. **test(parity)**: 農水省Excel・独立実装の境界比較。
6. **feat(gxets-full)**: 各排出源分類・境界変更・第三者確認を段階的に追加。

## 9. 一次資料の優先順位

**制度原文＋適用規程 ＞ 公式インベントリ係数表 ＞ 農水省Excelによる比較器 ＞ 研究論文・公表集計値**。

Sepolia P1→P2はハッシュ系譜の存在を示すもので、原情報の科学的正しさ・制度上の認証・クレジット発行を証明しない。既存IEEE合成100件、614ケースの負荷・攻撃コーパス、Sepolia参照履歴は変更しない。
