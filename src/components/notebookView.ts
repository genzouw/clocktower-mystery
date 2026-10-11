import type { Room, RoomId } from '../game/types'

/** 新しく記録した証拠を先頭にする。記録順の配列を壊さない */
export function newestFirst<T>(items: readonly T[]): T[] {
  return [...items].reverse()
}

/** 階の並び。地下 → 地上（番号順）→ 塔・屋上など名前の階（部屋の定義順）の順に、下から上へ */
export function floorOrder(rooms: Pick<Room, 'floor'>[]): string[] {
  const floors = [...new Set(rooms.map((r) => r.floor))]
  const rank = (f: string, i: number): number => {
    const basement = /^B(\d+)$/.exec(f)
    if (basement) return -Number(basement[1])
    const above = /^(\d+)F$/.exec(f)
    if (above) return Number(above[1])
    return 1000 + i
  }
  return floors
    .map((f, i) => ({ f, r: rank(f, i) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.f)
}

/** 同じ階の中で、扉でつながる部屋の組（向きによらず 1 本） */
export function floorLinks(rooms: Room[], floor: string): [RoomId, RoomId][] {
  const onFloor = new Map(rooms.filter((r) => r.floor === floor).map((r) => [r.id, r]))
  const seen = new Set<string>()
  const links: [RoomId, RoomId][] = []
  for (const r of onFloor.values()) {
    for (const exit of r.exits) {
      if (!onFloor.has(exit.to)) continue
      const key = [r.id, exit.to].sort().join('\u0000')
      if (seen.has(key)) continue
      seen.add(key)
      links.push([r.id, exit.to])
    }
  }
  return links
}

/** 別の階へ続く出口がある階の一覧（重複なし、並びは階の並び） */
export function otherFloors(room: Room, rooms: Record<RoomId, Room>, order: string[]): string[] {
  const floors = new Set(
    room.exits.map((e) => rooms[e.to]?.floor).filter((f): f is string => !!f && f !== room.floor),
  )
  return order.filter((f) => floors.has(f))
}
