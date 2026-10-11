import { useEffect, useRef, useState } from 'react'
import { isCorrect } from '../game/answer'
import { missingTitles } from '../game/hotspot'
import type { Puzzle, PuzzleId, Scenario } from '../game/types'
import { Dialog } from './Dialog'
import { Figure } from './Figure'
import { focusKindOf, shouldSubmitOnEnter } from './puzzleInput'
import './PuzzleModal.css'

interface Props {
  scenario: Scenario
  puzzle: Puzzle
  /** これまでに解いた謎（手がかりがそろっているかの判定に使う） */
  solvedIds: PuzzleId[]
  /** 一度でも開いた謎（hidden のシナリオで題名を伏せる判定に使う） */
  seenIds: PuzzleId[]
  hintsUsed: number
  mistakes: number
  onSolve: () => void
  onHint: () => void
  onMistake: () => void
  onClose: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓']

/** 選択肢がこの数以上なら 2 列に並べる */
const TWO_COLUMN_FROM = 6

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function PuzzleModal({
  scenario,
  puzzle,
  solvedIds,
  seenIds,
  hintsUsed,
  mistakes,
  onSolve,
  onHint,
  onMistake,
  onClose,
}: Props) {
  const [input, setInput] = useState('')
  // 誤答のたびに増やす。0 のときは知らせを出さない。入力を変えると 0 に戻す
  const [wrongCount, setWrongCount] = useState(0)
  // この画面で正解したか（開き直したときの「解決済み」と、錠が開く演出を分ける）
  const [justSolved, setJustSolved] = useState(false)
  const slotsRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLInputElement>(null)
  const solvedTitleRef = useRef<HTMLHeadingElement>(null)
  const lastHintRef = useRef<HTMLLIElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)
  const prevHints = useRef(hintsUsed)

  const solved = solvedIds.includes(puzzle.id)
  const missing = missingTitles(scenario, puzzle.id, seenIds, solvedIds)
  const answerable = missing.length === 0

  const submit = (value: string) => {
    if (isCorrect(puzzle, value)) {
      setWrongCount(0)
      setJustSolved(true)
      onSolve()
      return
    }
    onMistake()
    setWrongCount((n) => n + 1)
    // 同じ誤答が続いても毎回揺らすため、CSS ではなく Web Animations で再生する（動きを減らす設定では揺らさない）
    if (!prefersReducedMotion()) {
      answerRef.current?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-8px)' },
          { transform: 'translateX(8px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 400, easing: 'ease-out' },
      )
    }
    if (puzzle.kind === 'code') {
      setInput('')
      slotsRef.current?.focus({ preventScroll: true })
    } else if (puzzle.kind === 'text') {
      textRef.current?.focus({ preventScroll: true })
      textRef.current?.select()
    }
  }

  const pressKey = (key: string) => {
    if (puzzle.kind !== 'code') return
    if (key === '✓') {
      submit(input)
      return
    }
    setWrongCount(0)
    if (key === '⌫') setInput((v) => v.slice(0, -1))
    else if (input.length < puzzle.length) setInput((v) => v + key)
  }

  // 数字錠は、キーボードの数字・Backspace・Enter でも入力できる
  useEffect(() => {
    if (puzzle.kind !== 'code' || solved || !answerable) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      if (e.key >= '0' && e.key <= '9' && e.key.length === 1) {
        e.preventDefault()
        pressKey(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        pressKey('⌫')
      } else if (
        e.key === 'Enter' &&
        // 桁がそろっていれば、ヒントのボタンにフォーカスがあっても送信を優先する。
        // 画面キーと × は、そのボタン自身の操作に任せる
        shouldSubmitOnEnter(input.length, puzzle.length, focusKindOf(document.activeElement))
      ) {
        e.preventDefault()
        pressKey('✓')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  // 正解したら、結果の見出しへフォーカスを移す（押したキーが消えてフォーカスが失われるため）
  useEffect(() => {
    if (justSolved && solved) solvedTitleRef.current?.focus({ preventScroll: true })
  }, [justSolved, solved])

  // ヒントを開いたら、開いたヒントが見える位置までスクロールする
  useEffect(() => {
    if (hintsUsed > prevHints.current) {
      lastHintRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    }
    prevHints.current = hintsUsed
  }, [hintsUsed])

  // この謎を解くと見つかる手がかり（他の謎の問題文に加わる文）
  const foundClues = Object.values(scenario.puzzles).flatMap((p) =>
    (p.clues ?? []).filter((c) => c.from === puzzle.id).map((c) => c.text),
  )
  const reward = puzzle.reward ? scenario.evidence[puzzle.reward] : null

  const hintMax = puzzle.hints.length
  const canAnswer = !solved && answerable

  const footer = solved ? (
    <button type="button" className="btn primary pz-close" onClick={onClose}>
      閉じる
    </button>
  ) : !answerable ? (
    <button type="button" className="btn pz-close" onClick={onClose}>
      閉じる
    </button>
  ) : (
    <div ref={answerRef} className={`pz-answer pz-answer-${puzzle.kind}`}>
      {/* 誤答の知らせは、読み上げにも届くよう領域を常に置いておく */}
      <p className="pz-feedback" role="status">
        {wrongCount > 0 && (
          // key を誤答のたびに変え、同じ誤答が続いても読み上げが再度届くようにする。
          // 淡く現れる動きは初回だけ付け、2 回目以降は見た目を変えない
          <span key={wrongCount} className={`pz-wrong ${wrongCount === 1 ? 'is-enter' : ''}`}>
            違うようだ……もう一度考えてみよう
          </span>
        )}
      </p>
      {puzzle.kind === 'code' && (
        <>
          <div
            ref={slotsRef}
            className={`pz-slots ${wrongCount > 0 ? 'is-wrong' : ''}`}
            role="group"
            aria-label={`入力中の数字 ${input.length}/${puzzle.length} 桁`}
            tabIndex={-1}
          >
            {Array.from({ length: puzzle.length }, (_, i) => (
              <span key={i} className={`pz-slot ${i === input.length ? 'is-next' : ''}`}>
                {input[i] ?? ''}
              </span>
            ))}
          </div>
          <div className="pz-keypad">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={`pz-key ${k === '✓' ? 'is-enter' : ''}`}
                onClick={() => pressKey(k)}
                disabled={k === '✓' && input.length !== puzzle.length}
                aria-label={k === '⌫' ? '1 つ消す' : k === '✓' ? '決定' : undefined}
              >
                {k}
              </button>
            ))}
          </div>
        </>
      )}
      {puzzle.kind === 'choice' && (
        <div
          className={`pz-choices ${puzzle.choices.length >= TWO_COLUMN_FROM ? 'is-two-column' : ''}`}
        >
          {puzzle.choices.map((c) => (
            <button key={c} type="button" className="btn pz-choice" onClick={() => submit(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      {puzzle.kind === 'text' && (
        <form
          className={`pz-text ${wrongCount > 0 ? 'is-wrong' : ''}`}
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
        >
          <input
            ref={textRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setWrongCount(0)
            }}
            placeholder={puzzle.placeholder}
            aria-label="答え"
            autoComplete="off"
            enterKeyHint="done"
          />
          <button type="submit" className="btn primary" disabled={!input.trim()}>
            答える
          </button>
        </form>
      )}
    </div>
  )

  return (
    <Dialog
      className="puzzle-dialog"
      title={puzzle.title}
      onClose={onClose}
      meta={
        <p className="pz-stats">
          <span>
            <span aria-hidden="true">💡 </span>ヒント {hintsUsed}/{hintMax}
          </span>
          <span className={mistakes > 0 ? 'has-mistakes' : ''}>
            <span aria-hidden="true">✕ </span>誤答 {mistakes} 回
          </span>
        </p>
      }
      footer={footer}
    >
      {solved && (
        <section className={`pz-solved ${justSolved ? 'is-fresh' : ''}`}>
          <div className="pz-solved-head">
            <span className="pz-lock" aria-hidden="true">
              🔓
            </span>
            <h3 ref={solvedTitleRef} tabIndex={-1}>
              {justSolved ? '錠が開いた' : '解決済み'}
            </h3>
          </div>
          {puzzle.solvedText && <p>{puzzle.solvedText}</p>}
          {reward && (
            <div className="pz-record">
              <p className="pz-record-label">手帳に記録した証拠</p>
              <b>{reward.title}</b>
              <p>{reward.text}</p>
            </div>
          )}
          {foundClues.length > 0 && (
            <div className="pz-record">
              <p className="pz-record-label">見つけた手がかり</p>
              <ul>
                {foundClues.map((text) => (
                  <li key={text}>
                    <span aria-hidden="true">🔎 </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="pz-section" aria-labelledby="pz-question-label">
        <h3 id="pz-question-label" className="pz-label">
          問題
        </h3>
        <div className="pz-paper">
          {puzzle.question.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </section>

      {puzzle.figure && (
        <section className="pz-section pz-figure" aria-label="図版">
          <Figure figure={puzzle.figure} />
        </section>
      )}

      {puzzle.clues && (
        <section className="pz-section" aria-labelledby="pz-clues-label">
          <h3 id="pz-clues-label" className="pz-label">
            手がかり
          </h3>
          <ul className="pz-clues">
            {puzzle.clues.map((c) =>
              solvedIds.includes(c.from) ? (
                <li key={c.from} className="pz-clue is-found">
                  <span aria-hidden="true">🔎 </span>
                  {c.text}
                </li>
              ) : (
                <li key={c.from} className="pz-clue is-missing">
                  <span aria-hidden="true">？？？ </span>まだ見つけていない手がかり
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {!solved && !answerable && (
        <section className="pz-section pz-locked">
          <h3 className="pz-locked-title">
            <span aria-hidden="true">🔒 </span>まだ答えられない
          </h3>
          <p>手がかりが足りない。先に次の謎を解こう。</p>
          <ul>
            {missing.map((m) => (
              <li key={m.id}>{m.title}</li>
            ))}
          </ul>
        </section>
      )}

      {canAnswer && (
        <section className="pz-section" aria-labelledby="pz-hints-label">
          <h3 id="pz-hints-label" className="pz-label">
            ヒント
          </h3>
          {hintsUsed > 0 && (
            <ol className="pz-hints">
              {puzzle.hints.slice(0, hintsUsed).map((h, i) => (
                <li key={i} ref={i === hintsUsed - 1 ? lastHintRef : undefined}>
                  <span className="pz-hint-step">
                    ヒント {i + 1}/{hintMax}
                  </span>
                  <p>{h}</p>
                </li>
              ))}
            </ol>
          )}
          {hintsUsed < hintMax ? (
            <button type="button" className="btn pz-hint-button" onClick={onHint}>
              <span>
                ヒント {hintsUsed + 1}/{hintMax} を見る
              </span>
              <span className="pz-pips" aria-hidden="true">
                {Array.from({ length: hintMax }, (_, i) => (i < hintsUsed ? '●' : '○')).join('')}
              </span>
            </button>
          ) : (
            <p className="pz-note">ヒントはすべて開いた。</p>
          )}
          {hintsUsed === 0 && (
            <p className="pz-note">ヒントを見ると、探偵ランクの評価に数えられる。</p>
          )}
        </section>
      )}
    </Dialog>
  )
}
