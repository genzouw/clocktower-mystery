// 移行中の仮の入り口。呼び出し側をシナリオ引数に切り替えたら削除する
import { cluesFrom as cf, isUnlocked as iu, prerequisites as pr } from './scenario'
import { clocktower } from './scenarios/clocktower'
import type { PuzzleId } from './types'

export const PUZZLES = clocktower.puzzles
export const PUZZLE_ORDER = clocktower.puzzleOrder
export const SUSPECTS = clocktower.suspects
export const prerequisites = (id: PuzzleId) => pr(clocktower, id)
export const isUnlocked = (id: PuzzleId, solved: PuzzleId[]) => iu(clocktower, id, solved)
export const cluesFrom = (id: PuzzleId) => cf(clocktower, id)
