import { describe, expect, it } from 'vitest'
import { isCorrect } from './answer'
import { isUnlocked, prerequisites } from './scenario'
import { SCENARIOS } from './scenarios'
import { solvers as clocktowerSolvers, type Solvers } from './scenarios/clocktower/solve'
import type { PuzzleId } from './types'

/** シナリオ ID → 謎ごとの総当たり関数。シナリオを足したら、ここにも足す */
const SOLVERS: Record<string, Solvers> = {
  clocktower: clocktowerSolvers,
}

describe('登録されたシナリオ', () => {
  it('ID が重複せず、すべてのシナリオに総当たりの表がある', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Object.keys(SOLVERS).sort()).toEqual([...ids].sort())
  })
})

describe.each(SCENARIOS)('構造: $id', (scenario) => {
  const rooms = Object.values(scenario.rooms)
  const hotspots = rooms.flatMap((r) => r.hotspots)
  const puzzleIds = Object.keys(scenario.puzzles)
  const others = scenario.puzzleOrder.filter((id) => id !== scenario.finalPuzzle)

  describe('参照先の存在', () => {
    it('部屋・謎・証拠の ID が、定義のキーと一致している', () => {
      for (const [id, r] of Object.entries(scenario.rooms)) expect(r.id).toBe(id)
      for (const [id, p] of Object.entries(scenario.puzzles)) expect(p.id).toBe(id)
      for (const [id, e] of Object.entries(scenario.evidence)) expect(e.id).toBe(id)
    })

    it('間取り・配色は全部屋ぶんあり、開始の部屋が存在する', () => {
      const roomIds = Object.keys(scenario.rooms).sort()
      expect(Object.keys(scenario.layout).sort()).toEqual(roomIds)
      expect(Object.keys(scenario.theme).sort()).toEqual(roomIds)
      expect(roomIds).toContain(scenario.startRoom)
      for (const room of rooms) expect(room.map).toBeDefined()
    })

    it('出口は存在する部屋へつながっている', () => {
      for (const room of rooms)
        for (const exit of room.exits)
          expect(scenario.rooms[exit.to], `${room.id} → ${exit.to}`).toBeDefined()
    })

    it('物が指す謎・証拠が存在する', () => {
      for (const h of hotspots) {
        if (h.puzzle) expect(scenario.puzzles[h.puzzle], h.id).toBeDefined()
        if (h.evidence) expect(scenario.evidence[h.evidence], h.id).toBeDefined()
      }
    })

    it('謎の前提・手がかりの出どころ・報酬が存在する', () => {
      for (const p of Object.values(scenario.puzzles)) {
        for (const id of p.requires ?? [])
          expect(scenario.puzzles[id], `${p.id} requires`).toBeDefined()
        for (const c of p.clues ?? [])
          expect(scenario.puzzles[c.from], `${p.id} clue`).toBeDefined()
        if (p.reward) expect(scenario.evidence[p.reward], `${p.id} reward`).toBeDefined()
      }
    })

    it('謎の並び・最後の謎・最初の証拠・犯人が定義済みの値を指す', () => {
      expect([...scenario.puzzleOrder].sort()).toEqual([...puzzleIds].sort())
      expect(scenario.puzzles[scenario.finalPuzzle]).toBeDefined()
      for (const id of scenario.initialEvidence) expect(scenario.evidence[id]).toBeDefined()
      expect(scenario.suspects).toContain(scenario.ending.culprit)
    })

    it('ランクのしきい値は昇順に並んでいる', () => {
      const { great, good, fair } = scenario.rank
      expect(great).toBeLessThan(good)
      expect(good).toBeLessThan(fair)
    })
  })

  describe('館の構造', () => {
    it('すべての謎が、それぞれちょうど 1 か所に配置されている', () => {
      const placed = hotspots.flatMap((h) => (h.puzzle ? [h.puzzle] : []))
      expect([...placed].sort()).toEqual([...scenario.puzzleOrder].sort())
    })

    it('最後の謎の前に、推理に必要な証拠がすべて手に入る', () => {
      const fromHotspots = hotspots.flatMap((h) => (h.evidence ? [h.evidence] : []))
      const fromPuzzles = scenario.puzzleOrder.flatMap((id) => {
        const reward = scenario.puzzles[id].reward
        return reward ? [reward] : []
      })
      const obtainable = new Set([...scenario.initialEvidence, ...fromHotspots, ...fromPuzzles])
      expect([...obtainable].sort()).toEqual(Object.keys(scenario.evidence).sort())
    })
  })

  describe('謎の依存関係', () => {
    it('最初から挑める謎が複数あり、手がかり待ちの謎もある', () => {
      const open = scenario.puzzleOrder.filter((id) => isUnlocked(scenario, id, []))
      expect(open.length).toBeGreaterThanOrEqual(2)
      expect(open.length).toBeLessThan(scenario.puzzleOrder.length)
    })

    it('依存関係が循環しておらず、解ける謎から順に解けば全部解ける', () => {
      const solved: PuzzleId[] = []
      while (solved.length < scenario.puzzleOrder.length) {
        const next = scenario.puzzleOrder.filter(
          (id) => !solved.includes(id) && isUnlocked(scenario, id, solved),
        )
        expect(next.length, `詰まった: 解決済み ${solved.join(',')}`).toBeGreaterThan(0)
        solved.push(...next)
      }
    })

    it('最後の謎は、ほかの謎をすべて解くまで答えられない', () => {
      const last = scenario.finalPuzzle
      expect(isUnlocked(scenario, last, others)).toBe(true)
      for (const skip of others) {
        expect(
          isUnlocked(
            scenario,
            last,
            others.filter((id) => id !== skip),
          ),
          skip,
        ).toBe(false)
      }
    })

    it('最後の謎以外は、最後の謎に依存しない', () => {
      for (const id of others)
        expect(prerequisites(scenario, id)).not.toContain(scenario.finalPuzzle)
    })

    it('手がかりは、出どころの謎を解くまで問題文に書かれていない', () => {
      for (const id of scenario.puzzleOrder) {
        const puzzle = scenario.puzzles[id]
        for (const clue of puzzle.clues ?? []) {
          expect(puzzle.question).not.toContain(clue.text)
          expect(scenario.puzzleOrder).toContain(clue.from)
        }
      }
    })
  })
})

// 謎の答えが問題文の条件から一意に決まることを、総当たりで確かめる
describe.each(SCENARIOS)('謎の解が一意に決まる: $id', (scenario) => {
  const solvers = SOLVERS[scenario.id] ?? {}

  it('総当たりの関数が、すべての謎にある', () => {
    expect(Object.keys(solvers).sort()).toEqual([...scenario.puzzleOrder].sort())
  })

  it.each(scenario.puzzleOrder)('%s：解がちょうど 1 つで、その解で正解になる', (id) => {
    const solve = solvers[id]
    expect(solve, `${id} の総当たり関数が無い`).toBeDefined()
    const answers = solve()
    expect(answers).toHaveLength(1)
    expect(isCorrect(scenario.puzzles[id], answers[0])).toBe(true)
  })
})
