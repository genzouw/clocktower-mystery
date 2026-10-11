import { MAGIC_CELLS, STAFF_NOTES } from '../../figures'

/** 謎の入力空間を全部調べ、条件を満たす答えをすべて返す関数の表。答えは `isCorrect` に渡せる文字列 */
export type Solvers = Record<string, () => string[]>

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((x, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
  )
}

/** 最後の謎の容疑者と、推理に使う 3 つの条件 */
export const SUSPECT_TRAITS = [
  { name: '執事・佐伯', left: true, alibi: false, shoe: 26 },
  { name: 'メイド・小春', left: false, alibi: true, shoe: 23 },
  { name: '庭師・権田', left: false, alibi: false, shoe: 26 },
  { name: '料理人・マルコ', left: false, alibi: true, shoe: 26 },
  { name: '甥・蓮', left: true, alibi: false, shoe: 27 },
]

export const solvers: Solvers = {
  // 第1の謎：数字錠
  p1: () => {
    const found: string[] = []
    for (let n = 0; n <= 9999; n++) {
      const [a, b, c, d] = String(n).padStart(4, '0').split('').map(Number)
      if (new Set([a, b, c, d]).size !== 4) continue
      if (a === 2 * b && c === a + b && d === c - 1 && a + b + c + d === 17)
        found.push(`${a}${b}${c}${d}`)
    }
    return found
  },

  // 第2の謎：席順。3番の席に座っていた人を返す
  p2: () => {
    const people = ['執事', 'メイド', '庭師', '料理人', '甥']
    return permutations(people)
      .filter((seats) => {
        const pos = (p: string) => seats.indexOf(p) + 1
        return (
          pos('料理人') === 2 &&
          Math.abs(pos('メイド') - pos('料理人')) === 1 &&
          [1, 5].includes(pos('執事')) &&
          pos('甥') === pos('庭師') + 1 &&
          Math.abs(pos('執事') - pos('甥')) === 1
        )
      })
      .map((seats) => seats[2])
  },

  // 第3の謎：五十音で 1 文字ずらした暗号。手がかりの「あ → い」に従って戻す
  p3: () => {
    const gojuon =
      'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
    return [[...'なこうはにき'].map((c) => gojuon[gojuon.indexOf(c) - 1]).join('')]
  },

  // 第4の謎：真実を語る本は 1 冊だけ
  p4: () => {
    const books = ['赤', '青', '緑']
    return books
      .filter((key) => {
        const truths = [key === '赤', key !== '赤', key !== '青'].filter(Boolean).length
        return truths === 1
      })
      .map((key) => `${key}の本`)
  },

  // 第5の謎：瓶の重さ。砂糖の瓶の重さ（g）を返す
  p5: () => {
    const found: string[] = []
    for (let salt = 0; salt <= 1000; salt += 10)
      for (let sugar = 0; sugar <= 1000; sugar += 10) {
        const flour = 700 - sugar
        if (salt + sugar === 500 && salt + flour === 600) found.push(String(sugar))
      }
    return found
  },

  // 第6の謎：楽譜。ド＝1 として、五線上の位置（一番下の線がミ、その下の加線がド）を数字にする
  p6: () => {
    const doLine = 80
    const digits = STAFF_NOTES.map((y) => {
      const matched = [1, 2, 3, 4, 5, 6, 7].filter((n) => doLine - (n - 1) * 5 === y)
      return matched.length === 1 ? String(matched[0]) : '?'
    })
    return [digits.join('')]
  },

  // 第7の謎：魔方陣。一番下の段を返す
  p7: () => {
    const fixed = MAGIC_CELLS.map((c) => (/^[1-9]$/.test(c) ? Number(c) : null))
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
    return permutations([1, 2, 3, 4, 5, 6, 7, 8, 9])
      .filter(
        (g) =>
          fixed.every((v, i) => v === null || g[i] === v) &&
          lines.every((l) => l.reduce((s, i) => s + g[i], 0) === 15),
      )
      .map((g) => g.slice(6).join(''))
  },

  // 第8の謎：伯爵の誕生日（10 月の第 3 日曜日）。13 日が火曜日（曜日番号 2）になる月で、日曜日（0）の 3 回目を探す
  p8: () => {
    const weekday = (day: number) => (((day - 13 + 2) % 7) + 7) % 7
    const sundays = Array.from({ length: 31 }, (_, i) => i + 1).filter((d) => weekday(d) === 0)
    return [`10${sundays[2]}`]
  },

  // 第9の謎：偽金貨 8 枚は天秤 2 回で見つかる。1 回の計量で候補を最大 3 分の 1 にしか絞れないので ceil(log3 8) 回
  p9: () => [String(Math.ceil(Math.log(8) / Math.log(3)))],

  // 最後の謎：条件をすべて満たす容疑者
  p10: () => SUSPECT_TRAITS.filter((s) => s.left && !s.alibi && s.shoe === 26).map((s) => s.name),
}
