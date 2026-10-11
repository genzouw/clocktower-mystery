import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { detectiveRank, totals, type PuzzleStat } from '../game/score'
import type { Scenario } from '../game/types'
import { endingScreenClass, revealOrder, revealTotalMs } from './endingReveal'
import { markerHowto, nextConfirming } from './hud'
import { ScoreSummary, ScoreTable } from './ScoreTable'
import './Screens.css'
import './Title.css'
import './Ending.css'

/** どのシナリオでも共通の、3D の操作の説明 */
const CONTROLS = [
  '左下のスティック（キーボードなら W・A・S・D）で歩く',
  '画面をドラッグ（キーボードなら ← →）で見回す',
  '近づいた物をタップして調べる。扉に近づくと隣の部屋へ進む',
]

/** 進行を消す操作の前に挟む確認（タイトルの「はじめから」とエンディングの「もう一度遊ぶ」で共用） */
function ResetConfirm({
  label,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  label: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="reset-confirm" role="alertdialog" aria-label={label}>
      <p>{message}</p>
      <button className="btn danger" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button className="btn ghost" onClick={onCancel}>
        やめる
      </button>
    </div>
  )
}

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
        <button
          className="btn ghost"
          onClick={() => setConfirmingReset((c) => nextConfirming(c, 'ask'))}
        >
          はじめから
        </button>
      )}
      {confirmingReset && (
        <ResetConfirm
          label="はじめからの確認"
          message="この事件の進行を消して、最初から始めます。よろしいですか？"
          confirmLabel="進行を消して始める"
          onConfirm={onReset}
          onCancel={() => setConfirmingReset((c) => nextConfirming(c, 'cancel'))}
        />
      )}
      <button className="btn ghost" onClick={onBack}>
        事件ファイルへ戻る
      </button>
      <div className="howto">
        <h3>遊び方</h3>
        <ul>
          {[...CONTROLS, markerHowto(scenario), ...scenario.howto].map((item) => (
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
  const [confirmingRestart, setConfirmingRestart] = useState(false)
  // 結末 → 推理のまとめ（1 項目ずつ）→ 後日談 → 成績 の順に、--i の順番で現れる。ボタン群は最初から見える。
  // 動きを減らす設定では Ending.css が一度に表示する。「全部すぐ表示」か画面のタップで、途中でも全表示にできる
  const step = (i: number) => ({ '--i': i }) as CSSProperties
  const order = revealOrder(ending.steps.length)
  const [revealed, setRevealed] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), revealTotalMs(ending.steps.length))
    return () => window.clearTimeout(t)
  }, [ending.steps.length])
  const skip = () => {
    setRevealed(true)
    // 押したボタンが消えるので、フォーカスを見出しへ移す
    headingRef.current?.focus()
  }
  return (
    // 画面のタップは、キーボード操作の「全部すぐ表示」ボタンの補助
    <div className={endingScreenClass(revealed)} onClick={() => setRevealed(true)}>
      <div className="title-emoji">🎉</div>
      <h1 ref={headingRef} tabIndex={-1}>
        事件解決！
      </h1>
      {!revealed && (
        <button
          className="btn ghost ending-skip"
          onClick={(e) => {
            e.stopPropagation()
            skip()
          }}
        >
          全部すぐ表示
        </button>
      )}
      <p className="lead reveal" style={step(order.lead)}>
        犯人は {ending.culprit} だった。
      </p>
      <div className="explain">
        <h3 className="reveal" style={step(order.heading)}>
          推理のまとめ
        </h3>
        <ol>
          {ending.steps.map((text, n) => (
            <li key={text} className="reveal" style={step(order.step(n))}>
              {text}
            </li>
          ))}
        </ol>
        <p className="reveal" style={step(order.epilogue)}>
          {ending.epilogue}
        </p>
      </div>
      <section className="result reveal" style={step(order.result)} aria-labelledby="result-title">
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
      <div className="ending-actions">
        {!confirmingRestart && (
          <button
            className="btn primary big"
            onClick={() => setConfirmingRestart((c) => nextConfirming(c, 'ask'))}
          >
            もう一度遊ぶ
          </button>
        )}
        {confirmingRestart && (
          <ResetConfirm
            label="もう一度遊ぶ前の確認"
            message="この事件の進行と成績を消して、最初から遊びます。よろしいですか？"
            confirmLabel="進行を消して遊ぶ"
            onConfirm={onRestart}
            onCancel={() => setConfirmingRestart((c) => nextConfirming(c, 'cancel'))}
          />
        )}
        <button className="btn ghost" onClick={onBack}>
          事件ファイルへ戻る
        </button>
      </div>
    </div>
  )
}
