---
title: "NaFT — J-Credit AG-005 & GX-ETS 計算ロジック技術仕様"
version: "0.1.0-research"
prepared_at: "2026-10-18"
status: "RESEARCH_ONLY / NOT_CERTIFIED"
focus: "AG-005, rule pack, evidence dependency, formula selection, GX-ETS isolation"
---

# NaFT — J-Credit AG-005 / GX-ETS 計算ロジック・ギャップ仕様書

> **研究・実装設計用。J-クレジット認証、GX-ETS報告、公的検証の代替ではない。**
> 以下は2026-10-18にユーザーが提供した原典照合メモに基づく。今回のGitHub実装は、その原典URLへアクセスしてPDF本文を独立検証していない。**Ver.3.3の記載は「提示仕様に基づく参考実装」であり、公式に確認されたVer.3.5の条件とは扱わない。**

## 0. 三つの値と信頼境界

| Kind | 意味 | 正式認証量か |
| --- | --- | --- |
| `RESEARCH_OBSERVATION` | 科学的観測・実験結果・研究用推計 | **No** |
| `METHOD_CALCULATION` | 固定された方法論・入力で再現可能に算出した数値 | 単体では**No** |
| `CERTIFIED_AMOUNT` | 外部の制度手続を経た認証量・発行量 | **外部証明を別途確認する場合のみ** |

研究慣行区比率、案件別の制度上ベースライン、事業者の認証量合計は互換ではない。日本の研究ベースライン（9試験地点、3研究集計値、4公表事業集計）は圃場別の測定値・公式係数へ昇格させない。

## 1. 原典と版ロック

原典参照URLは [機械可読のソースロックJSON](../data/ag005-rule-gap-2026-10-18.json) に収録する。

| ID | 一次・参照資料 | 原典URL / 状態 |
| --- | --- | --- |
| METHOD_INDEX | J-クレジット方法論一覧 | https://japancredit.go.jp/about/methodology/ |
| AG005_V35_PDF | AG-005 Ver.3.5原本候補 | https://japancredit.go.jp/pdf/methodology/AG-005_v3.5.pdf **本文未取得** |
| AG005_V33_PRIMARY | AG-005 Ver.3.3原典の指定URL | https://public-comment.e-gov.go.jp/pcm/download?seqNo=0000288301 **本変更で再取得・再検証なし** |
| NID_2026_AGRI_TABLES | NIES農業時系列データ | https://www.nies.go.jp/gio/archive/nirdata/2026.html |
| MAFF_AG_SIMULATOR | 農水省計算Excelの配布入口 | https://www.maff.go.jp/j/kanbo/kankyo/seisaku/climate/jcredit/241226.html |
| GX_ETS_MANUAL | METI算定・報告マニュアル | https://www.meti.go.jp/policy/energy_environment/global_warming/ets_santeihoukoku.pdf |
| GX_ETS_VERIFICATION | METI確認業務マニュアル | https://www.meti.go.jp/policy/energy_environment/global_warming/ets_kakunin.pdf |

ユーザー調査メモでは方法論一覧に**Ver.3.5（2026-03-04改定）**が表示されていた。ただしPDF取得時403だったとのこと。したがってGitHubの `AG-005@3.5` は **`CONFIG_REQUIRED` / `UNSUPPORTED`** のままで、`original_sha256`、施行日、経過措置、NID参照版、GWP、係数表、丸め方法を `null` / `UNKNOWN` に固定する。調査メモはSHA-256が検証された公式原本の代替ではない。

**次の必須ゲート**：v3.5原本バイト列の取得とSHA-256固定、v3.3との差分、適用日・案件別経過措置・必要年のNIDの原本照合、外部レビューが完了するまでは制度適合を宣言しない。

## 2. Ver.3.3提示仕様に基づく参考計算

[参考式の実装](../src/ag005-v33-reference-math.mjs) はビッグ整数の有理数演算を使い、丸め位置を制度上勝手に確定しない。

### 2.1 主要式（提示資料：p.3–4、式(1)–(4)）

```text
ER     = EM_BL - EM_PJ
EM_BL  = Σ(area_ha × EF_m0[kg_CH4-C/ha/year] × (16/12) × GWP_CH4 × 0.001)
EM_PJ  = Σ(area_ha × EF_m1[kg_CH4-C/ha/year] × (16/12) × GWP_CH4 × 0.001)
EF_m1  = 0.7 × EF_m0               ← 提示Ver.3.3 p.8 式(8)のみ
```

上の `0.7` は条件を満たした場合の**Ver.3.3提示仕様上の係数**であって、すべての圃場で実測メタンが正確に30%減るという科学的主張ではない。v3.5でもそのまま有効とは推定しない。研究用テスト `2ha × (100−70) × (16/12) × 30 ÷1000 = 2.4 tCO₂e` ではEFの**単位をkg-CH₄-C**に固定する。既存の[AG-005研究用簡易CLI](ag005-research-engine.md)の架空 `kg_CH4/ha/season` 入力とは別式であり、換算なしで混ぜない。

### 2.2 NID係数を選ぶ複合キー（pp.5–6）

`inventory_edition, factor_year, region, drainage, water_management, organic` を全て固定。対象年度の係数と検証申請時に適用すべきNID版の選定規則を別に持ち、未確認なら `CONFIG_REQUIRED`。

`referenceFactorSelector` は**SYNTHETIC係数表にのみ作用する検証用 lookup**。実在のNID表の取り込み・証拠付き適用は未実装。実際の係数のないところへ仮値を生成しない。

### 2.3 稲わら・堆肥係数（pp.7–8、式(5)–(7)）

記号：`E0`=無施用、`Es`=稲わら、`Ec`=堆肥、`w`=すき込み率[%]、`x`=堆肥[t/10a]。

| 条件 | 参考計算 |
| --- | --- |
| どちらもなし | `E0` |
| 稲わらのみ、0＜w＜90 | `E0+(Es−E0)×w/90` |
| 稲わらのみ、w≥90 | `Es` |
| 堆肥のみ、0＜x＜1 | `E0+(Ec−E0)×x` |
| 堆肥のみ、x≥1 | `Ec` |
| 両方あり | `min(E0+(Es−E0)×min(w,90)/90+(Ec−E0)×min(x,1),max(Es,Ec))` |

(0 le w le 100)、(x ge 0)。w＞90やx＞1は計算上の上限を守りつつ **`HUMAN_REVIEW_REQUIRED`**。原典に記載の稲わら発生量・持ち出し量からwを推定する部分は原本参照が必要で未実装。土壌移動・換地特則も自動的には推定しない。

### 2.4 排水性（提示Ver.3.3 p.7）

`d*=1.22×observed_mm_day`。

- `d*＜7.5`：`POOR_DRAINAGE`
- `7.5≤d*＜12.5`：`DAILY_DRAINAGE`
- `12.5≤d*`：`FOUR_HOUR_DRAINAGE`

無降雨24時間、流入口/排水口閉鎖、実測記録、客観的証憑が不足すれば **`EVIDENCE_REQUIRED`**、計算上の `class_if_admissible` を `selected_official_class` に昇格させない。デフォルト排水性も実際の参照係数を比較する必要があるため `CONFIG_REQUIRED`。固定カテゴリの押しつけはしない。

### 2.5 中干し日数（提示Ver.3.3 pp.1–2）

過去2栽培回以上の中干し期間（**これは実装上の下限であり、公式要件の独立確定ではない**）について、各栽培回の包含日数を数え、全栽培回の平均を**切り上げ**。実施中干し終了日を`出穂日の前日`までに切り詰め、包含日数で `project_days` を算出。

```text
baseline_days = ceil(sum(historical_crop_cycle_days) / number_of_crop_cycles)
project_days  = inclusive_days(start, min(actual_end, heading_date-1))
reference_extension = project_days - baseline_days
reference_day_check = reference_extension >= 7
```

複数期作では「各年度平均の再平均」を避ける。結果の `REFERENCE_DAYS_PASS` は**制度適格性を意味しない**。資料・持続可能性審査が欠ければ `EVIDENCE_REQUIRED`。

### 2.6 合筆按分（提示Ver.3.3 p.2）

旧圃場別の面積aᵢと合筆後面積Aに対して `A_alloc_i=A×a_i/Σa_i` の参考配分を実装。旧地番・過去水管理履歴を失わず、地図証憑と土壌移動の確認が無ければ `EVIDENCE_REQUIRED`。揃っても制度上の特則・端数処理が未検証なので `HUMAN_REVIEW_REQUIRED` まで。

## 3. 原典・結果の機械可読区別

| 種別 | 実装 | 返す数値 | 未確認部分 |
| --- | --- | --- | --- |
| `AG-005@3.5` | [方法論Pack](../src/methodology-packs.js) | **無し（UNSUPPORTED）** | 全採用版・差分・NID・施行日 |
| `AG005_V33_REFERENCE` | [有理数参照計算](../src/ag005-v33-reference-math.mjs) | **合成値のみ、研究用試算** | 正式適用・係数・丸め |
| `AG005_RESEARCH_SCENARIO` | [既存CLI](../scripts/ag005-engine.mjs) | **仮定の単位変換プレビュー** | 個別圃場・公式係数・認証 |
| `CERTIFIED_AMOUNT` | **未実装** | **null** | 外部制度証明が必須 |

合成計算で `2.4tCO₂e` の期待値を得ても、`certified_tco2e` は出さない。NID正式係数、GWP・丸め、実際の農家証憑が未取得のため、実案件のJ-クレジット算定エンジンは完成していない。

## 4. GX-ETS：完全に分離された燃料CO₂

[GX-ETS fuel research](../src/gxets-fuel-research.mjs) のドメインは `GX_ETS`、NaFTのAG-005は `J_CREDIT_AG005`。混合不可。

```text
FUEL_COMBUSTION only:
Q_fuel [t, kL, 1000m3] × HV [GJ/fuel-unit] × CF [tC/GJ] × 44/12
= indicative tCO2
```

これは提示されたMETIマニュアル燃焼由来の**参考式のみ**。燃料種・数量単位・発熱量の単位・係数・組織境界を検査する。購入電力、還元剤、工業プロセス、副生燃料、制度上の排出枠・償却クレジット等は処理せず、`UNSUPPORTED` / `HUMAN_REVIEW_REQUIRED`。結果は `official_reportable_tco2:null`、第三者確認 `false`。SHK系の購入電力をGX-ETS直接排出に無条件加算しない。

## 5. 変更影響解析 — NaFT固有の核

`method_version`, `inventory_edition`, `factor_year`, `gwp_version`, `organic_material`, `drainage_measurement`, `midseason_dates`, `field_geometry`, `field_lineage`, `raw_evidence_bytes`, `human_review_decision` に変化があれば、**研究用の再検証候補**として記録。

証憑ハッシュ不整合は `UNSUPPORTED`。判断入力の変更により旧人手レビューを失効候補へ戻す。正式なclaim-impact判定にするには原典からレビュー済みの依存マッピングが必要。Sepoliaの既存P1/P2証跡はパッケージの**ハッシュと系譜**のみ示し、観測真正性や制度認証は示さない。

## 6. 受入テストとコマンド

```bash
node tests/ag005-v33-gxets.test.mjs
node tests/ag005-engine.test.mjs
bash tests/run.sh
```

テストは `AG-DAY-01/02/03`、`AG-ORG-01〜04`、`AG-DRN-01〜04`、`AG-LAND-01`、`AG-FACT-01`、`AG-VERSION-01`、`AG-TAMPER-01`、`GX-FUEL-01/02`、`GX-BOUND-01` の提示仕様に対応。境界計算は二進浮動小数の近似等号ではなく、10進入力の有理数評価を採用する。

**リリースに必要な未完了作業**：Ver.3.5公式バイト・SHA-256、原典版差分と経過措置、NID正式原本と複合係数、農水省Excelとの独立同値テスト、丸め・地番按分レビュー、適法に取得した圃場証憑、GX-ETS制度境界検証と第三者監査。これらが揃うまで `certification_allowed:false` を維持。

## 7. 今回実装したものと未実装のもの

**実装済み**：ソースロックJSON、閉じたVer.3.5 Pack、Ver.3.3提示式の有理数参照演算、日数・有機物・排水・合筆の境界、合成係数選択、依存差分、GX-ETS燃料式分離、回帰テスト。

**未実装**：制度認証版での係数解決、農地生データへの自動適用、公式制度上の環境・社会配慮審査と証明書発行、原典PDFの本変更での独立ダウンロード、NID Excelの実データ取得、適用版に応じた認証値の算定。

**元リポジトリ `Takzin1/NaFT` は変更せず、IEEE Editionだけを変更する。**
