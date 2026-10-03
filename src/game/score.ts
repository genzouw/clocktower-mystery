import { PUZZLES, PUZZLE_ORDER, isUnlocked } from './puzzles'
import type { GameState } from './state'
import type { PuzzleId } from './types'

export interface PuzzleStat {
  id: PuzzleId
  /** 「第1の謎」などの番号部分 */
  number: string
  /** 「靴箱の数字錠」などの名前部分 */
  name: string
  solved: boolean
  /** 手がかりが足りず、まだ答えられない */
  locked: boolean
  hints: number
  hintsMax: number
  mistakes: number
}

export interface ScoreTotals {
  solved: number
  hints: number
  hintsMax: number
  mistakes: number
}

export function puzzleStats(
  state: Pick<GameState, 'solved' | 'hintsUsed' | 'mistakes'>,
): PuzzleStat[] {
  return PUZZLE_ORDER.map((id) => {
    const [number, name = ''] = PUZZLES[id].title.split('　')
    return {
      id,
      number,
      name,
      solved: state.solved.includes(id),
      locked: !state.solved.includes(id) && !isUnlocked(id, state.solved),
      hints: state.hintsUsed[id] ?? 0,
      hintsMax: PUZZLES[id].hints.length,
      mistakes: state.mistakes[id] ?? 0,
    }
  })
}

export function totals(stats: PuzzleStat[]): ScoreTotals {
  return stats.reduce(
    (t, s) => ({
      solved: t.solved + (s.solved ? 1 : 0),
      hints: t.hints + s.hints,
      hintsMax: t.hintsMax + s.hintsMax,
      mistakes: t.mistakes + s.mistakes,
    }),
    { solved: 0, hints: 0, hintsMax: 0, mistakes: 0 },
  )
}

/** ヒントと誤答の合計から決まる探偵ランク */
export function detectiveRank(t: Pick<ScoreTotals, 'hints' | 'mistakes'>): {
  title: string
  comment: string
} {
  const penalty = t.hints + t.mistakes
  if (penalty === 0) return { title: '名探偵', comment: 'ヒントも誤答もなし。完璧な推理だ。' }
  if (penalty <= 5) return { title: '敏腕探偵', comment: 'ほとんど迷わずに真相へたどり着いた。' }
  if (penalty <= 15) return { title: '探偵', comment: '粘り強く手がかりを集めて事件を解決した。' }
  return { title: '探偵見習い', comment: '次はヒントを控えめにして挑戦してみよう。' }
}
