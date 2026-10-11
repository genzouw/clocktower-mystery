import {
  BREAKER_COUNT,
  CONSTELLATIONS,
  OBSERVATORY_CIPHER,
  PLATE_BOX_LABELS,
  STAR_GRID_GIVENS,
} from '../../figures'
import type { Solvers } from '../clocktower/solve'

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((x, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [x, ...rest]),
  )
}

/** 最後の謎の容疑者と、推理に使う 3 つの条件（doc-2「シナリオ 2 の物語」の表） */
export const SUSPECT_TRAITS = [
  { name: '助手・氷室', grid: true, knowsCode: true, noAlibi: true },
  { name: '記者・早瀬', grid: false, knowsCode: false, noAlibi: false },
  { name: '管理人・雪村', grid: false, knowsCode: true, noAlibi: false },
  { name: '写真家・鳴海', grid: true, knowsCode: true, noAlibi: false },
  { name: '研究員・真壁', grid: true, knowsCode: false, noAlibi: false },
  { name: '姪・灯', grid: false, knowsCode: true, noAlibi: true },
]

/** q11 の部屋にある星座の絵（観察で得る情報）。部屋の物の説明文は、この値に合わせる */
export const PAINTINGS = [
  { symbol: '♈', place: '書庫', signedBy: '博士', stars: 4 },
  { symbol: '♋', place: '談話室', signedBy: '博士', stars: 5 },
  { symbol: '♎', place: '客室', signedBy: '博士', stars: 3 },
  { symbol: '♎', place: '食堂', signedBy: '画家', stars: 7 },
  { symbol: '♑', place: '書斎', signedBy: '博士', stars: 8 },
]

/** q9 の配線図（手がかり）。番号 → 電気を送る部屋 */
export const BREAKER_FEEDS: Record<number, string[]> = {
  1: ['玄関', '談話室'],
  2: ['書庫', 'ドーム'],
  3: ['談話室', '暗室'],
  4: ['暗室', 'ドーム', '厨房'],
}

/** q9 の停電中の明暗。暗室は q2 の手がかり（安全灯の下で現像が続いていた）から分かる */
export const BLACKOUT_LIGHTS: Record<string, boolean> = {
  玄関: true,
  談話室: true,
  暗室: true,
  書庫: false,
  ドーム: false,
  厨房: false,
}

const GOJUON =
  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'

/** q1：正午に合わせた時計は 1 時間に 3 分進む。0時15分で止まった時計から、本当の時刻（HHMM）を求める */
function clockTimes(minutesFastPerHour: number): string[] {
  const found: string[] = []
  for (let t = 0; t < 1440; t++) {
    // 文字盤は 12 時間で一周する。正午から t 分たったとき、針は t + 進み分だけ進んでいる
    const shown = t + (t * minutesFastPerHour) / 60
    if (Number.isInteger(shown) && shown % 720 === 15) {
      const h = Math.floor(((720 + t) % 1440) / 60)
      const m = (720 + t) % 60
      found.push(`${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`)
    }
  }
  return found
}

/** q4：彗星 A・B・C が同じ年にそろう、最初の年。5・6・7 の最小公倍数 210 年分を調べる */
function cometYears(): string[] {
  const comets = [
    { next: 2026, period: 5 },
    { next: 2028, period: 6 },
    { next: 2027, period: 7 },
  ]
  const found: string[] = []
  for (let y = 2026; y < 2026 + 210; y++) {
    if (comets.every((c) => y >= c.next && (y - c.next) % c.period === 0)) found.push(String(y))
  }
  return found
}

/** q7：5 と 3 の升で、どちらかにちょうど 4 を量る最短の作業回数。幅優先探索 */
function jugSteps(): string[] {
  const cap = [5, 3]
  const key = (s: number[]) => `${s[0]},${s[1]}`
  const next = (s: number[]): number[][] => {
    const out: number[][] = []
    for (let i = 0; i < 2; i++) {
      const j = 1 - i
      const fill = [...s]
      fill[i] = cap[i]
      const empty = [...s]
      empty[i] = 0
      const move = Math.min(s[i], cap[j] - s[j])
      const pour = [...s]
      pour[i] -= move
      pour[j] += move
      out.push(fill, empty, pour)
    }
    return out
  }
  const dist = new Map<string, number>([[key([0, 0]), 0]])
  let frontier = [[0, 0]]
  while (frontier.length > 0) {
    const nextFrontier: number[][] = []
    for (const s of frontier)
      for (const n of next(s)) {
        if (dist.has(key(n))) continue
        dist.set(key(n), dist.get(key(s))! + 1)
        nextFrontier.push(n)
      }
    frontier = nextFrontier
  }
  const steps = [...dist].filter(([k]) => k.split(',').map(Number).includes(4)).map(([, d]) => d)
  return steps.length > 0 ? [String(Math.min(...steps))] : []
}

/** q8：3 桁の数で、①〜④を満たすもの。digitSum を渡すと、数字の和の条件（手がかり）も課す */
function safeNumbers(digitSum?: number): string[] {
  const found: string[] = []
  for (let n = 0; n <= 999; n++) {
    const [a, b, c] = String(n).padStart(3, '0').split('').map(Number)
    if (new Set([a, b, c]).size !== 3) continue
    if (a + c !== 2 * b || a <= c || n % 7 !== 0) continue
    if (digitSum !== undefined && a + b + c !== digitSum) continue
    found.push(String(n).padStart(3, '0'))
  }
  return found
}

/** q9：落とされたブレーカーの組（2^4 通り）のうち、observed の明暗と一致するもの。lit = どれかが入っていれば明るい */
function droppedBreakers(observed: Record<string, boolean>): string[] {
  const numbers = Array.from({ length: BREAKER_COUNT }, (_, i) => i + 1)
  const found: string[] = []
  for (let mask = 0; mask < 1 << BREAKER_COUNT; mask++) {
    const dropped = numbers.filter((n) => mask & (1 << (n - 1)))
    const lit = (room: string) =>
      numbers.some((n) => !dropped.includes(n) && BREAKER_FEEDS[n].includes(room))
    if (Object.entries(observed).every(([room, on]) => lit(room) === on))
      found.push(
        dropped.length === 1 ? `${dropped[0]}番だけ` : dropped.map((n) => `${n}番`).join('と'),
      )
  }
  return found
}

/** q11：4 つの星座それぞれについて絵を 1 枚ずつ選び、星の数を並べた番号。requireDoctor で博士の署名だけに絞る */
function constellationCodes(requireDoctor: boolean): string[] {
  const combos = CONSTELLATIONS.reduce<(typeof PAINTINGS)[]>(
    (acc, c) =>
      acc.flatMap((chosen) =>
        PAINTINGS.filter((p) => p.symbol === c.symbol).map((p) => [...chosen, p]),
      ),
    [[]],
  )
  return combos
    .filter((chosen) => !requireDoctor || chosen.every((p) => p.signedBy === '博士'))
    .map((chosen) => chosen.map((p) => p.stars).join(''))
}

/** 4×4 の数独（行・列・2×2 の区画に 1〜4 が 1 つずつ）の完成形をすべて返す。288 通り */
export function allSudokuGrids(): number[][][] {
  const grid = Array.from({ length: 4 }, () => [0, 0, 0, 0])
  const found: number[][][] = []
  const ok = (r: number, c: number, v: number) => {
    for (let i = 0; i < 4; i++) if (grid[r][i] === v || grid[i][c] === v) return false
    const br = r - (r % 2)
    const bc = c - (c % 2)
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) if (grid[br + i][bc + j] === v) return false
    return true
  }
  const fill = (pos: number) => {
    if (pos === 16) {
      found.push(grid.map((row) => [...row]))
      return
    }
    const r = Math.floor(pos / 4)
    const c = pos % 4
    for (let v = 1; v <= 4; v++) {
      if (!ok(r, c, v)) continue
      grid[r][c] = v
      fill(pos + 1)
      grid[r][c] = 0
    }
  }
  fill(0)
  return found
}

/** q2：6 人の居場所（6 か所）の全組を調べ、5 つの証言のうちちょうど 1 つが偽になる組の、偽の証言をした人 */
function liars(): string[] {
  const places = ['書庫', '談話室', '暗室', '客室', '廊下', '倉庫']
  const people = ['氷室', '早瀬', '雪村', '鳴海', '真壁', '灯']
  const found = new Set<string>()
  const total = places.length ** people.length
  for (let n = 0; n < total; n++) {
    const where: Record<string, string> = {}
    let rest = n
    for (const p of people) {
      where[p] = places[rest % places.length]
      rest = Math.floor(rest / places.length)
    }
    const statements: Record<string, boolean> = {
      早瀬: where.早瀬 === '談話室' && where.雪村 === '談話室',
      雪村: where.雪村 === '談話室' && where.早瀬 === '談話室',
      鳴海: where.鳴海 === '暗室' && where.真壁 === '暗室',
      真壁: where.真壁 === '客室' && people.every((p) => p === '真壁' || where[p] !== '客室'),
      灯: where.灯 === '廊下' && where.真壁 === '暗室',
    }
    const false_ = Object.entries(statements).filter(([, ok]) => !ok)
    if (false_.length === 1) found.add(false_[0][0])
  }
  return [...found]
}

/** q3：札がすべて間違いの並べ方（完全順列）のうち、1 枚の乾板で並べ方が 1 つに決まる箱の札 */
function decisiveBoxes(): string[] {
  // 札の番号 i（PLATE_BOX_LABELS の添字）は、箱の中身の種類の番号でもある。0 未使用・1 撮影済み・2 混在
  const kinds = [0, 1, 2]
  const arrangements = permutations(kinds).filter((a) => a.every((kind, box) => kind !== box))
  // 取り出した 1 枚が未使用（0）・撮影済み（1）のどちらでありうるか。混在の箱からは両方が出うる
  const outcomes = (kind: number) => (kind === 2 ? [0, 1] : [kind])
  return PLATE_BOX_LABELS.filter((_, box) => {
    const seen = new Set(arrangements.flatMap((a) => outcomes(a[box])))
    return [...seen].every(
      (o) => arrangements.filter((a) => outcomes(a[box]).includes(o)).length === 1,
    )
  }).map((label) => `「${label}」の札の箱`)
}

/**
 * q10：鍵と扉の対応 5! = 120 通りのうち、①〜⑤を満たすもの。外階段の扉に合う鍵を返す。
 * stairFloor は外階段の階の読み。問題文は「1階・2階・地下のどれにも数えない」（屋外）と書く
 */
function stairKeys(stairFloor = '屋外'): string[] {
  const keys = ['金', '銀', '銅', '鉄', '真鍮']
  const doors = [
    { name: '暗室', floor: '1階' },
    { name: '書庫', floor: '1階' },
    { name: '客室', floor: '2階' },
    { name: '倉庫', floor: '地下' },
    { name: '外階段', floor: stairFloor },
  ]
  return permutations(doors)
    .filter((assigned) => {
      const door = (key: string) => assigned[keys.indexOf(key)]
      return (
        door('金').floor !== '1階' &&
        door('鉄').floor === '地下' &&
        door('銅').floor === '1階' &&
        door('銀').floor === '1階' &&
        door('銀').name !== '暗室' &&
        door('真鍮').floor !== '2階'
      )
    })
    .map((assigned) => keys[assigned.findIndex((d) => d.name === '外階段')])
}

export const solvers: Solvers = {
  // 第1の謎：手入れ帳（1 時間に 3 分進む）を踏まえた、停電の本当の時刻
  q1: () => clockTimes(3),

  // 第2の謎：嘘をついている人
  q2: () => liars(),

  // 第3の謎：1 枚で全部の中身が決まる箱
  q3: () => decisiveBoxes(),

  // 第4の謎：三つの彗星がそろう年
  q4: () => cometYears(),

  // 第5の謎：五十音を、鍵（q4 の年の各桁）の数だけ前へ戻す
  q5: () => {
    const key = cometYears()[0].split('').map(Number)
    const plain = [...OBSERVATORY_CIPHER].map((c, i) => {
      const at = GOJUON.indexOf(c)
      return at < 0 ? '?' : GOJUON[(at - key[i % key.length] + GOJUON.length) % GOJUON.length]
    })
    return plain.includes('?') ? [] : [plain.join('')]
  },

  // 第6の謎：与えたマスに合う 4×4 の数独の、いちばん下の段
  q6: () =>
    allSudokuGrids()
      .filter((g) => STAR_GRID_GIVENS.every((c) => g[c.row - 1][c.col - 1] === c.value))
      .map((g) => g[3].join('')),

  // 第7の謎：升の最短の作業回数
  q7: () => jugSteps(),

  // 第8の謎：数字の和が、戸棚の番号（q7 の答え）の 2 倍
  q8: () => safeNumbers(2 * Number(jugSteps()[0])),

  // 第9の謎：落とされたブレーカー
  q9: () => droppedBreakers(BLACKOUT_LIGHTS),

  // 第10の謎：外階段の扉に合う鍵
  q10: () => stairKeys(),

  // 第11の謎：博士の署名の絵の星の数を、星座の順に並べた番号
  q11: () => constellationCodes(true),

  // 最後の謎：3 つの条件をすべて満たす容疑者
  q12: () => SUSPECT_TRAITS.filter((s) => s.grid && s.knowsCode && s.noAlibi).map((s) => s.name),
}

/**
 * 手がかりや観察の情報を除いた条件の総当たり。それらが答えに要ることを、解が 2 つ以上残ることで示す
 * （q1：手入れ帳／q8：数字の和／q9：暗室の明るさ／q11：博士の署名）
 */
export const withoutClues = {
  q1: () => clockTimes(0),
  q8: () => safeNumbers(),
  q9: () =>
    droppedBreakers(
      Object.fromEntries(Object.entries(BLACKOUT_LIGHTS).filter(([r]) => r !== '暗室')),
    ),
  q11: () => constellationCodes(false),
} satisfies Record<string, () => string[]>

/** q10：外階段の階を問題文と違う読みにすると、解が 1 つに決まらない（問題文に屋外と書く必要があることを示す） */
export const stairReadings = {
  firstFloor: () => stairKeys('1階'),
  secondFloor: () => stairKeys('2階'),
  basement: () => stairKeys('地下'),
}
