import { describe, expect, it } from 'vitest'
import { isCorrect } from '../../answer'
import { figuresOf } from '../../figures'
import { cluesFrom, isUnlocked, prerequisites } from '../../scenario'
import type { PuzzleId, Scenario } from '../../types'
import { ENDING, RANK } from './ending'
import { EVIDENCE } from './evidence'
import { PUZZLE_ORDER, PUZZLES, SUSPECTS } from './puzzles'
import {
  allSudokuGrids,
  BLACKOUT_LIGHTS,
  BREAKER_FEEDS,
  PAINTINGS,
  solvers,
  stairReadings,
  SUSPECT_TRAITS,
  withoutClues,
} from './solve'

// 謎のデータだけを持つ値を `Scenario` として扱い、依存関係の関数に渡す
// （部屋を含む完全な値は、同じディレクトリの index.ts にある）
const scenario = {
  id: 'observatory',
  puzzles: PUZZLES,
  puzzleOrder: PUZZLE_ORDER,
  finalPuzzle: 'q12',
  suspects: [...SUSPECTS],
  evidence: EVIDENCE,
  ending: ENDING,
  rank: RANK,
} as unknown as Scenario

/** 「助手・氷室」→「氷室」。証拠の文は役職を付けずに名前だけを書く */
const shortName = (full: string) => full.split('・').at(-1)!
const traitNames = (pick: (s: (typeof SUSPECT_TRAITS)[number]) => boolean) =>
  SUSPECT_TRAITS.filter(pick).map((s) => shortName(s.name))

const others = PUZZLE_ORDER.filter((id) => id !== 'q12')

/** 謎を解くまでに必要な、依存の鎖の長さ（その謎を含む） */
function depth(id: PuzzleId): number {
  const pre = prerequisites(scenario, id)
  return 1 + (pre.length === 0 ? 0 : Math.max(...pre.map(depth)))
}

describe('シナリオ 2：雪の天文台と消えた彗星 — 謎の解の一意性', () => {
  it('総当たりの関数が、すべての謎にある', () => {
    expect(Object.keys(solvers).sort()).toEqual([...PUZZLE_ORDER].sort())
  })

  it.each(PUZZLE_ORDER)('%s：解がちょうど 1 つで、その解で正解になる', (id) => {
    const answers = solvers[id]()
    expect(answers).toHaveLength(1)
    expect(isCorrect(PUZZLES[id], answers[0])).toBe(true)
  })

  it('q10：外階段の階を 1階・地下・2階と読むと解が 1 つに決まらないので、問題文は「どれにも数えない」と書く', () => {
    expect(PUZZLES.q10.question).toContain('1階・2階・地下のどれにも数えない')
    expect([...new Set(stairReadings.firstFloor())].sort()).toEqual(['銀', '銅', '真鍮'].sort())
    expect([...new Set(stairReadings.basement())].sort()).toEqual(['鉄', '真鍮'].sort())
    expect(stairReadings.secondFloor()).toEqual([])
  })

  it('q6：4×4 の数独は 288 通りあり、与えたマスで 1 つに絞れる', () => {
    expect(allSudokuGrids()).toHaveLength(288)
    expect(solvers.q6()).toEqual(['3241'])
  })

  describe('手がかり・観察を除くと、解が 2 つ以上残る', () => {
    it('q1：手入れ帳を除くと、12時15分と 0時15分が残る', () => {
      expect(withoutClues.q1().sort()).toEqual(['0015', '1215'])
    })

    it('q8：数字の和の手がかりを除くと、5 つが残る', () => {
      expect(withoutClues.q8()).toEqual(['210', '420', '630', '840', '987'])
    })

    it('q9：暗室の明るさ（q2 の手がかり）を除くと、2 つが残る', () => {
      expect(withoutClues.q9().sort()).toEqual(['2番と3番と4番', '2番と4番'])
    })

    it('q11：博士の署名の観察を除くと、4538 と 4578 が残る', () => {
      expect(withoutClues.q11().sort()).toEqual(['4538', '4578'])
    })

    it('q8・q9・q11：手がかりを加えた解は、除いた解の中に含まれる（q1 は時計の癖で答えそのものが変わる）', () => {
      for (const id of ['q8', 'q9', 'q11'] as const)
        expect(withoutClues[id]()).toContain(solvers[id]()[0])
    })
  })
})

describe('シナリオ 2：謎の構成', () => {
  it('謎は 12 問で、各問のヒントは 3 段', () => {
    expect(PUZZLE_ORDER).toHaveLength(12)
    expect(Object.keys(PUZZLES).sort()).toEqual([...PUZZLE_ORDER].sort())
    for (const id of PUZZLE_ORDER) {
      expect(PUZZLES[id].id).toBe(id)
      expect(PUZZLES[id].hints, id).toHaveLength(3)
      for (const h of PUZZLES[id].hints) expect(h.length).toBeGreaterThan(0)
    }
  })

  it('最初から挑める謎が 3 問以上あり、手がかり待ちの謎もある', () => {
    const open = PUZZLE_ORDER.filter((id) => isUnlocked(scenario, id, []))
    expect(open).toEqual(['q1', 'q3', 'q4', 'q7', 'q10'])
    expect(open.length).toBeGreaterThanOrEqual(3)
    expect(open.length).toBeLessThan(PUZZLE_ORDER.length)
  })

  it('依存関係が循環しておらず、解ける謎から順に解けば全部解ける', () => {
    const solved: PuzzleId[] = []
    while (solved.length < PUZZLE_ORDER.length) {
      const next = PUZZLE_ORDER.filter(
        (id) => !solved.includes(id) && isUnlocked(scenario, id, solved),
      )
      expect(next.length, `詰まった: 解決済み ${solved.join(',')}`).toBeGreaterThan(0)
      solved.push(...next)
    }
  })

  it('最も長い依存の鎖が 4 段以上ある（q3・q4 → q5 → q6 → q9）', () => {
    expect(Math.max(...others.map(depth))).toBeGreaterThanOrEqual(4)
    expect(depth('q9')).toBe(4)
    expect(prerequisites(scenario, 'q5').sort()).toEqual(['q3', 'q4'])
    expect(prerequisites(scenario, 'q6')).toEqual(['q5'])
    expect(prerequisites(scenario, 'q9').sort()).toEqual(['q2', 'q6'])
  })

  it('最後の謎は、ほかの 11 問をすべて解くまで答えられない', () => {
    expect(isUnlocked(scenario, 'q12', others)).toBe(true)
    for (const skip of others)
      expect(
        isUnlocked(
          scenario,
          'q12',
          others.filter((id) => id !== skip),
        ),
        skip,
      ).toBe(false)
  })

  it('最後の謎以外は、最後の謎に依存しない', () => {
    for (const id of others) expect(prerequisites(scenario, id)).not.toContain('q12')
  })

  it('手がかりは、出どころの謎を解くまで問題文に書かれていない', () => {
    for (const id of PUZZLE_ORDER) {
      const puzzle = PUZZLES[id]
      for (const clue of puzzle.clues ?? []) {
        expect(puzzle.question, id).not.toContain(clue.text)
        expect(PUZZLE_ORDER).toContain(clue.from)
      }
    }
  })

  it('手がかりを渡す謎は、その手がかりの出どころとして引ける', () => {
    expect(cluesFrom(scenario, 'q3')).toEqual(['q5'])
    expect(cluesFrom(scenario, 'q4')).toEqual(['q5'])
    expect(cluesFrom(scenario, 'q2')).toEqual(['q9'])
    expect(cluesFrom(scenario, 'q6')).toEqual(['q9'])
  })

  it('謎が指す前提・報酬・図版が、定義済みの値を指す', () => {
    for (const p of Object.values(PUZZLES)) {
      for (const r of p.requires ?? []) expect(PUZZLES[r], `${p.id} requires`).toBeDefined()
      if (p.reward) expect(EVIDENCE[p.reward], `${p.id} reward`).toBeDefined()
      if (p.figure) expect(figuresOf('observatory'), p.id).toContain(p.figure)
    }
    expect(
      Object.values(PUZZLES)
        .flatMap((p) => (p.figure ? [p.figure] : []))
        .sort(),
    ).toEqual([...figuresOf('observatory')].sort())
  })

  it('証拠の ID が、定義のキーと一致している', () => {
    for (const [id, e] of Object.entries(EVIDENCE)) expect(e.id).toBe(id)
    expect(Object.keys(EVIDENCE)).toHaveLength(12)
  })

  it('正解の画面に出す文を持つ謎は、報酬の証拠があるものだけ「証拠を手帳に記録した」と書く', () => {
    for (const p of Object.values(PUZZLES)) {
      if (p.id === 'q12') continue
      expect(p.solvedText.includes('証拠を手帳に記録した'), p.id).toBe(p.reward !== undefined)
    }
  })

  it('最初の謎の答えは、導入の証拠（事件の概要）に書かれていない', () => {
    expect(EVIDENCE.case.text).not.toContain('23時40分')
    expect(EVIDENCE.case.text).not.toContain('2340')
  })
})

describe('シナリオ 2：偽の手がかりの扱い', () => {
  it('容疑者の表・選択肢・犯人が一致する', () => {
    expect(SUSPECT_TRAITS.map((s) => s.name)).toEqual([...SUSPECTS])
    expect(PUZZLES.q12.kind === 'choice' && PUZZLES.q12.choices).toEqual([...SUSPECTS])
    expect(ENDING.culprit).toBe('助手・氷室')
    expect(isCorrect(PUZZLES.q12, ENDING.culprit)).toBe(true)
  })

  it('真壁の嘘の証言：q2 で見破る。嘘つきは犯人ではなく、証拠にも嘘と明記される', () => {
    expect(solvers.q2()).toEqual(['真壁'])
    expect(ENDING.culprit).not.toContain('真壁')
    expect(EVIDENCE.alibi.text).toContain('真壁の「客室に一人でいた」は嘘')
  })

  it('灯のブローチ：灯は番号を知り一人だが、長靴が無地なので犯人にならない。結末の推理で退ける', () => {
    const toh = SUSPECT_TRAITS.find((s) => s.name === '姪・灯')!
    expect(toh.knowsCode && toh.noAlibi && !toh.grid).toBe(true)
    expect(EVIDENCE.brooch.text).toContain('灯')
    expect(EVIDENCE.stargazing.text).toContain('21時')
    expect(EVIDENCE.footprint.text).toContain('雪が止んだ後')
    expect(ENDING.steps.join('')).toContain('ブローチ')
  })

  it('出版社の手紙：差出人の勤め先の早瀬は番号を知らず、犯人にならない。後日談で宛名が氷室と分かる', () => {
    const hayase = SUSPECT_TRAITS.find((s) => s.name === '記者・早瀬')!
    expect(hayase.knowsCode).toBe(false)
    expect(EVIDENCE.letter.text).toContain('早瀬の勤める出版社')
    expect(EVIDENCE.letter.text).toContain('宛名の部分は破れている')
    expect(ENDING.epilogue).toContain('氷室どの')
  })

  it('天秤座の版画：星の数 7 の画家の署名の絵が 1 枚あり、博士の署名だけを使うと 4538', () => {
    const libra = PAINTINGS.filter((p) => p.symbol === '♎')
    expect(libra.map((p) => p.signedBy).sort()).toEqual(['博士', '画家'])
    expect(libra.find((p) => p.signedBy === '画家')?.stars).toBe(7)
    expect(PAINTINGS).toHaveLength(5)
    expect(solvers.q11()).toEqual(['4538'])
  })

  it('偽の手がかりの 4 つは、どれも最後の推理の 3 条件から退けられる', () => {
    // 3 条件を満たす容疑者は 1 人だけで、真壁・灯・早瀬は 3 条件のいずれかを欠く
    const all = SUSPECT_TRAITS.filter((s) => s.grid && s.knowsCode && s.noAlibi)
    expect(all.map((s) => s.name)).toEqual(['助手・氷室'])
    for (const name of ['研究員・真壁', '姪・灯', '記者・早瀬']) {
      const s = SUSPECT_TRAITS.find((t) => t.name === name)!
      expect(s.grid && s.knowsCode && s.noAlibi, name).toBe(false)
    }
  })
})

describe('シナリオ 2：答えの表記ゆれ', () => {
  it('q5：漢字交じりの答えも受け付ける', () => {
    for (const input of ['ろうかのほしのえ', '廊下の星の絵', 'ろうかの星の絵', 'ロウカノホシノエ'])
      expect(isCorrect(PUZZLES.q5, input), input).toBe(true)
    expect(isCorrect(PUZZLES.q5, 'ろうかのほし')).toBe(false)
  })
})

describe('シナリオ 2：総当たりの定数と、問題文・証拠の文面の一致', () => {
  it('q9：配線図の手がかりが、BREAKER_FEEDS のすべての番号と部屋を書いている', () => {
    const clue = PUZZLES.q9.clues!.find((c) => c.from === 'q6')!.text
    const entries = Object.entries(BREAKER_FEEDS)
    expect(entries).toHaveLength(4)
    for (const [n, rooms] of entries)
      expect(clue, `${n}番`).toContain(`${n}番＝${rooms.join('・')}`)
    // 手がかりに書かれた「N番＝」の数が、定数の番号の数と同じ（定数に無い番号を書いていない）
    expect(clue.match(/\d番＝/g)).toHaveLength(entries.length)
  })

  it('q9：停電中の明暗が、問題文（明るい部屋・暗い部屋）と q2 の手がかり（暗室）に書かれている', () => {
    const q = PUZZLES.q9.question
    const roomsWhere = (on: boolean) =>
      Object.entries(BLACKOUT_LIGHTS)
        .filter(([room, lit]) => lit === on && room !== '暗室')
        .map(([room]) => room)
    expect(q).toContain(`${roomsWhere(true).join('と')}は明るかった`)
    expect(q).toContain(`${roomsWhere(false).join('・')}は暗かった`)
    // 暗室は問題文に書かず、q2 の手がかりで知らせる
    expect(BLACKOUT_LIGHTS['暗室']).toBe(true)
    expect(q).not.toContain('暗室')
    const q2clue = PUZZLES.q9.clues!.find((c) => c.from === 'q2')!.text
    expect(q2clue).toContain('暗室')
    expect(q2clue).toContain('安全灯')
  })

  it('BLACKOUT_LIGHTS の部屋は、すべて配線図のどれかの番号が電気を送る', () => {
    const fed = new Set(Object.values(BREAKER_FEEDS).flat())
    for (const room of Object.keys(BLACKOUT_LIGHTS)) expect(fed.has(room), room).toBe(true)
  })

  it('SUSPECT_TRAITS：長靴・ドームの番号が、証拠の文の名前の並びと一致する', () => {
    const listed = (text: string, pattern: RegExp) => text.match(pattern)![1].split('・').sort()
    expect(listed(EVIDENCE.soles.text, /格子模様の靴底は ([^、]+?)、/)).toEqual(
      traitNames((s) => s.grid).sort(),
    )
    const holders = traitNames((s) => s.knowsCode).sort()
    expect(listed(EVIDENCE.codeholders.text, /教えたのは、(.+?) の/)).toEqual(holders)
    expect(EVIDENCE.codeholders.text).toContain(`${holders.length}人`)
    expect(listed(ENDING.steps[1], /番号を知っていたのは (.+?) の/)).toEqual(holders)
  })

  it('SUSPECT_TRAITS：一緒だったと確かめられない人が、証拠・結末・q12 のヒントの文と一致する', () => {
    const alone = traitNames((s) => s.noAlibi)
    expect(alone).toEqual(['氷室', '灯'])
    const phrase = `${alone.join('と')}`
    expect(ENDING.steps[3]).toContain(`${phrase}だけ`)
    expect(PUZZLES.q12.hints[2]).toContain(phrase)
    // 他の 4 人は、証拠の文で居場所が確かめられている
    for (const s of SUSPECT_TRAITS.filter((t) => !t.noAlibi))
      expect(EVIDENCE.alibi.text, s.name).toContain(shortName(s.name))
  })
})
