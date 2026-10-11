import { describe, expect, it } from 'vitest'
import {
  hotspotAction,
  hotspotAppearance,
  isTitleHidden,
  markersOf,
  missingTitles,
  solveToast,
  tapOutcome,
} from './hotspot'
import { cluesFrom } from './scenario'
import { clocktower } from './scenarios/clocktower'
import type { Hotspot, Scenario } from './types'

const visible: Scenario = clocktower
const hidden: Scenario = { ...clocktower, hotspotMarkers: 'hidden' }

// clocktower では p3 が p4 の手がかりを必要とする（p4 を解くまで答えられない）
const open: Pick<Hotspot, 'puzzle' | 'concealed'> = { puzzle: 'p1' }
const gated: Pick<Hotspot, 'puzzle' | 'concealed'> = { puzzle: 'p3' }
const concealed: Pick<Hotspot, 'puzzle' | 'concealed'> = { puzzle: 'p3', concealed: true }
const plain: Pick<Hotspot, 'puzzle' | 'concealed'> = {}

describe('markersOf', () => {
  it('省略したシナリオは visible、シナリオ 1 は明示的に visible', () => {
    expect(markersOf({})).toBe('visible')
    expect(markersOf(clocktower)).toBe('visible')
    expect(markersOf(hidden)).toBe('hidden')
  })
})

describe('hotspotAction', () => {
  it('謎のある物は謎の画面を開き、謎の無い物は説明を見せる', () => {
    expect(hotspotAction(visible, open, [])).toEqual({ kind: 'puzzle', id: 'p1' })
    expect(hotspotAction(visible, plain, [])).toEqual({ kind: 'look' })
  })

  it('concealed でない物は、前提が未解決でも謎の画面を開く', () => {
    expect(hotspotAction(visible, gated, [])).toEqual({ kind: 'puzzle', id: 'p3' })
  })

  it('concealed の物は、前提を解くまで説明だけを見せ、解いた後は謎の画面を開く', () => {
    expect(hotspotAction(visible, concealed, [])).toEqual({ kind: 'look' })
    expect(hotspotAction(visible, concealed, ['p1'])).toEqual({ kind: 'look' })
    expect(hotspotAction(visible, concealed, ['p4'])).toEqual({ kind: 'puzzle', id: 'p3' })
  })

  it('目印の設定に関わらず同じ判定になる', () => {
    expect(hotspotAction(hidden, concealed, [])).toEqual({ kind: 'look' })
    expect(hotspotAction(hidden, concealed, ['p4'])).toEqual({ kind: 'puzzle', id: 'p3' })
  })
})

describe('hotspotAppearance', () => {
  it('visible: 謎の状態ごとに輪と名札の接頭辞・色が付く（従来どおり）', () => {
    expect(hotspotAppearance(visible, open, [])).toEqual({
      prefix: '【謎】',
      labelColor: '#e0b354',
      ringColor: '#e0b354',
      pulse: true,
    })
    expect(hotspotAppearance(visible, gated, [])).toEqual({
      prefix: '【手がかり不足】',
      labelColor: '#9a8f86',
      ringColor: '#9a8f86',
      pulse: false,
    })
    expect(hotspotAppearance(visible, open, ['p1'])).toEqual({
      prefix: '【解決】',
      labelColor: '#7cc49a',
      ringColor: '#7cc49a',
      pulse: false,
    })
  })

  it('visible: 謎の無い物は輪も接頭辞も出さない', () => {
    expect(hotspotAppearance(visible, plain, [])).toEqual({
      prefix: '',
      labelColor: undefined,
      ringColor: null,
      pulse: false,
    })
  })

  it('visible: 前提が未解決の concealed の物は、謎の無い物と同じ見た目になる', () => {
    expect(hotspotAppearance(visible, concealed, [])).toEqual(hotspotAppearance(visible, plain, []))
    // 前提を解くと、謎として見える
    expect(hotspotAppearance(visible, concealed, ['p4']).prefix).toBe('【謎】')
  })

  it('hidden: 謎のある物も解いた物も、謎の無い物と同じ見た目になる', () => {
    const none = hotspotAppearance(hidden, plain, [])
    expect(none.ringColor).toBeNull()
    expect(none.prefix).toBe('')
    for (const solved of [[], ['p1'], ['p4']]) {
      for (const h of [open, gated, concealed]) {
        expect(hotspotAppearance(hidden, h, solved)).toEqual(none)
      }
    }
  })
})

describe('isTitleHidden', () => {
  it('hidden のシナリオだけ、開いていない・解いていない謎を伏せる', () => {
    expect(isTitleHidden(hidden, [], [], 'p1')).toBe(true)
    expect(isTitleHidden(hidden, ['p1'], [], 'p1')).toBe(false)
    expect(isTitleHidden(hidden, [], ['p1'], 'p1')).toBe(false)
    expect(isTitleHidden(visible, [], [], 'p1')).toBe(false)
  })
})

describe('missingTitles（手がかり不足の画面の一覧）', () => {
  const title = clocktower.puzzles.p4.title

  it('visible では、足りない前提の題名をそのまま出す（変更前と同じ）', () => {
    expect(missingTitles(visible, 'p3', [], [])).toEqual([{ id: 'p4', title }])
    expect(missingTitles(visible, 'p3', [], ['p4'])).toEqual([])
  })

  it('hidden では、開いていない前提の題名を「？？？」にする', () => {
    expect(missingTitles(hidden, 'p3', [], [])).toEqual([{ id: 'p4', title: '？？？' }])
  })

  it('hidden でも、一度開いた前提の題名は出す', () => {
    expect(missingTitles(hidden, 'p3', ['p4'], [])).toEqual([{ id: 'p4', title }])
  })
})

describe('tapOutcome（物をタップした結果）', () => {
  const none = { solved: [], evidence: [] }

  it('謎のある物は謎の画面を開く', () => {
    expect(tapOutcome(visible, open, none)).toEqual({ kind: 'puzzle', id: 'p1' })
  })

  it('謎の無い物は説明を見せ、証拠があれば初回だけ新規として返す', () => {
    const h = { evidence: 'shoes' as const }
    expect(tapOutcome(visible, h, none)).toEqual({
      kind: 'look',
      collect: 'shoes',
      newEvidence: 'shoes',
    })
    expect(tapOutcome(visible, h, { solved: [], evidence: ['shoes'] })).toEqual({
      kind: 'look',
      collect: 'shoes',
      newEvidence: null,
    })
    expect(tapOutcome(visible, plain, none)).toEqual({
      kind: 'look',
      collect: null,
      newEvidence: null,
    })
  })

  it('前提が未解決の concealed の物は、謎の証拠を持っていても説明だけを見せる', () => {
    expect(tapOutcome(hidden, concealed, none).kind).toBe('look')
    expect(tapOutcome(hidden, concealed, { solved: ['p4'], evidence: [] })).toEqual({
      kind: 'puzzle',
      id: 'p3',
    })
  })
})

describe('solveToast', () => {
  // 手がかりを渡す謎を探す
  const giver = clocktower.puzzleOrder.find((id) => cluesFrom(clocktower, id).length > 0)!
  const receiver = cluesFrom(clocktower, giver)[0]

  it('visible では、手がかりを得た謎の題名を出す（変更前と同じ）', () => {
    expect(solveToast(visible, giver)).toContain(
      `「${clocktower.puzzles[receiver].title}」の手がかりを見つけた`,
    )
  })

  it('hidden では、題名も手がかりの内容も出さず、中立の文にする', () => {
    const text = solveToast(hidden, giver)
    expect(text).toContain('手がかりを見つけた。手帳に記録した')
    expect(text).not.toContain(clocktower.puzzles[receiver].title)
    expect(text).not.toContain('別の謎')
  })

  it('hidden でも、手がかりを渡さない謎は中立の文も出さない', () => {
    const last = clocktower.puzzleOrder.find((id) => cluesFrom(clocktower, id).length === 0)!
    expect(solveToast(hidden, last)).not.toContain('手がかり')
  })
})
