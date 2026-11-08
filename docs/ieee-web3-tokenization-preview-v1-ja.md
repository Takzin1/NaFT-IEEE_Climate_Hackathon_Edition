# NaFT Web3 Token Preview v1｜設計・運用境界（2026-11-08）

**研究用オフラインシミュレーター。現実の炭素クレジットや法的請求権を発行・売買・移転しない。**

## なぜ別のレイヤーが必要か

NaFT Core の certified_tco2e=null と Blue Carbon Edition の researchOnly=true は、観測・計算の再現性に関わる。排出削減クレジットの権利の存在、制度登録、保管・ロック、同意や償却とは独立している。

既存の NaFTMRVAnchor.sol は検査用ハッシュ・来歴アンカーであり、トークン契約でもクレジット発行契約でもない。既存契約は変更せず、scripts/ieee-tokenization-research-preview.mjs を追加した。

三つのレイヤー:

1. **Scientific MRV**: 元データ、計算式、出典・版、ハッシュ、HITLレビュー、未確定研究推計。
2. **Registry/Rights Gate**: 登録簿上の独立した発行単位・シリアル・ステータス・権利帰属・制度同意を確認する権限系（本番未接続）。
3. **Token Representation**: 権利の有効な裏付けが確認された後で初めてERC-1155やERC-721と登録簿を同期する（本番未実装）。ERC規格だけでは環境便益・所有権を創出できない。

## V1の二つのモード

### RESEARCH_ESTIMATE

科学的推計値は固定小数の文字列として読めるが、simulated_token_reference_count=0、simulated_eligible_tco2e=0、production_mint_authorized=false、transaction_submitted=false。研究値を「1 tCO2e = 1正式Credit」に勝手に繰り上げない。

### SYNTHETIC_REGISTRY

再現コマンド:

    node scripts/ieee-tokenization-research-preview.mjs fixtures/ieee-tokenization-synthetic-v1.json
    node --test tests/ieee-tokenization-research-preview.test.mjs

レジストリは NAFT-SYNTHETIC-REGISTRY のみ、シリアルは SYN- で始まる架空番号のみ受け付ける。許可状態は SIMULATION_ONLY_NOT_LEGAL_CONSENT に固定。Verra、Gold StandardやJ-クレジットを名乗るレジストリを通さない。

**個別単位の判定**:

    candidate(serial) = (state == MOCK_ISSUED)
                     AND (custody == MOCK_LOCKED)
                     AND (duplicate_claim_flag == false)

    simulated_reference_count = sum(candidate)
    simulated_tco2e = sum(candidate * denomination_microtonnes) / 10^6
    gross_JPY = simulated_reference_count * assumed_price_per_registry_unit_JPY
    fee_JPY = ceil(gross_JPY * assumed_fee_basis_points / 10000)
    net_JPY = gross_JPY - fee_JPY

- 重複シリアルは例外で拒否。retired/cancelled/revoked/unlocked/double-claimed は候補から除外。
- 仮想ERC-1155のIDはシリアル別ハッシュ。一つのIDあたり仮想供給数1、**実発行数0**。この形式は実際の譲渡権の存在や権利保管の証明ではない。
- tCO2eは小数6桁の文字列からBigIntに変換。JPYは整数で手数料を切り上げる。入力単位は各制度の正式なcredit単位とは必ずしも同一ではない。
- 価格は**ユーザーが仮定したシナリオ価格**。市場価格・売買注文・実行可能な見積ではない。
- JSONに含まれるSHA256は内部の整合性用。外部登録簿真正性、環境効果、書面の許諾を裏付けない。
- RPC、秘密鍵、署名、実Mint/Burn/Transfer、認証済みtCO2eの生成は**存在しない**。

## 本番化前の未完了ゲート

1. 登録簿・シリアル・発行、保有、ロック状態を登録簿の正本/API/権利者書面と照合。
2. 制度固有の発行単位、譲渡・無効化請求、二重発行/二重使用防止、制度運営者の同意を確認。
3. 登録簿とオンチェーンのMint/Burn/Retirementの一対一対応。事故や登録取消の対応と復旧設計。
4. J-クレジット・Verra・Gold Standardごとに準拠法、表示義務、会計/税務、投資家保護、デジタル資産に係る規制を個別評価。
5. 人間の承認、権限分離、署名、重放送防止、キーカストディ、監査済みスマートコントラクト、緊急停止。
6. 外部署名・情報確認を公開ログと混同しない。公開データに個人情報・秘密の証憑原文を含めない。

## 原資料と論文

- [Verra: Crypto Instruments and Tokens (2022)](https://verra.org/verra-addresses-crypto-instruments-and-tokens/) — retired credits に基づくトークン作成を禁止する方針。現行規約を別途確認。
- [Gold Standard: Conditions for tokenisation](https://www.goldstandard.org/consultations/conditions-for-consenting-to-tokenisation-of-gold-standard-issued-credits) — 書面同意を求める枠組み。
- [ICVCM Core Carbon Principles](https://www.icvcm.org/core-carbon-principles/) — 登録簿追跡、二重計上防止、独立した検証。
- [J-クレジットのトークン化に関する分析の公表（2025年）](https://www.nishimura.com/ja/knowledge/newsletters/finance_law_web3_metaverse_251111) — 権利の性質・最小取引単位・認証前トークンの法的論点。
- [金融庁・カーボンクレジット金融インフラ検討会](https://www.fsa.go.jp/news/r5/singi/20240604.html)
- [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) / [ERC-721](https://eips.ethereum.org/EIPS/eip-721) / [EIP-712](https://eips.ethereum.org/EIPS/eip-712)
- Swinkels (2024), [Trading carbon credit tokens on the blockchain](https://doi.org/10.1016/j.iref.2024.01.012).
- Liu et al. (2026), [A blockchain-based carbon registry platform for credible climate action in transportation](https://doi.org/10.1038/s44168-026-00342-w).

本資料は技術研究の前提整理。制度の最新版、登録簿契約、法務専門家の判断を置き換えない。NaFTを規格運営者の承認済みシステムと称さない。
