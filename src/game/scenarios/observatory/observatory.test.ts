import { describe, expect, it } from 'vitest'
import { isUnlocked } from '../../scenario'
import { hotspotAction, hotspotAppearance, isTitleHidden, tapOutcome } from '../../hotspot'
import { initialState, reducerFor } from '../../state'
import type { Hotspot, PuzzleId, RoomId } from '../../types'
import { buildWorld } from '../../world'
import { observatory } from '.'
import { PAINTINGS, solvers } from './solve'

// シナリオ 2 の部屋と配置の検証。構造・歩いて届くこと・解の一意性は、scenarios.test.ts と
// world.test.ts が全シナリオに対して確かめる。ここでは、このシナリオ固有の配置と文面を確かめる
const rooms = Object.values(observatory.rooms)
const hotspots = rooms.flatMap((r) => r.hotspots.map((h) => ({ room: r.id, h })))
const findHotspot = (puzzle: PuzzleId) => hotspots.find(({ h }) => h.puzzle === puzzle)!

/** 出口をたどって、開始の部屋から行ける部屋（鍵のかかった扉は無い） */
function reachableRooms(): Set<RoomId> {
  const seen = new Set<RoomId>([observatory.startRoom])
  const queue = [observatory.startRoom]
  while (queue.length) {
    for (const exit of observatory.rooms[queue.shift()!].exits) {
      if (!seen.has(exit.to)) {
        seen.add(exit.to)
        queue.push(exit.to)
      }
    }
  }
  return seen
}

describe('シナリオ 2：雪の天文台と消えた彗星 — 部屋と配置', () => {
  it('部屋は 11 室で、謎は 12 問、難易度は 3、目印は hidden', () => {
    expect(rooms).toHaveLength(11)
    expect(observatory.puzzleOrder).toHaveLength(12)
    expect(observatory.difficulty).toBe(3)
    expect(observatory.hotspotMarkers).toBe('hidden')
    expect(observatory.startRoom).toBe('entrance')
    expect(observatory.finalPuzzle).toBe('q12')
  })

  it('各部屋に、謎の無い物が 2 つ以上ある', () => {
    for (const room of rooms) {
      const plain = room.hotspots.filter((h) => !h.puzzle)
      expect(plain.length, room.name).toBeGreaterThanOrEqual(2)
    }
  })

  it('謎は doc-2 の部屋に 1 つずつ置かれている', () => {
    const where: Record<PuzzleId, RoomId> = {
      q1: 'entrance',
      q2: 'lounge',
      q3: 'darkroom',
      q4: 'study',
      q5: 'study',
      q6: 'corridor',
      q7: 'kitchen',
      q8: 'guest',
      q9: 'storage',
      q10: 'dining',
      q11: 'dome',
      q12: 'dome',
    }
    for (const [id, room] of Object.entries(where)) expect(findHotspot(id).room, id).toBe(room)
  })

  it('物の ID は全体で一意で、名前も部屋の中で重ならない', () => {
    const ids = hotspots.map(({ h }) => h.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const room of rooms) {
      const names = room.hotspots.map((h) => h.name)
      expect(new Set(names).size, room.name).toBe(names.length)
    }
  })

  it('見取り図は 3 列に収まり、部屋の座標が重ならない', () => {
    const cells = rooms.map((r) => `${r.map.x},${r.map.y}`)
    expect(new Set(cells).size).toBe(cells.length)
    expect(Math.max(...rooms.map((r) => r.map.x)) + 1).toBe(3)
  })

  it('階段の扉が 6 つあり、出口をたどって全部屋に行ける', () => {
    const world = buildWorld(observatory)
    expect(world.portals).toHaveLength(6)
    expect(reachableRooms().size).toBe(rooms.length)
  })
})

describe('シナリオ 2 — 伏せる謎（concealed）', () => {
  const concealed = hotspots.filter(({ h }) => h.concealed)

  it('伏せる物は q6（廊下の油絵）と q9（地下倉庫の配電盤）だけ', () => {
    expect(concealed.map(({ h }) => h.puzzle).sort()).toEqual(['q6', 'q9'])
  })

  it('伏せる謎は前提が 1 つ以上あり、前提を解くまでは説明文を見せるだけの普通の物になる', () => {
    for (const { h } of concealed) {
      const id = h.puzzle!
      expect(isUnlocked(observatory, id, []), id).toBe(false)
      expect(h.text.length, id).toBeGreaterThan(0)
      expect(hotspotAction(observatory, h, []), id).toEqual({ kind: 'look' })
      expect(tapOutcome(observatory, h, { solved: [], evidence: [] }).kind, id).toBe('look')
    }
  })

  it('q6 は q5 を、q9 は q6 と q2 を解くと開く', () => {
    const q6 = findHotspot('q6').h
    const q9 = findHotspot('q9').h
    expect(hotspotAction(observatory, q6, ['q4', 'q3'])).toEqual({ kind: 'look' })
    expect(hotspotAction(observatory, q6, ['q3', 'q4', 'q5'])).toEqual({ kind: 'puzzle', id: 'q6' })
    expect(hotspotAction(observatory, q9, ['q1', 'q3', 'q4', 'q5', 'q6'])).toEqual({ kind: 'look' })
    expect(hotspotAction(observatory, q9, ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'])).toEqual({
      kind: 'puzzle',
      id: 'q9',
    })
  })

  it('解く前の説明文は、謎の存在を書かず、「不自然」「今はすべて入っている」だけを示す', () => {
    expect(findHotspot('q6').h.text).toContain('どこか不自然だ')
    expect(findHotspot('q9').h.text).toContain('今はすべて入っている')
  })

  it('どの状態でも、輪も【謎】の名札も出さず、未開の謎の題名は伏せる', () => {
    const states: PuzzleId[][] = [[], ['q1'], observatory.puzzleOrder.filter((id) => id !== 'q12')]
    for (const solved of states) {
      for (const { h } of hotspots) {
        const a = hotspotAppearance(observatory, h, solved)
        expect(a, h.id).toEqual({
          prefix: '',
          labelColor: undefined,
          ringColor: null,
          pulse: false,
        })
      }
    }
    expect(isTitleHidden(observatory, [], [], 'q1')).toBe(true)
    expect(isTitleHidden(observatory, ['q1'], [], 'q1')).toBe(false)
  })
})

describe('シナリオ 2 — 証拠の取れる物', () => {
  const evidenceHotspots: Record<string, RoomId> = {
    clockcare: 'kitchen',
    soles: 'storage',
    footprint: 'dome',
    brooch: 'dome',
    stargazing: 'study',
  }

  it('観察で取れる証拠は、それぞれ doc-2 の部屋の物にあり、謎の無い物に付いている', () => {
    const found: Record<string, RoomId> = {}
    for (const { room, h } of hotspots) {
      if (!h.evidence) continue
      found[h.evidence] = room
      expect(h.puzzle, h.id).toBeUndefined()
      expect(h.concealed, h.id).toBeUndefined()
    }
    expect(found).toEqual(evidenceHotspots)
  })

  it('その部屋は、謎を 1 つも解かなくても行ける（鍵や前提が要らない）', () => {
    const reachable = reachableRooms()
    for (const room of Object.values(evidenceHotspots)) expect(reachable.has(room), room).toBe(true)
  })

  it('q12 を除く全部を解く前に、5 つの証拠をすべて手帳に記録できる', () => {
    const reduce = reducerFor(observatory)
    let state = initialState(observatory)
    for (const { h } of hotspots) {
      const outcome = tapOutcome(observatory, h, state)
      if (outcome.kind === 'look' && outcome.collect) {
        state = reduce(state, { type: 'collect', id: outcome.collect })
      }
    }
    for (const id of Object.keys(evidenceHotspots)) expect(state.evidence, id).toContain(id)
    expect(state.solved).toEqual([])
  })

  it('q1 は、厨房の手入れ帳を調べる前から解ける状態になっており、手入れ帳は q1 の前提を持たない', () => {
    expect(isUnlocked(observatory, 'q1', [])).toBe(true)
    const h = hotspots.find(({ h }) => h.evidence === 'clockcare')!.h
    expect(tapOutcome(observatory, h, { solved: [], evidence: [] }).kind).toBe('look')
  })
})

describe('シナリオ 2 — q11 の星座の絵', () => {
  const signedName = (by: string) => (by === '博士' ? '博士の署名' : `${by}の署名`)

  it('5 枚の絵が、PAINTINGS と同じ部屋・署名・星の数で置かれている', () => {
    for (const p of PAINTINGS) {
      const name = ({ '♈': '牡羊座', '♋': '蟹座', '♎': '天秤座', '♑': '山羊座' } as const)[
        p.symbol as '♈' | '♋' | '♎' | '♑'
      ]
      const room = rooms.find((r) => r.name === p.place)
      expect(room, p.place).toBeDefined()
      const matches = room!.hotspots.filter((h) => h.name.includes(name))
      expect(matches, `${p.place} の ${name}`).toHaveLength(1)
      const text = matches[0].text
      expect(text, `${p.place} の ${name}`).toContain(signedName(p.signedBy))
      expect(text, `${p.place} の ${name}`).toContain(`星が ${p.stars}つ描かれている`)
      // ほかの署名や星の数が紛れ込んでいない
      const otherSigns = ['博士', '画家'].filter((s) => s !== p.signedBy)
      for (const s of otherSigns) expect(text).not.toContain(`${s}の署名`)
    }
  })

  it('星座の絵は、PAINTINGS の 5 枚だけ', () => {
    const paintingHotspots = hotspots.filter(
      ({ h }) => /の(絵|版画)$/.test(h.name) && h.id !== 'corridor-painting',
    )
    expect(paintingHotspots).toHaveLength(PAINTINGS.length)
  })
})

describe('シナリオ 2 — 答えの漏えいと q9 の明暗', () => {
  const texts = (h: Hotspot) => `${h.name}${h.text}`

  it('導入文・遊び方・部屋の説明・物の文に、停電の時刻（q1 の答え）を書かない', () => {
    const all = [
      observatory.lead.join(''),
      observatory.howto.join(''),
      observatory.initialEvidence.map((id) => observatory.evidence[id].text).join(''),
      ...rooms.map((r) => `${r.description}${r.hotspots.map(texts).join('')}`),
    ].join('\n')
    expect(all).not.toMatch(/23\s*時\s*40|23:40|2340/)
  })

  it('最初の証拠（case）にも停電の時刻を書かない', () => {
    expect(observatory.evidence.case.text).not.toMatch(/23\s*時\s*40|23:40|2340/)
  })

  it('暗室の説明に、停電のあいだの明暗を書かない（q9 の根拠は q2 の手がかりだけ）', () => {
    const room = observatory.rooms.darkroom
    const all = `${room.description}${room.hotspots.map(texts).join('')}`
    expect(all).not.toMatch(/停電|暗い|暗かった|明るい|明るかった|点いて|消えて|灯って/)
    // q9 は、暗室の明るさを q2 の手がかりから得る
    expect(observatory.puzzles.q9.clues?.some((c) => c.from === 'q2')).toBe(true)
  })

  it('q9 が明暗を述べる部屋（玄関・談話室・書庫・ドーム・厨房）の説明に、明るさを書かない', () => {
    for (const id of ['entrance', 'lounge', 'archive', 'dome', 'kitchen']) {
      const room = observatory.rooms[id]
      const all = `${room.description}${room.hotspots.map(texts).join('')}`
      expect(all, id).not.toMatch(/暗かった|明るかった|点いて|消えて|灯って|真っ暗/)
    }
  })

  it('導入文・遊び方に、輪や【謎】の名札を前提にした書き方がない', () => {
    const all = [...observatory.lead, ...observatory.howto].join('')
    expect(all).not.toMatch(/光る|輪|【謎】|金色/)
  })
})

describe('シナリオ 2 — 通しで遊べる', () => {
  it('総当たりの解を、依存の順に入力すると、q12 まで解いてエンディングになる', () => {
    const reduce = reducerFor(observatory)
    let state = reduce(initialState(observatory), { type: 'start' })
    const remaining = [...observatory.puzzleOrder]
    while (remaining.length) {
      const next = remaining.find((id) => isUnlocked(observatory, id, state.solved))
      expect(next, `詰まった: 残り ${remaining.join(',')}`).toBeDefined()
      const answers = solvers[next!]()
      expect(answers).toHaveLength(1)
      state = reduce(state, { type: 'solve', id: next! })
      remaining.splice(remaining.indexOf(next!), 1)
    }
    expect(state.cleared).toBe(true)
    // 謎の報酬は、すべて手帳に入る
    for (const id of observatory.puzzleOrder) {
      const reward = observatory.puzzles[id].reward
      if (reward) expect(state.evidence).toContain(reward)
    }
  })
})
