import { detectiveRank, puzzleStats, totals } from './score'
import { initialState, type GameState } from './state'
import type { Scenario } from './types'

/** 読み書きに使う localStorage 互換の入れ物。テストでは差し替える */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * 従来のキーと保存形式のまま読み書きするシナリオ。
 * 既存プレイヤーの進行を移行の処理なしで引き継ぎ、公開を戻したときの旧版からも読めるようにする
 */
export const LEGACY_SCENARIO_ID = 'clocktower'
const LEGACY_KEY = 'clocktower-mystery:v1'
/** 最後に選んだシナリオの ID を置くキー */
export const CURRENT_KEY = 'clocktower-mystery:current'

/** シナリオの進行を保存するキー */
export function saveKey(scenarioId: string): string {
  return scenarioId === LEGACY_SCENARIO_ID ? LEGACY_KEY : `clocktower-mystery:${scenarioId}:v1`
}

function defaultStore(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // ストレージへのアクセス自体が禁止されている環境
    return null
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** 配列から、文字列かつ許可された ID だけを（重複なく）残す */
function keepIds(value: unknown, allowed: Set<string>, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  return [...new Set(value.filter((v): v is string => typeof v === 'string' && allowed.has(v)))]
}

/** ID ごとの回数から、許可された ID と 0 以上の整数だけを残す */
function keepCounts(value: unknown, allowed: Set<string>): Record<string, number> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      ([k, v]) => allowed.has(k) && typeof v === 'number' && Number.isInteger(v) && v >= 0,
    ),
  ) as Record<string, number>
}

/**
 * 保存データを読み込む。
 * 古い版で保存した項目の欠けたデータは初期値で補い、
 * シナリオに存在しない部屋・謎・証拠の ID は取り除く（部屋が無ければ開始の部屋へ戻す）
 */
export function parseSave(raw: string | null, scenario: Scenario): GameState {
  const initial = initialState(scenario)
  if (!raw) return initial
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return initial
  }
  if (!isRecord(data)) return initial

  const merged = { ...initial, ...data } as GameState
  const roomIds = new Set(Object.keys(scenario.rooms))
  const puzzleIds = new Set(Object.keys(scenario.puzzles))
  const evidenceIds = new Set(Object.keys(scenario.evidence))

  const room =
    typeof merged.room === 'string' && roomIds.has(merged.room) ? merged.room : scenario.startRoom
  const visited = keepIds(merged.visited, roomIds, initial.visited)
  if (!visited.includes(room)) visited.push(room)
  const solved = keepIds(merged.solved, puzzleIds, initial.solved)

  return {
    ...merged,
    started: merged.started === true,
    room,
    visited,
    solved,
    evidence: keepIds(merged.evidence, evidenceIds, initial.evidence),
    hintsUsed: keepCounts(merged.hintsUsed, puzzleIds),
    mistakes: keepCounts(merged.mistakes, puzzleIds),
    // この項目が無い古い保存データは、解いた謎だけを開いたことにする
    seen: [...new Set([...keepIds(merged.seen, puzzleIds, []), ...solved])],
    // 最後の謎が解けていない保存データを「解決済み」として扱わない
    cleared: merged.cleared === true && solved.includes(scenario.finalPuzzle),
  }
}

export function loadState(
  scenario: Scenario,
  store: KeyValueStore | null = defaultStore(),
): GameState {
  try {
    return parseSave(store?.getItem(saveKey(scenario.id)) ?? null, scenario)
  } catch {
    return initialState(scenario)
  }
}

export function saveState(
  scenario: Scenario,
  state: GameState,
  store: KeyValueStore | null = defaultStore(),
): void {
  try {
    store?.setItem(saveKey(scenario.id), JSON.stringify(state))
  } catch {
    // プライベートブラウズ等で保存できなくても遊べるようにする
  }
}

/** 最後に選んだシナリオの ID。登録されていない ID（公開を戻した後など）は無いものとして扱う */
export function loadCurrent(
  scenarios: Scenario[],
  store: KeyValueStore | null = defaultStore(),
): string | null {
  try {
    const id = store?.getItem(CURRENT_KEY) ?? null
    return id !== null && scenarios.some((s) => s.id === id) ? id : null
  } catch {
    return null
  }
}

export function saveCurrent(
  scenarioId: string,
  store: KeyValueStore | null = defaultStore(),
): void {
  try {
    store?.setItem(CURRENT_KEY, scenarioId)
  } catch {
    // 保存できなくても遊べる
  }
}

/** 一覧のカードに出す、シナリオの進行状況 */
export type ScenarioStatus =
  | { kind: 'new' }
  | { kind: 'playing'; solved: number; total: number }
  | { kind: 'cleared'; rank: string }

export function scenarioStatus(scenario: Scenario, state: GameState): ScenarioStatus {
  if (state.cleared) {
    const sum = totals(puzzleStats(scenario, state))
    return { kind: 'cleared', rank: detectiveRank(scenario, sum).title }
  }
  // タイトル画面の「つづきから」を出す条件と同じ
  if (hasProgress(state)) {
    return { kind: 'playing', solved: state.solved.length, total: scenario.puzzleOrder.length }
  }
  return { kind: 'new' }
}

export function hasProgress(state: GameState): boolean {
  return state.solved.length > 0 || state.visited.length > 1
}
