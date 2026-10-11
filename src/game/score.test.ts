import { describe, expect, it } from 'vitest'
import { clocktower } from './scenarios/clocktower'
import { detectiveRank, puzzleStats, statusView, totals } from './score'
import { parseSave } from './storage'
import { initialState, reducerFor, type Action, type GameState } from './state'

const PUZZLES = clocktower.puzzles
const reducer = reducerFor(clocktower)
const play = (actions: Action[], from: GameState = initialState(clocktower)) =>
  actions.reduce(reducer, from)

describe('ヒントと誤答の記録', () => {
  it('手がかりがそろっていない謎は解いたことにならない', () => {
    // 第3の謎は第4の謎の手がかりが必要
    expect(play([{ type: 'solve', id: 'p3' }]).solved).toEqual([])
    expect(
      play([
        { type: 'solve', id: 'p4' },
        { type: 'solve', id: 'p3' },
      ]).solved,
    ).toEqual(['p4', 'p3'])
  })

  it('誤答は謎ごとに数え、解いた後の入力は数えない', () => {
    const s = play([
      { type: 'mistake', id: 'p1' },
      { type: 'mistake', id: 'p1' },
      { type: 'mistake', id: 'p2' },
      { type: 'solve', id: 'p1' },
      { type: 'mistake', id: 'p1' },
    ])
    expect(s.mistakes).toEqual({ p1: 2, p2: 1 })
  })

  it('ヒントは謎に用意された数より多くは数えない', () => {
    const max = PUZZLES.p1.hints.length
    const s = play(Array.from({ length: max + 3 }, () => ({ type: 'hint', id: 'p1' }) as const))
    expect(s.hintsUsed.p1).toBe(max)
  })

  it('はじめからやり直すと記録も消える', () => {
    const s = play([{ type: 'hint', id: 'p3' }, { type: 'mistake', id: 'p3' }, { type: 'reset' }])
    expect(s.hintsUsed).toEqual({})
    expect(s.mistakes).toEqual({})
  })

  it('誤答の記録が無い古い保存データも読み込める', () => {
    const old = JSON.stringify({
      started: true,
      room: 'study',
      solved: ['p1'],
      hintsUsed: { p1: 1 },
    })
    const s = parseSave(old, clocktower)
    expect(s.mistakes).toEqual({})
    expect(s.hintsUsed).toEqual({ p1: 1 })
    expect(s.room).toBe('study')
    expect(parseSave('{壊れたデータ', clocktower)).toEqual(initialState(clocktower))
  })
})

describe('成績の集計', () => {
  it('謎ごとの内訳と合計を出す', () => {
    const s = play([
      { type: 'hint', id: 'p1' },
      { type: 'hint', id: 'p1' },
      { type: 'mistake', id: 'p2' },
      { type: 'solve', id: 'p1' },
    ])
    const stats = puzzleStats(clocktower, s)
    expect(stats).toHaveLength(10)
    expect(stats[0]).toMatchObject({
      number: '第1の謎',
      name: '靴箱の数字錠',
      solved: true,
      hints: 2,
      mistakes: 0,
    })
    expect(stats[1]).toMatchObject({ solved: false, hints: 0, mistakes: 1 })
    expect(totals(stats)).toEqual({ solved: 1, hints: 2, hintsMax: 20, mistakes: 1 })
  })

  it('ヒントと誤答の合計で探偵ランクが決まる', () => {
    expect(detectiveRank(clocktower, { hints: 0, mistakes: 0 }).title).toBe('名探偵')
    expect(detectiveRank(clocktower, { hints: 3, mistakes: 2 }).title).toBe('敏腕探偵')
    expect(detectiveRank(clocktower, { hints: 10, mistakes: 5 }).title).toBe('探偵')
    expect(detectiveRank(clocktower, { hints: 20, mistakes: 1 }).title).toBe('探偵見習い')
  })
})

describe('開いた謎の記録（seen）', () => {
  it('謎の画面を開くと記録され、同じ謎を重ねて記録しない', () => {
    const s = play([
      { type: 'open', id: 'p5' },
      { type: 'open', id: 'p5' },
    ])
    expect(s.seen).toEqual(['p5'])
  })

  it('解いた謎も開いた謎として記録し、はじめからで消える', () => {
    const s = play([{ type: 'solve', id: 'p1' }])
    expect(s.seen).toEqual(['p1'])
    expect(play([{ type: 'reset' }], s).seen).toEqual([])
  })

  it('この項目の無い古い保存データも読み込める', () => {
    const old = JSON.stringify({ started: true, room: 'study', solved: ['p1'] })
    expect(parseSave(old, clocktower).seen).toEqual(['p1'])
    expect(parseSave(JSON.stringify({ started: true }), clocktower).seen).toEqual([])
  })
})

describe('目印を伏せるシナリオの成績表', () => {
  const hidden = { ...clocktower, hotspotMarkers: 'hidden' as const }
  const state = (over: Partial<GameState>) => ({ ...initialState(clocktower), ...over })

  it('visible では、開いていない謎も題名を出す', () => {
    const stats = puzzleStats(clocktower, state({}))
    expect(stats[0].name).not.toBe('？？？')
    expect(stats.every((s) => s.name !== '？？？')).toBe(true)
  })

  it('hidden では、一度も開いていない謎の名前を「？？？」にする', () => {
    const stats = puzzleStats(hidden, state({ seen: ['p2'], solved: ['p1'] }))
    const byId = Object.fromEntries(stats.map((s) => [s.id, s]))
    expect(byId.p1.name).toBe(puzzleStats(clocktower, state({})).find((s) => s.id === 'p1')!.name)
    expect(byId.p2.name).not.toBe('？？？')
    expect(byId.p3.name).toBe('？？？')
    expect(byId.p3.number).toBe('？')
  })

  it('hidden では、開いていない謎に状態（記号・挑戦できる・手がかり不足）を出さない', () => {
    const stats = puzzleStats(hidden, state({ seen: ['p2'], solved: ['p1'] }))
    const byId = Object.fromEntries(stats.map((s) => [s.id, s]))
    // 開いていない謎は、手がかり不足でも挑戦できる状態でも同じ（伏せる）
    expect(statusView(byId.p3)).toEqual({ mark: '', label: undefined })
    expect(statusView(byId.p3)).toEqual(statusView(byId.p4))
    // 解いた謎・開いた謎は従来どおり
    expect(statusView(byId.p1)).toEqual({ mark: '✔', label: '解決済み' })
    expect(statusView(byId.p2).label).toMatch(/挑戦できる|手がかり不足/)
  })

  it('visible では、全ての謎に従来どおりの状態を出す', () => {
    const stats = puzzleStats(clocktower, state({ solved: ['p1'] }))
    expect(stats.every((s) => !s.concealed)).toBe(true)
    expect(statusView(stats.find((s) => s.id === 'p1')!)).toEqual({ mark: '✔', label: '解決済み' })
    expect(stats.find((s) => s.id === 'p3')!.locked).toBe(true)
    expect(statusView(stats.find((s) => s.id === 'p3')!)).toEqual({
      mark: '🔒',
      label: '手がかり不足',
    })
    expect(statusView(stats.find((s) => s.id === 'p2')!)).toEqual({
      mark: '・',
      label: '挑戦できる',
    })
  })
})
