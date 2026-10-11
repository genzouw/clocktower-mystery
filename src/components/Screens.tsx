import { Fragment, useState } from 'react'
import { detectiveRank, totals, type PuzzleStat } from '../game/score'
import type { Scenario } from '../game/types'
import { ScoreSummary, ScoreTable } from './ScoreTable'
import './Screens.css'

export function TitleScreen({
  scenario,
  hasProgress,
  onStart,
  onReset,
  onBack,
}: {
  scenario: Scenario
  hasProgress: boolean
  onStart: () => void
  onReset: () => void
  /** シナリオの一覧へ戻る */
  onBack: () => void
}) {
  const [confirmingReset, setConfirmingReset] = useState(false)
  return (
    <div className="screen title-screen">
      <div className="title-emoji">{scenario.titleEmoji}</div>
      <h1>
        {scenario.titleLines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </h1>
      <p className="lead">
        {scenario.lead.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </p>
      <button className="btn primary big" onClick={onStart}>
        {hasProgress ? 'つづきから' : '館に入る'}
      </button>
      {hasProgress && !confirmingReset && (
        <button className="btn ghost" onClick={() => setConfirmingReset(true)}>
          はじめから
        </button>
      )}
      {confirmingReset && (
        <div className="reset-confirm" role="alertdialog" aria-label="はじめからの確認">
          <p>この事件の進行を消して、最初から始めます。よろしいですか？</p>
          <button className="btn danger" onClick={onReset}>
            進行を消して始める
          </button>
          <button className="btn ghost" onClick={() => setConfirmingReset(false)}>
            やめる
          </button>
        </div>
      )}
      <button className="btn ghost" onClick={onBack}>
        事件ファイルへ戻る
      </button>
      <div className="howto">
        <h3>遊び方</h3>
        <ul>
          {scenario.howto.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function EndingScreen({
  scenario,
  stats,
  onRestart,
  onBack,
}: {
  scenario: Scenario
  stats: PuzzleStat[]
  onRestart: () => void
  /** シナリオの一覧へ戻る */
  onBack: () => void
}) {
  const sum = totals(stats)
  const rank = detectiveRank(scenario, sum)
  const { ending } = scenario
  return (
    <div className="screen ending-screen">
      <div className="title-emoji">🎉</div>
      <h1>事件解決！</h1>
      <p className="lead">犯人は {ending.culprit} だった。</p>
      <div className="explain">
        <h3>推理のまとめ</h3>
        <ol>
          {ending.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>{ending.epilogue}</p>
      </div>
      <section className="result" aria-labelledby="result-title">
        <h3 id="result-title">捜査の成績</h3>
        <p className="rank">
          あなたは <b>{rank.title}</b>
        </p>
        <p className="rank-comment">{rank.comment}</p>
        <ScoreSummary totals={sum} puzzleCount={stats.length} />
        <details className="result-detail">
          <summary>謎ごとの内訳を見る</summary>
          <ScoreTable stats={stats} />
        </details>
      </section>
      <button className="btn primary big" onClick={onRestart}>
        もう一度遊ぶ
      </button>
      <button className="btn ghost" onClick={onBack}>
        事件ファイルへ戻る
      </button>
    </div>
  )
}
