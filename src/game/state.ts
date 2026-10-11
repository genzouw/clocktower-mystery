import { isUnlocked } from './scenario'
import type { EvidenceId, PuzzleId, RoomId, Scenario } from './types'

export interface GameState {
  started: boolean
  room: RoomId
  visited: RoomId[]
  solved: PuzzleId[]
  evidence: EvidenceId[]
  /** 謎ごとに開いたヒントの数 */
  hintsUsed: Partial<Record<PuzzleId, number>>
  /** 謎ごとに答えを間違えた回数 */
  mistakes: Partial<Record<PuzzleId, number>>
  cleared: boolean
}

export function initialState(scenario: Scenario): GameState {
  return {
    started: false,
    room: scenario.startRoom,
    visited: [scenario.startRoom],
    solved: [],
    evidence: [...scenario.initialEvidence],
    hintsUsed: {},
    mistakes: {},
    cleared: false,
  }
}

export type Action =
  | { type: 'start' }
  | { type: 'move'; to: RoomId }
  | { type: 'solve'; id: PuzzleId }
  | { type: 'collect'; id: EvidenceId }
  | { type: 'hint'; id: PuzzleId }
  | { type: 'mistake'; id: PuzzleId }
  | { type: 'reset' }

function addUnique<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list : [...list, item]
}

/** シナリオごとの進行ロジック（謎の解放条件・報酬・最後の謎）を持った reducer を作る */
export function reducerFor(scenario: Scenario) {
  return function reducer(state: GameState, action: Action): GameState {
    switch (action.type) {
      case 'start':
        return { ...state, started: true }
      case 'move':
        return {
          ...state,
          room: action.to,
          visited: addUnique(state.visited, action.to),
        }
      case 'solve': {
        // 手がかりがそろっていない謎は解けない（画面側でも入力させない）
        if (!isUnlocked(scenario, action.id, state.solved)) return state
        const reward = scenario.puzzles[action.id].reward
        return {
          ...state,
          solved: addUnique(state.solved, action.id),
          evidence: reward ? addUnique(state.evidence, reward) : state.evidence,
          cleared: state.cleared || action.id === scenario.finalPuzzle,
        }
      }
      case 'collect':
        return { ...state, evidence: addUnique(state.evidence, action.id) }
      case 'hint': {
        const used = state.hintsUsed[action.id] ?? 0
        if (used >= scenario.puzzles[action.id].hints.length) return state
        return { ...state, hintsUsed: { ...state.hintsUsed, [action.id]: used + 1 } }
      }
      case 'mistake':
        // 解いた後の入力は成績に含めない
        if (state.solved.includes(action.id)) return state
        return {
          ...state,
          mistakes: { ...state.mistakes, [action.id]: (state.mistakes[action.id] ?? 0) + 1 },
        }
      case 'reset':
        return { ...initialState(scenario), started: true }
    }
  }
}

// シナリオ 1 のキー。既存プレイヤーの進行を引き継ぐため、キーと保存形式は変えない
const STORAGE_KEY = 'clocktower-mystery:v1'

/** 保存データを読み込む。古い版で保存した項目の欠けたデータは初期値で補う */
export function parseSave(raw: string | null, scenario: Scenario): GameState {
  const initial = initialState(scenario)
  if (!raw) return initial
  try {
    return { ...initial, ...(JSON.parse(raw) as Partial<GameState>) }
  } catch {
    return initial
  }
}

export function loadState(scenario: Scenario): GameState {
  try {
    return parseSave(localStorage.getItem(STORAGE_KEY), scenario)
  } catch {
    return initialState(scenario)
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // プライベートブラウズ等で保存できなくても遊べるようにする
  }
}
