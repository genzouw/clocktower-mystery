import { describe, expect, it } from 'vitest'
import { PUZZLES } from './puzzles'
import { detectiveRank, puzzleStats, totals } from './score'
import { initialState, parseSave, reducer, type Action, type GameState } from './state'

const play = (actions: Action[], from: GameState = initialState) => actions.reduce(reducer, from)

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
    const s = parseSave(old)
    expect(s.mistakes).toEqual({})
    expect(s.hintsUsed).toEqual({ p1: 1 })
    expect(s.room).toBe('study')
    expect(parseSave('{壊れたデータ')).toEqual(initialState)
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
    const stats = puzzleStats(s)
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
    expect(detectiveRank({ hints: 0, mistakes: 0 }).title).toBe('名探偵')
    expect(detectiveRank({ hints: 3, mistakes: 2 }).title).toBe('敏腕探偵')
    expect(detectiveRank({ hints: 10, mistakes: 5 }).title).toBe('探偵')
    expect(detectiveRank({ hints: 20, mistakes: 1 }).title).toBe('探偵見習い')
  })
})
