import { describe, expect, it } from 'vitest'
import { SCENARIOS } from './scenarios'
import type { RoomId } from './types'
import {
  PLAYER_RADIUS,
  ROOM_SIZE,
  buildWorld,
  hotspotPosition,
  isAdjacentExit,
  isAtPortal,
  moveWithCollision,
  portalArrival,
  roomAt,
  spawnPoint,
  type Box,
  type Vec2,
  type World,
} from './world'

const REACH = 2.8
const STEP = 0.25

const blocked = (p: Vec2, boxes: Box[]) =>
  boxes.some(
    (b) => Math.abs(p.x - b.x) < b.hx + PLAYER_RADIUS && Math.abs(p.z - b.z) < b.hz + PLAYER_RADIUS,
  )

/** 格子上を幅優先で歩き回り、たどり着ける地点をすべて集める。転移扉は近づくと移動する */
function explore(world: World, start: Vec2): Vec2[] {
  const key = (p: Vec2) => `${Math.round(p.x / STEP)},${Math.round(p.z / STEP)}`
  const seen = new Map<string, Vec2>([[key(start), start]])
  const queue = [start]
  while (queue.length) {
    const p = queue.shift()!
    const next: Vec2[] = [
      { x: p.x + STEP, z: p.z },
      { x: p.x - STEP, z: p.z },
      { x: p.x, z: p.z + STEP },
      { x: p.x, z: p.z - STEP },
    ].filter((q) => roomAt(world, q) && !blocked(q, world.colliders))
    for (const portal of world.portals) {
      if (isAtPortal(world, portal, p)) {
        next.push(portalArrival(world, portal.room, portal.exit).pos)
      }
    }
    for (const q of next) {
      if (seen.has(key(q))) continue
      seen.set(key(q), q)
      queue.push(q)
    }
  }
  return [...seen.values()]
}

describe.each(SCENARIOS)('館の間取り: $id', (scenario) => {
  const rooms = Object.values(scenario.rooms)
  const world = buildWorld(scenario)

  it('部屋が同じ場所に重なっていない', () => {
    const cells = Object.values(scenario.layout).map((c) => `${c.gx},${c.gz}`)
    expect(new Set(cells).size).toBe(cells.length)
  })

  it('東西南北の出口は、その方角の隣の部屋につながっている', () => {
    for (const room of rooms) {
      for (const exit of room.exits) {
        if (exit.dir === 'up' || exit.dir === 'down') continue
        expect(isAdjacentExit(world, room.id, exit), `${room.id} → ${exit.to}`).toBe(true)
      }
    }
  })

  it('初期位置と階段の出口は、壁や台座にめり込んでいない', () => {
    for (const id of Object.keys(scenario.rooms) as RoomId[]) {
      const { pos } = spawnPoint(world, id)
      expect(blocked(pos, world.colliders), id).toBe(false)
      expect(roomAt(world, pos)).toBe(id)
    }
    for (const portal of world.portals) {
      const { pos } = portalArrival(world, portal.room, portal.exit)
      expect(blocked(pos, world.colliders), `${portal.room} → ${portal.exit.to}`).toBe(false)
      expect(roomAt(world, pos)).toBe(portal.exit.to)
    }
  })

  it('最初から、開始の部屋から歩いて全部屋・全部の物に手が届く', () => {
    const points = explore(world, spawnPoint(world, scenario.startRoom).pos)
    const reached = new Set(points.map((p) => roomAt(world, p)))
    expect([...reached].sort()).toEqual(Object.keys(scenario.rooms).sort())

    for (const room of rooms) {
      for (const h of room.hotspots) {
        const target = hotspotPosition(world, room.id, h)
        const reachable = points.some(
          (p) => Math.hypot(p.x - target.x, p.z - target.z) <= REACH - 0.3,
        )
        expect(reachable, `${room.id}/${h.id}`).toBe(true)
      }
    }
  })

  it('台座は部屋の内側に収まり、扉の通り道をふさがない', () => {
    for (const room of rooms) {
      for (const h of room.hotspots) {
        const p = hotspotPosition(world, room.id, h)
        expect(roomAt(world, p), h.id).toBe(room.id)
        for (const d of world.doorways) {
          expect(Math.hypot(p.x - d.x, p.z - d.z), `${h.id} が扉の前にある`).toBeGreaterThan(1.2)
        }
      }
    }
  })

  it('階段の扉は、扉のある部屋の正面からだけ反応し、壁の裏からは反応しない', () => {
    for (const portal of world.portals) {
      const at = (d: number): Vec2 => ({
        x: portal.x + portal.facing.x * d,
        z: portal.z + portal.facing.z * d,
      })
      const name = `${portal.room} → ${portal.exit.to}`
      expect(isAtPortal(world, portal, at(0.5)), name).toBe(true)
      expect(isAtPortal(world, portal, at(-0.6)), name).toBe(false)
    }
  })
})

describe('当たり判定', () => {
  const wall: Box = { x: 0, z: -1, hx: 5, hz: 0.1 }

  it('壁にぶつかると止まり、壁に沿っては進める', () => {
    const p = moveWithCollision({ x: 0, z: 0 }, { x: 0.5, z: -0.8 }, [wall])
    expect(p.x).toBeCloseTo(0.5)
    expect(p.z).toBe(0)
  })

  it('部屋の大きさは扉の幅より十分に大きい', () => {
    expect(ROOM_SIZE).toBeGreaterThan(4)
  })
})
