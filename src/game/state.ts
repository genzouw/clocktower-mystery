import { PUZZLES } from './puzzles'
import type { EvidenceId, PuzzleId, RoomId } from './types'

export interface GameState {
  started: boolean
  room: RoomId
  visited: RoomId[]
  solved: PuzzleId[]
  evidence: EvidenceId[]
  /** 謎ごとに開いたヒントの数 */
  hintsUsed: Partial<Record<PuzzleId, number>>
  cleared: boolean
}

export const initialState: GameState = {
  started: false,
  room: 'hall',
  visited: ['hall'],
  solved: [],
  evidence: ['case'],
  hintsUsed: {},
  cleared: false,
}

export type Action =
  | { type: 'start' }
  | { type: 'move'; to: RoomId }
  | { type: 'solve'; id: PuzzleId }
  | { type: 'collect'; id: EvidenceId }
  | { type: 'hint'; id: PuzzleId }
  | { type: 'reset' }

function addUnique<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list : [...list, item]
}

export function reducer(state: GameState, action: Action): GameState {
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
      const reward = PUZZLES[action.id].reward
      return {
        ...state,
        solved: addUnique(state.solved, action.id),
        evidence: reward ? addUnique(state.evidence, reward) : state.evidence,
        cleared: state.cleared || action.id === 'p10',
      }
    }
    case 'collect':
      return { ...state, evidence: addUnique(state.evidence, action.id) }
    case 'hint':
      return {
        ...state,
        hintsUsed: {
          ...state.hintsUsed,
          [action.id]: (state.hintsUsed[action.id] ?? 0) + 1,
        },
      }
    case 'reset':
      return { ...initialState, started: true }
  }
}

const STORAGE_KEY = 'clocktower-mystery:v1'

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialState, ...(JSON.parse(raw) as Partial<GameState>) } : initialState
  } catch {
    return initialState
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // プライベートブラウズ等で保存できなくても遊べるようにする
  }
}
