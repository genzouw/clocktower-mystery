import { describe, expect, it } from 'vitest'
import { clocktower } from '../game/scenarios/clocktower'
import { observatory } from '../game/scenarios/observatory'
import { floorLinks, floorOrder, newestFirst, otherFloors } from './notebookView'

describe('手帳と見取り図の純粋関数', () => {
  it('証拠は新しく記録した順に並び、元の配列は変わらない', () => {
    const src = ['a', 'b', 'c']
    expect(newestFirst(src)).toEqual(['c', 'b', 'a'])
    expect(src).toEqual(['a', 'b', 'c'])
  })

  it('階は地下から地上、名前の階の順に並ぶ', () => {
    expect(floorOrder(Object.values(clocktower.rooms))).toEqual(['B1', '1F', '2F', '塔'])
    expect(floorOrder(Object.values(observatory.rooms))).toEqual(['B1', '1F', '2F', '屋上'])
  })

  it('扉の線は、同じ階の部屋の組を向きによらず 1 本にする', () => {
    const rooms = Object.values(observatory.rooms)
    const links = floorLinks(rooms, '1F')
    const keys = links.map((l) => (l[0] < l[1] ? `${l[0]}-${l[1]}` : `${l[1]}-${l[0]}`))
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('corridor-entrance')
    expect(keys).toContain('corridor-lounge')
    // 階をまたぐ出口は線にしない
    expect(keys.some((k) => k.includes('study') || k.includes('storage'))).toBe(false)
  })

  it('別の階へ続く出口は、行き先の階だけを返す', () => {
    const order = floorOrder(Object.values(observatory.rooms))
    expect(otherFloors(observatory.rooms.corridor, observatory.rooms, order)).toEqual(['B1', '2F'])
    expect(otherFloors(observatory.rooms.entrance, observatory.rooms, order)).toEqual([])
  })
})
