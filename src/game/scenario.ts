import type { PuzzleId, Scenario } from './types'

/** この謎に答えるために先に解いておく謎（手がかりの出どころを含む） */
export function prerequisites(scenario: Scenario, id: PuzzleId): PuzzleId[] {
  const p = scenario.puzzles[id]
  return [...new Set([...(p.requires ?? []), ...(p.clues ?? []).map((c) => c.from)])]
}

/** 必要な謎をすべて解いていれば答えられる */
export function isUnlocked(scenario: Scenario, id: PuzzleId, solved: PuzzleId[]): boolean {
  return prerequisites(scenario, id).every((p) => solved.includes(p))
}

/** この謎を解くと手がかりが見つかる謎 */
export function cluesFrom(scenario: Scenario, id: PuzzleId): PuzzleId[] {
  return scenario.puzzleOrder.filter((p) => scenario.puzzles[p].clues?.some((c) => c.from === id))
}
