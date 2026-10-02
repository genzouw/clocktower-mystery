import { describe, expect, it } from 'vitest'
import { isCorrect, normalize } from './answer'
import { EVIDENCE } from './evidence'
import { PUZZLES, PUZZLE_ORDER, SUSPECTS } from './puzzles'
import { ROOMS, canPass } from './rooms'
import type { PuzzleId, RoomId } from './types'

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

  it('謎を順に解けばすべての部屋へ到達でき、詰まらない', () => {
    const solved: PuzzleId[] = []
    for (let step = 0; step < PUZZLE_ORDER.length; step++) {
      const reachable = new Set<RoomId>(['hall'])
      const queue: RoomId[] = ['hall']
      while (queue.length) {
        const room = ROOMS[queue.shift()!]
        for (const exit of room.exits) {
          if (canPass(exit.requires, solved) && !reachable.has(exit.to)) {
            reachable.add(exit.to)
            queue.push(exit.to)
          }
        }
      }
      const available = Object.values(ROOMS)
        .filter((r) => reachable.has(r.id))
        .flatMap((r) =>
          r.hotspots.flatMap((h) => (h.puzzle && !solved.includes(h.puzzle) ? [h.puzzle] : [])),
        )
      expect(available.length).toBeGreaterThan(0)
      solved.push(available[0])
    }
    expect(solved).toHaveLength(10)
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
