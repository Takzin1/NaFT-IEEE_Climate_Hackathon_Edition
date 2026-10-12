'use strict';

var REVIEWER_DEMO_ROUTE='reviewer-demo';
var ReviewerDemo={impact:null,stale:null,message:''};

function mitouReviewerClaims() {
  var claims=[];
  for(var i=1;i<=100;i++) {
    var variant=i<=70?'standard':i<=85?'intensive':'intensive_complete';
    claims.push(syntheticClaim('MITOU-'+String(i).padStart(3,'0'),variant));
  }
  return claims;
}

function reviewerFixtureComposition(claims) {
  claims=claims||mitouReviewerClaims();
  var out={standard:0,intensive_missing_sensor:0,intensive_complete:0};
  claims.forEach(function(c) {
    var intensive=c.activity.stratum==='intensive';
    var hasSensor=(c.evidence||[]).some(function(e) { return e.category==='sensor'; });
    if(!intensive) out.standard++;
    else if(hasSensor) out.intensive_complete++;
    else out.intensive_missing_sensor++;
  });
  return out;
}

function reviewerRelevantMethodologyChanges() {
  var oldPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'],nextPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@2'];
  var diff=compareMethodologyVersions(oldPack,nextPack);
  return {
    changed_rules:diff.changed_rules.map(function(x) { return x.id; }),
    changed_evidence_requirements:diff.changed_evidence_requirements.map(function(x) { return x.id; }),
    changed_parameters:diff.changed_parameters.map(function(x) { return x.id; }),
    summary:'v2ではstratum=intensiveのClaimに対して、追加ルール extended（intensive_min_days=9）とsensor証憑要件が加わります。standard Claimにはこの追加条件は適用されません。'
  };
}

function runMitouReviewerExperiment(claims) {
  return analyzeImpact(
    claims||mitouReviewerClaims(),
    {type:'methodology',old_key:'NAFT-SYNTHETIC@1',new_key:'NAFT-SYNTHETIC@2'}
  );
}

function reviewerRepresentativeRows(impact) {
  if(!impact) return [];
  var wanted=['UNAFFECTED','AUTO_REEVALUATED','EVIDENCE_REQUIRED'];
  return wanted.map(function(status) {
    return impact.claims.find(function(row) { return row.status===status; });
  }).filter(Boolean);
}

function reviewerImpactExplanation(row) {
  if(!row) return null;
  var successor=row.successor&&row.successor.document;
  return {
    claim_id:row.claim_id,
    transition:'NAFT-SYNTHETIC@1 → @2',
    candidate_because:row.reasons,
    requires_reverification:row.requires_reverification,
    status:row.status,
    active_dependency_result:row.requires_reverification
      ? 'このClaimが実際に依存するルール・条件の意味が変わったため、再検証します。'
      : '方法論の版は変わりましたが、このClaimが実際に依存するルール・条件は変わっていません。',
    affected_nodes:row.affected_nodes,
    previous_package_hash:row.previous_package_hash,
    previous_package_stale:row.previous_package_stale,
    successor_exists:!!row.successor,
    successor_package_hash:row.successor?row.successor.package_hash:null,
    supersedes:successor
      ? successor.provenance_graph.edges.filter(function(e) { return e.type==='supersedes'; })
      : []
  };
}

function runReviewerStaleProof(decision) {
  var oldInput=syntheticClaim('MITOU-STALE','ambiguous');
  var oldPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@1'];
  var oldFingerprint=inputFingerprint(oldInput),oldPackHash=hashObject(oldPack);
  var changed=clone(oldInput);
  changed.activity.methodology_version='2';
  changed.evidence=changed.evidence.map(function(e) {
    return Object.assign({},e,{methodology_version:'2'});
  });
  var nextPack=COMPILER_REGISTRY['NAFT-SYNTHETIC@2'];
  var nextFingerprint=inputFingerprint(changed),nextPackHash=hashObject(nextPack);
  return {
    decision:decision||'ACCEPT',
    exception_code:'FIELD_IDENTITY_AMBIGUOUS',
    old_binding:{input_fingerprint:oldFingerprint,pack_hash:oldPackHash},
    changed_binding:{input_fingerprint:nextFingerprint,pack_hash:nextPackHash},
    stale:oldFingerprint!==nextFingerprint||oldPackHash!==nextPackHash,
    enforcement:'入力fingerprintまたは方法論Pack hashが変わると、以前の人間判断はSTALE_REVIEWとして再利用できません。hard errorは人間判断で上書きできません。'
  };
}

function reviewerMetric(label,value,note) {
  return '<div class="metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note||'')+'</small></div>';
}

function reviewerRepresentativeCard(row) {
  var d=reviewerImpactExplanation(row);
  return '<details class="card impact-detail"><summary><b>'+esc(d.claim_id)+'</b> · '+esc(d.status)+'</summary>'+
    '<p><b>再検証:</b> '+esc(d.requires_reverification?'必要':'不要')+'</p>'+
    '<p>'+esc(d.active_dependency_result)+'</p>'+
    '<p><b>変更理由:</b> '+esc(d.candidate_because.join(', ')||'none')+'</p>'+
    '<p><b>後継パッケージ:</b> '+esc(d.successor_exists?'生成あり':'生成なし')+'</p>'+
    '<p><b>影響を受ける依存ノード数:</b> '+esc(d.affected_nodes.length)+'</p>'+
    '<details><summary>依存関係・パッケージ詳細</summary>'+jsonView(d)+'</details>'+
  '</details>';
}

function pgReviewerDemo() {
  var impact=ReviewerDemo.impact,composition=reviewerFixtureComposition(),changes=reviewerRelevantMethodologyChanges();
  var out='<section class="card reviewer-hero"><span class="eyebrow">未踏アドバンスト審査用デモ</span>'+
    '<h2>方法論が変わったとき、過去100件のClaimのうち何を再検証するか？</h2>'+
    '<p class="reviewer-boundary"><b>この画面は合成方法論 <code>NAFT-SYNTHETIC@1 → @2</code> の研究デモです。AG-005の制度評価ではありません。</b></p>'+
    '<div class="reviewer-step"><b>① 何が変わった？</b><p>'+esc(changes.summary)+'</p></div>'+
    '<div class="reviewer-step"><b>② 全100件を再検証するのか？ → いいえ。</b><p>③ NaFTは、変更されたルールと各Claimの依存関係を比較し、必要なものだけを再検証します。</p></div>'+
    '<div class="reviewer-composition"><b>この合成fixtureの構成</b><p>standard '+esc(composition.standard)+'件 / intensive（sensorなし） '+esc(composition.intensive_missing_sensor)+'件 / intensive_complete（sensorあり） '+esc(composition.intensive_complete)+'件。</p><p class="muted"><b>30 / 70 は性能指標ではありません。</b> このfixtureをstandard 70件 / intensive（sensorなし）15件 / intensive_complete（sensorあり）15件で構成しているため、この比率になっています。fixture構成を変えれば30 / 70も変わります。実制度の再検証率を予測するものではありません。</p></div>'+
    button('100 Claim変更影響実験を実行','reviewer-run',false)+
    '<p class="muted">合成実験（Synthetic engineering experiment）のみ · 正式認証・実制度での性能保証ではありません。</p></section>';

  if(!impact) {
    out+='<section class="card"><h3>このボタンが行うこと</h3><p>申請書で示した100 Claim合成改定実験と同じ生成規則・同じ変更影響解析（Impact Analysis）をブラウザ上で再計算します。100 / 30 / 70 / 15 / 15 は固定表示ではなく計算結果です。</p></section>';
  } else {
    var c=impact.counts;
    out+='<section class="card"><span class="eyebrow">ブラウザ上で再計算</span><h2>④ 変更影響の計算結果</h2>'+
      '<div class="metric-grid">'+
        reviewerMetric('変更候補',c.potentially_affected,'方法論変更の候補集合')+
        reviewerMetric('再検証対象',c.require_reverification,'後継パッケージ生成対象')+
        reviewerMetric('影響なし',c.UNAFFECTED,'後継パッケージを生成しない')+
        reviewerMetric('自動再評価',c.AUTO_REEVALUATED,'決定論的に再評価')+
        reviewerMetric('追加証憑が必要',c.EVIDENCE_REQUIRED,'不足証憑のため停止')+
      '</div>'+
      '<div class="notice"><b>この70件は、fixture内のstandard 70件がv2のintensive専用変更に依存しないため非影響となった合成結果です。</b><br>fixture構成を変えれば30 / 70も変わります。時間・費用・精度が70%改善したという意味ではなく、実制度の再検証率を予測するものでもありません。</div>'+
      '<h3>⑤ なぜ30件だけなのか</h3><p>standard 70件にはv2で追加されたintensive専用条件が適用されないため影響なし。intensive系30件だけが再検証対象になります。</p><p><b>30件の内訳：</b>sensorを既に持つintensive_complete 15件は自動再評価、sensorを持たないintensive 15件は追加証憑不足で停止します。</p><div class="notice"><b>⑥ 安全側の境界：</b>根拠不明・追加証憑不足・未対応条件は勝手に通しません。</div>'+
      reviewerRepresentativeRows(impact).map(reviewerRepresentativeCard).join('')+
      button('変更影響JSONをダウンロード','reviewer-export',false)+
      '</section>';
  }

  out+='<section class="card"><span class="eyebrow">人間判断（Human Decision）の束縛</span><h2>⑦ 変更前の人間判断は、変更後に使い回さない</h2>'+
    '<p>人間判断はClaim / Run / 例外 / input fingerprint / 方法論パック（Methodology Pack）hashへ束縛します。入力またはPackが変われば、以前の判断はstale（失効）です。</p>'+
    '<label>例として記録する判断<select id="reviewer-decision"><option>ACCEPT</option><option>REJECT</option><option>NEED_MORE_EVIDENCE</option><option>ABSTAIN</option></select></label>'+
    button('人間判断のstale化を見る','reviewer-stale',false);
  if(ReviewerDemo.stale) {
    out+='<div class="notice"><b>STALE = '+esc(ReviewerDemo.stale.stale)+'</b> · '+esc(ReviewerDemo.stale.decision)+' は変更前input/Packへの判断であり、変更後の最終宣誓へ再利用できません。</div>'+
      '<details><summary>束縛差分を見る</summary>'+jsonView(ReviewerDemo.stale)+'</details>';
  }
  out+='<p class="muted">UNSUPPORTED / EVIDENCE_REQUIRED / 改変検知 / 方法論不一致 / 決定論的失敗などのhard errorは、人間判断で上書きできません。</p></section>';

  out+='<section class="card"><h3>60秒で見る順番</h3><ol>'+
    '<li>方法論 v1 → v2 が変わる</li>'+
    '<li>100 Claimを変更候補として確認する</li>'+
    '<li>再検証30件 / 影響なし70件を根拠付きで分ける</li>'+
    '<li>追加証憑が必要な15件は停止する</li>'+
    '<li>変更前の人間判断は変更後にstale化する</li>'+
    '<li>Claimごとの依存関係グラフ（Provenance Graph）と後継パッケージ理由を確認する</li>'+
    '</ol><p><a href="#/methodologies">通常の6ステップ研究UIへ →</a></p></section>';
  return out;
}

function handleReviewerAction(action) {
  if(action==='reviewer-run') {
    ReviewerDemo.impact=runMitouReviewerExperiment();
    ReviewerDemo.message='100 Claimの合成変更影響解析を完了しました。';
  }
  if(action==='reviewer-export'&&ReviewerDemo.impact) {
    downloadJSON(canonicalize(ReviewerDemo.impact),'naft-mitou-reviewer-impact.json');
  }
  if(action==='reviewer-stale') {
    var el=document.getElementById('reviewer-decision');
    ReviewerDemo.stale=runReviewerStaleProof(el?el.value:'ACCEPT');
  }
}
