import { describe, expect, it } from 'vitest'
import { isCorrect, normalize } from './answer'
import { isUnlocked as isUnlockedIn, prerequisites as prerequisitesIn } from './scenario'
import { clocktower } from './scenarios/clocktower'
import type { PuzzleId } from './types'

const { puzzles: PUZZLES, puzzleOrder: PUZZLE_ORDER, evidence: EVIDENCE, rooms: ROOMS } = clocktower
const SUSPECTS = clocktower.suspects
const isUnlocked = (id: PuzzleId, solved: PuzzleId[]) => isUnlockedIn(clocktower, id, solved)
const prerequisites = (id: PuzzleId) => prerequisitesIn(clocktower, id)

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((x, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
  )
}

// 謎の答えが問題文の条件から一意に決まることを総当たりで確かめる
describe('謎の解が一意に決まる', () => {
  it('第1の謎：数字錠', () => {
    const found: string[] = []
    for (let n = 0; n <= 9999; n++) {
      const [a, b, c, d] = String(n).padStart(4, '0').split('').map(Number)
      if (new Set([a, b, c, d]).size !== 4) continue
      if (a === 2 * b && c === a + b && d === c - 1 && a + b + c + d === 17)
        found.push(`${a}${b}${c}${d}`)
    }
    expect(found).toEqual([PUZZLES.p1.kind === 'code' && PUZZLES.p1.answer])
  })

  it('第2の謎：席順', () => {
    const people = ['執事', 'メイド', '庭師', '料理人', '甥']
    const valid = permutations(people).filter((seats) => {
      const pos = (p: string) => seats.indexOf(p) + 1
      return (
        pos('料理人') === 2 &&
        Math.abs(pos('メイド') - pos('料理人')) === 1 &&
        [1, 5].includes(pos('執事')) &&
        pos('甥') === pos('庭師') + 1 &&
        Math.abs(pos('執事') - pos('甥')) === 1
      )
    })
    expect(valid).toHaveLength(1)
    expect(isCorrect(PUZZLES.p2, valid[0][2])).toBe(true)
  })

  it('第3の謎：五十音で1文字ずらした暗号', () => {
    const gojuon =
      'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
    const decoded = [...'なこうはにき'].map((c) => gojuon[gojuon.indexOf(c) - 1]).join('')
    expect(isCorrect(PUZZLES.p3, decoded)).toBe(true)
  })

  it('第4の謎：真実を語る本は1冊だけ', () => {
    const books = ['赤', '青', '緑'] as const
    const valid = books.filter((key) => {
      const truths = [key === '赤', key !== '赤', key !== '青'].filter(Boolean).length
      return truths === 1
    })
    expect(valid).toEqual(['青'])
    expect(isCorrect(PUZZLES.p4, '青の本')).toBe(true)
  })

  it('第5の謎：瓶の重さ', () => {
    const found: number[] = []
    for (let salt = 0; salt <= 1000; salt += 10)
      for (let sugar = 0; sugar <= 1000; sugar += 10) {
        const flour = 700 - sugar
        if (salt + sugar === 500 && salt + flour === 600) found.push(sugar)
      }
    expect(found).toEqual([300])
    expect(isCorrect(PUZZLES.p5, '300')).toBe(true)
  })

  it('第7の謎：魔方陣', () => {
    const valid = permutations([1, 2, 3, 4, 5, 6, 7, 8, 9]).filter((g) => {
      if (g[0] !== 2 || g[1] !== 7 || g[2] !== 6 || g[4] !== 5) return false
      const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ]
      return lines.every((l) => l.reduce((s, i) => s + g[i], 0) === 15)
    })
    expect(valid).toHaveLength(1)
    expect(isCorrect(PUZZLES.p7, valid[0].slice(6).join(''))).toBe(true)
  })

  it('第8の謎：10月の第3日曜日', () => {
    // 13日が火曜日（曜日番号 2）になる月で、日曜日（0）の3回目を探す
    const weekday = (day: number) => (((day - 13 + 2) % 7) + 7) % 7
    const sundays = Array.from({ length: 31 }, (_, i) => i + 1).filter((d) => weekday(d) === 0)
    expect(isCorrect(PUZZLES.p8, `10${sundays[2]}`)).toBe(true)
  })

  it('第9の謎：偽金貨は天秤2回で見つかる', () => {
    // 1回の計量で候補を最大3分の1にしか絞れないので、8枚には ceil(log3 8) = 2 回必要
    expect(Math.ceil(Math.log(8) / Math.log(3))).toBe(2)
    expect(isCorrect(PUZZLES.p9, '2')).toBe(true)
  })

  it('最後の謎：条件をすべて満たす容疑者は1人', () => {
    const suspects = [
      { name: '執事・佐伯', left: true, alibi: false, shoe: 26 },
      { name: 'メイド・小春', left: false, alibi: true, shoe: 23 },
      { name: '庭師・権田', left: false, alibi: false, shoe: 26 },
      { name: '料理人・マルコ', left: false, alibi: true, shoe: 26 },
      { name: '甥・蓮', left: true, alibi: false, shoe: 27 },
    ]
    expect(suspects.map((s) => s.name)).toEqual([...SUSPECTS])
    const culprits = suspects.filter((s) => s.left && !s.alibi && s.shoe === 26)
    expect(culprits).toHaveLength(1)
    expect(isCorrect(PUZZLES.p10, culprits[0].name)).toBe(true)
  })
})

describe('答えの表記ゆれ', () => {
  it('カタカナ・全角・空白を吸収する', () => {
    expect(normalize('ト ケ イ ノ ナ カ')).toBe('とけいのなか')
    expect(isCorrect(PUZZLES.p1, '４２６５')).toBe(true)
    expect(isCorrect(PUZZLES.p3, '時計の中')).toBe(true)
    expect(isCorrect(PUZZLES.p3, 'とけい')).toBe(false)
  })
})

describe('館の構造', () => {
  it('10個の謎がそれぞれ1か所に配置されている', () => {
    const placed = Object.values(ROOMS).flatMap((r) =>
      r.hotspots.flatMap((h) => (h.puzzle ? [h.puzzle] : [])),
    )
    expect([...placed].sort()).toEqual([...PUZZLE_ORDER].sort())
  })

  it('最後の謎の前に、推理に必要な証拠がすべて手に入る', () => {
    const fromHotspots = Object.values(ROOMS).flatMap((r) =>
      r.hotspots.flatMap((h) => (h.evidence ? [h.evidence] : [])),
    )
    const fromPuzzles = PUZZLE_ORDER.flatMap((id) =>
      PUZZLES[id].reward ? [PUZZLES[id].reward!] : [],
    )
    const obtainable = new Set(['case', ...fromHotspots, ...fromPuzzles])
    expect([...obtainable].sort()).toEqual(Object.keys(EVIDENCE).sort())
  })
})

describe('謎の依存関係', () => {
  const others = PUZZLE_ORDER.filter((id) => id !== 'p10')

  it('最初から挑める謎が複数あり、手がかり待ちの謎もある', () => {
    const open = PUZZLE_ORDER.filter((id) => isUnlocked(id, []))
    expect(open.length).toBeGreaterThanOrEqual(4)
    expect(open.length).toBeLessThan(PUZZLE_ORDER.length)
  })

  it('依存関係が循環しておらず、解ける謎から順に解けば全部解ける', () => {
    const solved: PuzzleId[] = []
    while (solved.length < PUZZLE_ORDER.length) {
      const next = PUZZLE_ORDER.filter((id) => !solved.includes(id) && isUnlocked(id, solved))
      expect(next.length, `詰まった: 解決済み ${solved.join(',')}`).toBeGreaterThan(0)
      solved.push(...next)
    }
  })

  it('最後の謎は、ほかの9問をすべて解くまで答えられない', () => {
    expect(isUnlocked('p10', others)).toBe(true)
    for (const skip of others) {
      expect(
        isUnlocked(
          'p10',
          others.filter((id) => id !== skip),
        ),
        skip,
      ).toBe(false)
    }
  })

  it('最後の謎以外は、最後の謎に依存しない', () => {
    for (const id of others) expect(prerequisites(id)).not.toContain('p10')
  })

  it('手がかりは、出どころの謎を解くまで問題文に書かれていない', () => {
    for (const id of PUZZLE_ORDER) {
      for (const clue of PUZZLES[id].clues ?? []) {
        expect(PUZZLES[id].question).not.toContain(clue.text)
        expect(PUZZLE_ORDER).toContain(clue.from)
      }
    }
  })
})
