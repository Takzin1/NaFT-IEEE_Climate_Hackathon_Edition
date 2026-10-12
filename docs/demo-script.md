# 未踏アドバンスト審査用デモ — 合成入力のみ

公開版は `https://takzin1.github.io/NaFT/#/reviewer-demo`。ローカルでは `naft-app.html#/reviewer-demo` または `index.html#/reviewer-demo` を開く。ビルド不要。

## 60秒 Reviewer Demo

1. **「100 Claim変更影響実験を実行」**を押す。
2. この画面は `NAFT-SYNTHETIC@1 → @2` の合成方法論変更であり、AG-005制度評価ではない。v2では`stratum=intensive`にだけ追加rule `extended`（`intensive_min_days=9`）とsensor Evidence要件が加わる。
3. fixture構成はstandard 70 / intensive（sensorなし）15 / intensive_complete（sensorあり）15。**30 / 70は性能指標ではなく、このfixture構成に由来する。fixture構成を変えれば比率も変わる。** 画面で以下を確認する。
   - 変更候補：100
   - 再検証対象：30
   - 影響なし：70
   - 自動再評価：15
   - 追加証憑が必要：15
4. 70件が非影響なのは、fixture内のstandard 70件がv2のintensive専用変更に依存しないためである。**時間・費用・精度が70%改善したという意味でも、実制度の再検証率が70%になるという予測でもない**。
5. 代表Claimを開き、なぜ影響なし／自動再評価／追加証憑不足なのか、依存関係と後継パッケージ（Successor Package）の有無を確認する。
6. **「人間判断のstale化を見る」**で、入力fingerprintまたはMethodology Pack hashが変わると、変更前の人間判断を最終宣誓へ再利用できないことを確認する。
7. hard error（UNSUPPORTED / EVIDENCE_REQUIRED / 改変検知 / 方法論不一致等）は人間判断で上書きできない。

Reviewer Demoと `tests/mitou-impact.test.js` は、同じ100 Claim生成規則と `analyzeImpact` を共有する。100 / 30 / 70 / 15 / 15はpresentation-only constantsではない。

## Three-minute research UI

Keep Demo actor as Operator. All three Compiler demos explicitly use invented data, not real farmer observations or official methodology transitions.

1. **Demo A — ~45 sec.** Press “Demo A · Evidence → draft”. Evidence hashes, JSON normalization, identity/version/date checks, deterministic rules/calculation and graph are computed automatically. AUTO_REEVALUATED appears with a draft hash. Download the draft, inspect methodology/rules/source/manifests/calculation/unresolved items. No approval is required to generate it.
2. **Demo B — ~60 sec.** Press “Demo B · version diff / impact”. This remains the lightweight six-Claim fixture: 6 candidates → 4 re-verifications → 1 automatic / 2 evidence required / 1 judgement; 2 unaffected. Claim IDs are listed; download full impact JSON with successor graphs. These counts are computed, not stored labels in the UI.
3. **Demo C — ~45 sec.** Press “Demo C · ambiguous → review”. HUMAN_REVIEW_REQUIRED appears. Open Human Review, switch to Reviewer, write an explicit reason and resolve the judgement exception. Hard failures and missing evidence cannot be accepted this way.

For final attestation, first use Maintainer on Methodology, select `NAFT-SYNTHETIC@1` (or 2 for an updated claim) and approve research Pack release with a reason. Return to Reviewer, provide final statement, check the acknowledgement and attest. Export the attested Package. This does not perform formal certification. A subsequent new run for that Claim makes the old current export stale.

For custom inputs use the Evidence page's Compiler JSON editor. Text/photo bytes and structured farm-log/IoT/GIS JSON adapters normalize bytes/structure, not environmental meaning. Unknown institutional configuration stops evaluation. The separate existing AG-005 reference workflow remains below the Compiler panel and retains its original constraints.

通常UIのhandler testsはDOM stubを含む。一方、Reviewer DemoについてはGitHub Actions上のheadless Chromeで375×812相当のviewportを設定し、button click後のmetric描画、first-viewの問い位置、横overflow、通常Methodology routeの横overflowまでsmoke検証する。File chooser / iOS Safari download / accessibility / persistence / responsive visual inspectionの全端末網羅 / 通常6 workflowの網羅QAは未実施。
