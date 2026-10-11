import type { Exit, Hotspot, RoomId, Scenario, Side } from './types'

/** 部屋1つの一辺の長さ（m） */
export const ROOM_SIZE = 8
export const WALL_HEIGHT = 3.2
export const WALL_THICKNESS = 0.2
export const DOOR_WIDTH = 1.6
export const DOOR_HEIGHT = 2.4
export const PLAYER_RADIUS = 0.3
export const PLINTH_SIZE = 0.8

const SIDE_VECTOR: Record<Side, { dx: number; dz: number }> = {
  north: { dx: 0, dz: -1 },
  south: { dx: 0, dz: 1 },
  east: { dx: 1, dz: 0 },
  west: { dx: -1, dz: 0 },
}

export interface Vec2 {
  x: number
  z: number
}

/** XZ 平面の当たり判定用の箱（中心と半分の大きさ） */
export interface Box {
  x: number
  z: number
  hx: number
  hz: number
}

export interface WallSegment extends Box {
  room: RoomId
  /** 扉の上の垂れ壁なら下端の高さ */
  bottom: number
}

export interface Doorway {
  /** 扉の中心 */
  x: number
  z: number
  /** 壁が東西方向に伸びるなら 'x' */
  axis: 'x' | 'z'
  rooms: [RoomId, RoomId]
}

export interface Portal {
  room: RoomId
  exit: Exit
  /** 扉の表面の中心 */
  x: number
  z: number
  /** 扉が向いている方向（部屋の内側） */
  facing: Vec2
  axis: 'x' | 'z'
}

export interface World {
  walls: WallSegment[]
  doorways: Doorway[]
  portals: Portal[]
  /** 歩けない場所（壁・台座） */
  colliders: Box[]
  /** 部屋の配置（グリッド座標） */
  layout: Scenario['layout']
  /** グリッド座標 `${gx},${gz}` → その場所にある部屋 */
  cells: Map<string, RoomId>
}

export function roomCenter(world: Pick<World, 'layout'>, id: RoomId): Vec2 {
  const { gx, gz } = world.layout[id]
  return { x: gx * ROOM_SIZE, z: gz * ROOM_SIZE }
}

function roomAtCell(world: Pick<World, 'cells'>, gx: number, gz: number): RoomId | undefined {
  return world.cells.get(`${gx},${gz}`)
}

/** 座標がどの部屋の中にあるか */
export function roomAt(world: Pick<World, 'cells'>, p: Vec2): RoomId | undefined {
  return roomAtCell(world, Math.round(p.x / ROOM_SIZE), Math.round(p.z / ROOM_SIZE))
}

/** 東西南北の出口で、隣のセルにある部屋とつながっているか */
export function isAdjacentExit(
  world: Pick<World, 'layout' | 'cells'>,
  from: RoomId,
  exit: Exit,
): boolean {
  if (exit.dir === 'up' || exit.dir === 'down') return false
  const v = SIDE_VECTOR[exit.dir]
  const { gx, gz } = world.layout[from]
  return roomAtCell(world, gx + v.dx, gz + v.dz) === exit.to
}

export function hotspotPosition(world: Pick<World, 'layout'>, room: RoomId, h: Hotspot): Vec2 {
  const c = roomCenter(world, room)
  const span = ROOM_SIZE - 2
  return { x: c.x + (h.x / 100 - 0.5) * span, z: c.z + (h.y / 100 - 0.5) * span }
}

/** 壁の中心線上の点。offset は壁に沿った位置（北・南の壁なら x 方向） */
function wallPoint(world: Pick<World, 'layout'>, room: RoomId, side: Side, offset: number): Vec2 {
  const c = roomCenter(world, room)
  const v = SIDE_VECTOR[side]
  const half = ROOM_SIZE / 2
  return v.dz !== 0
    ? { x: c.x + offset, z: c.z + v.dz * half }
    : { x: c.x + v.dx * half, z: c.z + offset }
}

/** 部屋の配置と出口から、館の壁・扉・当たり判定を組み立てる */
export function buildWorld(scenario: Scenario): World {
  const { rooms, layout } = scenario
  const cells = new Map<string, RoomId>(
    Object.entries(layout).map(([id, c]) => [`${c.gx},${c.gz}`, id]),
  )
  const geometry = { layout, cells }
  const walls: WallSegment[] = []
  const doorways: Doorway[] = []
  const portals: Portal[] = []
  const half = ROOM_SIZE / 2
  const t = WALL_THICKNESS / 2

  for (const room of Object.values(rooms)) {
    const { gx, gz } = layout[room.id]
    for (const side of ['north', 'south', 'east', 'west'] as Side[]) {
      const v = SIDE_VECTOR[side]
      const neighbor = roomAtCell(geometry, gx + v.dx, gz + v.dz)
      // 隣り合う部屋の境目の壁は、北側・西側の部屋の分としてだけ作る
      if (neighbor && (side === 'south' || side === 'east')) continue

      const center = wallPoint(geometry, room.id, side, 0)
      const alongX = v.dz !== 0
      const segment = (from: number, to: number, bottom = 0): WallSegment => {
        const mid = (from + to) / 2
        const len = (to - from) / 2
        return alongX
          ? { room: room.id, x: center.x + mid, z: center.z, hx: len, hz: t, bottom }
          : { room: room.id, x: center.x, z: center.z + mid, hx: t, hz: len, bottom }
      }

      const crossing = neighbor
        ? [
            ...room.exits.filter((e) => e.to === neighbor && e.dir === side),
            ...rooms[neighbor].exits.filter(
              (e) => e.to === room.id && isAdjacentExit(geometry, neighbor, e),
            ),
          ]
        : []

      if (crossing.length === 0) {
        walls.push(segment(-half - t, half + t))
        continue
      }

      const d = DOOR_WIDTH / 2
      walls.push(segment(-half - t, -d), segment(d, half + t), segment(-d, d, DOOR_HEIGHT))
      doorways.push({
        x: center.x,
        z: center.z,
        axis: alongX ? 'x' : 'z',
        rooms: [room.id, neighbor!],
      })
    }

    for (const exit of room.exits) {
      if (isAdjacentExit(geometry, room.id, exit)) continue
      const place = scenario.portalPlaces[room.id]?.[exit.dir]
      if (!place) throw new Error(`転移扉の位置が未定義: ${room.id} ${exit.dir}`)
      const p = wallPoint(geometry, room.id, place.side, place.offset)
      const v = SIDE_VECTOR[place.side]
      portals.push({
        room: room.id,
        exit,
        // 壁の内側の面に貼り付ける
        x: p.x - v.dx * (t + 0.02),
        z: p.z - v.dz * (t + 0.02),
        facing: { x: -v.dx, z: -v.dz },
        axis: v.dz !== 0 ? 'x' : 'z',
      })
    }
  }

  const colliders: Box[] = walls
    .filter((w) => w.bottom === 0)
    .map(({ x, z, hx, hz }) => ({ x, z, hx, hz }))
  for (const room of Object.values(rooms)) {
    for (const h of room.hotspots) {
      const p = hotspotPosition(geometry, room.id, h)
      colliders.push({ x: p.x, z: p.z, hx: PLINTH_SIZE / 2, hz: PLINTH_SIZE / 2 })
    }
  }

  return { walls, doorways, portals, colliders, layout, cells }
}

function hits(p: Vec2, boxes: Box[], r: number): boolean {
  return boxes.some((b) => Math.abs(p.x - b.x) < b.hx + r && Math.abs(p.z - b.z) < b.hz + r)
}

/** 壁に沿って滑るように移動する。x と z を別々に判定する */
export function moveWithCollision(from: Vec2, delta: Vec2, boxes: Box[], r = PLAYER_RADIUS): Vec2 {
  let p = from
  const tryX = { x: p.x + delta.x, z: p.z }
  if (!hits(tryX, boxes, r)) p = tryX
  const tryZ = { x: p.x, z: p.z + delta.z }
  if (!hits(tryZ, boxes, r)) p = tryZ
  return p
}

/** 転移扉から出てきたときに立つ位置（扉の正面、少し離れた所） */
export function portalArrival(world: World, from: RoomId, exit: Exit): { pos: Vec2; yaw: number } {
  const back = world.portals.find((p) => p.room === exit.to && p.exit.to === from)
  if (!back) {
    const c = roomCenter(world, exit.to)
    return { pos: { x: c.x, z: c.z + 1.5 }, yaw: 0 }
  }
  const pos = { x: back.x + back.facing.x * 1.6, z: back.z + back.facing.z * 1.6 }
  return { pos, yaw: yawFacing(back.facing) }
}

/** 階段の扉にこの距離まで近づくと、別の階へ移る */
export const TRIGGER_DISTANCE = 0.9

/**
 * 階段の扉の前に立っているか。扉は壁に貼り付いているので、
 * 壁の向こう側の部屋から近づいても反応しないよう、扉のある部屋の正面側だけを見る
 */
export function isAtPortal(world: Pick<World, 'cells'>, portal: Portal, p: Vec2): boolean {
  if (roomAt(world, p) !== portal.room) return false
  const dx = p.x - portal.x
  const dz = p.z - portal.z
  return dx * portal.facing.x + dz * portal.facing.z > 0 && Math.hypot(dx, dz) <= TRIGGER_DISTANCE
}

/** 向きベクトル → カメラの yaw（0 で北 = -z を向く） */
export function yawFacing(v: Vec2): number {
  return Math.atan2(-v.x, -v.z)
}

/** 部屋に入ったときの初期位置（南寄りに立ち、北を向く） */
export function spawnPoint(world: Pick<World, 'layout'>, room: RoomId): { pos: Vec2; yaw: number } {
  const c = roomCenter(world, room)
  return { pos: { x: c.x, z: c.z + ROOM_SIZE * 0.3 }, yaw: 0 }
}
