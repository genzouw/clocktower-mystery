export function TitleScreen({
  hasProgress,
  onStart,
  onReset,
}: {
  hasProgress: boolean
  onStart: () => void
  onReset: () => void
}) {
  return (
    <div className="screen title-screen">
      <div className="title-emoji">🕰️💎</div>
      <h1>
        時計塔の館と
        <br />
        星の涙
      </h1>
      <p className="lead">
        時任伯爵の館で、宝石「星の涙」が盗まれた。
        <br />
        館を歩き回り、10の謎を解いて犯人を突き止めよ。
      </p>
      <button className="btn primary big" onClick={onStart}>
        {hasProgress ? 'つづきから' : '館に入る'}
      </button>
      {hasProgress && (
        <button className="btn ghost" onClick={onReset}>
          はじめから
        </button>
      )}
      <div className="howto">
        <h3>遊び方</h3>
        <ul>
          <li>部屋の中の物をタップすると調べられる。光る物には謎がある</li>
          <li>画面端の矢印・下のボタン・スワイプで部屋を移動</li>
          <li>集めた証拠は「手帳」でいつでも見返せる</li>
          <li>進行状況はこの端末に自動で保存される</li>
        </ul>
      </div>
    </div>
  )
}

export function EndingScreen({
  hintsTotal,
  onRestart,
}: {
  hintsTotal: number
  onRestart: () => void
}) {
  return (
    <div className="screen ending-screen">
      <div className="title-emoji">🎉</div>
      <h1>事件解決！</h1>
      <p className="lead">犯人は 執事・佐伯 だった。</p>
      <div className="explain">
        <h3>推理のまとめ</h3>
        <ol>
          <li>金庫のダイヤルは左手で回されていた → 犯人は左利き。左利きは佐伯と蓮の2人だけ。</li>
          <li>書斎の時計が止まったのは 21時30分。その時刻、マルコは厨房、小春は音楽室にいた。</li>
          <li>温室の隠し棚に残った靴跡は 26cm。蓮の靴は 27cm。</li>
          <li>3つの条件をすべて満たすのは、佐伯ただ一人。</li>
        </ol>
        <p>
          観念した佐伯は、塔の大時計の振り子の中から「星の涙」を取り出した。館の時計の手入れを任されていた彼は、時計に細工がされていることにまでは気づかなかったのだ。
        </p>
      </div>
      <p className="score">使ったヒント：{hintsTotal} 回</p>
      <button className="btn primary big" onClick={onRestart}>
        もう一度遊ぶ
      </button>
    </div>
  )
}
