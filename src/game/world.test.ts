import { describe, expect, it } from 'vitest'
import { ROOMS } from './rooms'
import type { RoomId } from './types'
import {
  LAYOUT,
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
    ].filter((q) => roomAt(q) && !blocked(q, world.colliders))
    for (const portal of world.portals) {
      if (isAtPortal(portal, p)) {
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

describe('館の間取り', () => {
  it('部屋が同じ場所に重なっていない', () => {
    const cells = Object.values(LAYOUT).map((c) => `${c.gx},${c.gz}`)
    expect(new Set(cells).size).toBe(cells.length)
  })

  it('東西南北の出口は、その方角の隣の部屋につながっている', () => {
    for (const room of Object.values(ROOMS)) {
      for (const exit of room.exits) {
        if (exit.dir === 'up' || exit.dir === 'down') continue
        expect(isAdjacentExit(room.id, exit), `${room.id} → ${exit.to}`).toBe(true)
      }
    }
  })

  it('初期位置と階段の出口は、壁や台座にめり込んでいない', () => {
    const world = buildWorld()
    for (const id of Object.keys(ROOMS) as RoomId[]) {
      const { pos } = spawnPoint(id)
      expect(blocked(pos, world.colliders), id).toBe(false)
      expect(roomAt(pos)).toBe(id)
    }
    for (const portal of world.portals) {
      const { pos } = portalArrival(world, portal.room, portal.exit)
      expect(blocked(pos, world.colliders), `${portal.room} → ${portal.exit.to}`).toBe(false)
      expect(roomAt(pos)).toBe(portal.exit.to)
    }
  })

  it('最初から、玄関から歩いて全部屋・全部の物に手が届く', () => {
    const world = buildWorld()
    const points = explore(world, spawnPoint('hall').pos)
    const reached = new Set(points.map((p) => roomAt(p)))
    expect([...reached].sort()).toEqual(Object.keys(ROOMS).sort())

    for (const room of Object.values(ROOMS)) {
      for (const h of room.hotspots) {
        const target = hotspotPosition(room.id, h)
        const reachable = points.some(
          (p) => Math.hypot(p.x - target.x, p.z - target.z) <= REACH - 0.3,
        )
        expect(reachable, `${room.id}/${h.id}`).toBe(true)
      }
    }
  })

  it('台座は部屋の内側に収まり、扉の通り道をふさがない', () => {
    const world = buildWorld()
    for (const room of Object.values(ROOMS)) {
      for (const h of room.hotspots) {
        const p = hotspotPosition(room.id, h)
        expect(roomAt(p), h.id).toBe(room.id)
        for (const d of world.doorways) {
          expect(Math.hypot(p.x - d.x, p.z - d.z), `${h.id} が扉の前にある`).toBeGreaterThan(1.2)
        }
      }
    }
  })
})

describe('階段の扉', () => {
  it('扉のある部屋の正面からだけ反応し、壁の裏の部屋からは反応しない', () => {
    const world = buildWorld()
    const up = world.portals.find((p) => p.room === 'corridor' && p.exit.dir === 'up')!
    // 廊下の北壁の扉。廊下側（南）からは反応し、壁の向こうの図書室からは反応しない
    expect(isAtPortal(up, { x: up.x, z: up.z + 0.5 })).toBe(true)
    expect(isAtPortal(up, { x: up.x, z: up.z - 0.6 })).toBe(false)
    expect(roomAt({ x: up.x, z: up.z - 0.6 })).toBe('library')
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
