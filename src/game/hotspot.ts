import { isUnlocked } from './scenario'
import type { Hotspot, HotspotMarkers, PuzzleId, Scenario } from './types'

/** 目印の出し方。省略したシナリオは、従来どおり visible */
export function markersOf(scenario: Pick<Scenario, 'hotspotMarkers'>): HotspotMarkers {
  return scenario.hotspotMarkers ?? 'visible'
}

/** この物を、謎のある物として扱うか。concealed の物は、前提を解くまで普通の物 */
export function puzzleOf(
  scenario: Scenario,
  hotspot: Pick<Hotspot, 'puzzle' | 'concealed'>,
  solved: PuzzleId[],
): PuzzleId | null {
  const id = hotspot.puzzle
  if (id === undefined) return null
  if (hotspot.concealed && !isUnlocked(scenario, id, solved)) return null
  return id
}

/** 物をタップしたときの動き。謎の画面を開くか、説明文を見せるか */
export type HotspotAction = { kind: 'puzzle'; id: PuzzleId } | { kind: 'look' }

export function hotspotAction(
  scenario: Scenario,
  hotspot: Pick<Hotspot, 'puzzle' | 'concealed'>,
  solved: PuzzleId[],
): HotspotAction {
  const id = puzzleOf(scenario, hotspot, solved)
  return id === null ? { kind: 'look' } : { kind: 'puzzle', id }
}

/** 3D 空間での物の見た目（台座の輪と名札） */
export interface HotspotAppearance {
  /** 名札の先頭に付ける文字。無ければ空文字 */
  prefix: string
  /** 名札の色。undefined なら既定の色 */
  labelColor: string | undefined
  /** 台座の輪。出さないなら null */
  ringColor: string | null
  /** 輪を脈動させるか（挑戦できる謎だけ） */
  pulse: boolean
}

const PLAIN: HotspotAppearance = {
  prefix: '',
  labelColor: undefined,
  ringColor: null,
  pulse: false,
}

/**
 * 物の見た目を決める。
 * hidden のシナリオと、謎として扱わない物（謎が無い物・前提が未解決の concealed）は、
 * 輪も接頭辞も色の違いも出さず、同じ見た目にする
 */
export function hotspotAppearance(
  scenario: Scenario,
  hotspot: Pick<Hotspot, 'puzzle' | 'concealed'>,
  solved: PuzzleId[],
): HotspotAppearance {
  if (markersOf(scenario) === 'hidden') return PLAIN
  const id = puzzleOf(scenario, hotspot, solved)
  if (id === null) return PLAIN
  if (solved.includes(id))
    return { prefix: '【解決】', labelColor: '#7cc49a', ringColor: '#7cc49a', pulse: false }
  if (!isUnlocked(scenario, id, solved))
    return { prefix: '【手がかり不足】', labelColor: '#9a8f86', ringColor: '#9a8f86', pulse: false }
  return { prefix: '【謎】', labelColor: '#e0b354', ringColor: '#e0b354', pulse: true }
}

/** 一度も開いていない謎の題名を伏せるか（目印を伏せるシナリオだけ） */
export function isTitleHidden(
  scenario: Pick<Scenario, 'hotspotMarkers'>,
  seen: PuzzleId[],
  solved: PuzzleId[],
  id: PuzzleId,
): boolean {
  return markersOf(scenario) === 'hidden' && !seen.includes(id) && !solved.includes(id)
}
