import { useState } from 'react'
import { isCorrect } from '../game/answer'
import { missingTitles } from '../game/hotspot'
import type { Puzzle, PuzzleId, Scenario } from '../game/types'
import { Figure } from './Figure'

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
  const [wrong, setWrong] = useState(false)
  const solved = solvedIds.includes(puzzle.id)
  const missing = missingTitles(scenario, puzzle.id, seenIds, solvedIds)
  const answerable = missing.length === 0

  const submit = (value: string) => {
    if (isCorrect(puzzle, value)) {
      setWrong(false)
      onSolve()
    } else {
      onMistake()
      setWrong(true)
      // 同じ不正解を続けても揺れ演出が再生されるよう、少し後に解除する
      window.setTimeout(() => setWrong(false), 600)
      if (puzzle.kind === 'code') setInput('')
    }
  }

  const pressKey = (key: string) => {
    if (puzzle.kind !== 'code') return
    if (key === '⌫') setInput((v) => v.slice(0, -1))
    else if (key === '✓') submit(input)
    else if (input.length < puzzle.length) setInput((v) => v + key)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal puzzle ${wrong ? 'shake' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <h2>{puzzle.title}</h2>
        <p className="puzzle-stats">
          <span>
            💡 ヒント {hintsUsed}/{puzzle.hints.length}
          </span>
          <span className={mistakes > 0 ? 'has-mistakes' : ''}>✕ 誤答 {mistakes} 回</span>
        </p>
        <div className="question">
          {puzzle.question.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <Figure figure={puzzle.figure} />
        {puzzle.clues && (
          <div className="clues">
            <h3>手がかり</h3>
            <ul>
              {puzzle.clues.map((c) =>
                solvedIds.includes(c.from) ? (
                  <li key={c.from} className="clue found">
                    🔎 {c.text}
                  </li>
                ) : (
                  <li key={c.from} className="clue missing">
                    ？？？ まだ見つけていない手がかり
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        {solved ? (
          <div className="solved-box">
            <p className="solved-mark">解決済み ✔</p>
            {puzzle.solvedText && <p>{puzzle.solvedText}</p>}
            <button className="btn primary" onClick={onClose}>
              閉じる
            </button>
          </div>
        ) : !answerable ? (
          <div className="locked-box">
            <p className="locked-title">🔒 まだ答えられない</p>
            <p>手がかりが足りない。先に次の謎を解こう。</p>
            <ul>
              {missing.map((m) => (
                <li key={m.id}>{m.title}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {puzzle.kind === 'code' && (
              <div className="code-input">
                <div className="code-slots">
                  {Array.from({ length: puzzle.length }, (_, i) => (
                    <span key={i} className="code-slot">
                      {input[i] ?? ''}
                    </span>
                  ))}
                </div>
                <div className="keypad">
                  {KEYS.map((k) => (
                    <button
                      key={k}
                      className={`key ${k === '✓' ? 'enter' : ''}`}
                      onClick={() => pressKey(k)}
                      disabled={k === '✓' && input.length !== puzzle.length}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {puzzle.kind === 'choice' && (
              <div className="choices">
                {puzzle.choices.map((c) => (
                  <button key={c} className="btn choice" onClick={() => submit(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {puzzle.kind === 'text' && (
              <form
                className="text-input"
                onSubmit={(e) => {
                  e.preventDefault()
                  submit(input)
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={puzzle.placeholder}
                  autoComplete="off"
                  enterKeyHint="done"
                />
                <button className="btn primary" type="submit" disabled={!input.trim()}>
                  答える
                </button>
              </form>
            )}
            {wrong && <p className="wrong">違うようだ……</p>}

            <div className="hints">
              {puzzle.hints.slice(0, hintsUsed).map((h, i) => (
                <p key={i} className="hint">
                  💡 ヒント{i + 1}：{h}
                </p>
              ))}
              {hintsUsed < puzzle.hints.length && (
                <button className="btn ghost" onClick={onHint}>
                  ヒントを見る（{hintsUsed + 1}/{puzzle.hints.length}）
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
