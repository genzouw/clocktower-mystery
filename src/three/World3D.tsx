import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Mesh, PointLight, Sprite } from 'three'
import { ROOMS } from '../game/rooms'
import type { Hotspot, PuzzleId, RoomId } from '../game/types'
import {
  DOOR_HEIGHT,
  DOOR_WIDTH,
  PLINTH_SIZE,
  ROOM_SIZE,
  THEME,
  WALL_HEIGHT,
  buildWorld,
  TRIGGER_DISTANCE,
  hotspotPosition,
  isAtPortal,
  portalArrival,
  roomAt,
  roomCenter,
  spawnPoint,
  type Portal,
  type World,
} from '../game/world'
import { Joystick } from './Joystick'
import { PlayerRig } from './playerRig'
import { emojiTexture, labelTexture } from './textures'

const EYE_HEIGHT = 1.6
const WALK_SPEED = 2.6
const TURN_SPEED = 2
const LOOK_SPEED = 0.005
/** これより遠い物はタップしても調べられない */
const REACH = 2.8
/** タップとドラッグを見分けるしきい値（px） */
const TAP_SLOP = 10

interface Props {
  room: RoomId
  solved: PuzzleId[]
  paused: boolean
  onRoomChange: (room: RoomId) => void
  onHotspot: (room: RoomId, h: Hotspot) => void
  onLocked: (text: string) => void
  onToast: (text: string) => void
  onFirstMove: () => void
}

export function World3D(props: Props) {
  const world = useMemo(() => buildWorld(props.solved), [props.solved])
  const [rig] = useState(() => new PlayerRig(spawnPoint(props.room)))
  const stick = useRef({ x: 0, y: 0 })
  const look = useRef<{ id: number; x: number; y: number } | null>(null)
  // フレームループから最新の props を参照するための入れ物
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })

  // 開発時だけ、自動操作の通しプレイから位置と向きを読めるようにする（本番ビルドでは消える）
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __clocktowerRig: rig })
  }, [rig])

  // セーブデータの読み込みやリセットで部屋が変わったら、その部屋へ移す
  useEffect(() => {
    if (roomAt(rig.pos) !== props.room) rig.placeAt(spawnPoint(props.room))
  }, [rig, props.room])

  const enterPortal = (portal: Portal) => {
    if (portal.locked) {
      latest.current.onLocked(portal.exit.lockedText ?? '扉は開かない。')
      return
    }
    rig.placeAt(portalArrival(world, portal.room, portal.exit))
    latest.current.onRoomChange(portal.exit.to)
  }

  const tapHotspot = (room: RoomId, h: Hotspot) => {
    if (rig.distanceTo(hotspotPosition(room, h)) > REACH)
      latest.current.onToast('もっと近づいて調べよう')
    else latest.current.onHotspot(room, h)
  }

  return (
    <div
      className="world"
      onPointerDown={(e) => {
        if (look.current) return
        look.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        const l = look.current
        if (!l || l.id !== e.pointerId || latest.current.paused) return
        rig.look(-(e.clientX - l.x) * LOOK_SPEED, -(e.clientY - l.y) * LOOK_SPEED)
        look.current = { ...l, x: e.clientX, y: e.clientY }
      }}
      onPointerUp={(e) => {
        if (look.current?.id === e.pointerId) look.current = null
      }}
      onPointerCancel={() => (look.current = null)}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.05, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0b0810']} />
        <fog attach="fog" args={['#0b0810', 6, 22]} />
        <hemisphereLight args={['#ffe2b0', '#2a1c22', 1.5]} />
        <ambientLight intensity={0.25} />
        <PlayerController
          rig={rig}
          stick={stick}
          world={world}
          latest={latest}
          onPortal={enterPortal}
        />
        <Rooms />
        <Walls world={world} />
        <Doorways world={world} />
        <Portals world={world} onTap={enterPortal} />
        <Hotspots solved={props.solved} onTap={tapHotspot} />
      </Canvas>
      <Joystick onChange={(v) => (stick.current = v)} />
    </div>
  )
}

/** キーボード（PC 向け）の押下状態 */
function useKeys() {
  const keys = useRef(new Set<string>())
  useEffect(() => {
    const pressed = keys.current
    const down = (e: KeyboardEvent) => pressed.add(e.key.toLowerCase())
    const up = (e: KeyboardEvent) => pressed.delete(e.key.toLowerCase())
    const clear = () => pressed.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])
  return keys
}

function PlayerController({
  rig,
  stick,
  world,
  latest,
  onPortal,
}: {
  rig: PlayerRig
  stick: React.RefObject<{ x: number; y: number }>
  world: World
  latest: React.RefObject<Props>
  onPortal: (p: Portal) => void
}) {
  const camera = useThree((s) => s.camera)
  const lantern = useRef<PointLight>(null)
  const keys = useKeys()
  /** 近づいた瞬間だけ反応させるため、いま近くにある扉を覚えておく */
  const near = useRef(new Set<string>())
  const moved = useRef(false)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const props = latest.current

    if (!props.paused) {
      const k = keys.current
      let forward = -stick.current.y
      let strafe = stick.current.x
      if (k.has('w') || k.has('arrowup')) forward += 1
      if (k.has('s') || k.has('arrowdown')) forward -= 1
      if (k.has('a')) strafe -= 1
      if (k.has('d')) strafe += 1
      if (k.has('arrowleft')) rig.look(TURN_SPEED * dt, 0)
      if (k.has('arrowright')) rig.look(-TURN_SPEED * dt, 0)
      if (rig.walk(forward, strafe, WALK_SPEED * dt, world.colliders) && !moved.current) {
        moved.current = true
        props.onFirstMove()
      }

      const here = roomAt(rig.pos)
      if (here && here !== props.room) props.onRoomChange(here)

      const nowNear = new Set<string>()
      for (const portal of world.portals) {
        if (!isAtPortal(portal, rig.pos)) continue
        const key = `portal:${portal.room}:${portal.exit.dir}`
        nowNear.add(key)
        if (!near.current.has(key)) onPortal(portal)
      }
      for (const door of world.doorways) {
        if (!door.locked || rig.distanceTo(door) > TRIGGER_DISTANCE) continue
        const key = `door:${door.x},${door.z}`
        nowNear.add(key)
        if (!near.current.has(key)) props.onLocked(door.lockedText)
      }
      near.current = nowNear
    }

    camera.position.set(rig.pos.x, EYE_HEIGHT, rig.pos.z)
    camera.rotation.set(rig.pitch, rig.yaw, 0, 'YXZ')
    lantern.current?.position.set(rig.pos.x, EYE_HEIGHT + 0.3, rig.pos.z)
  })

  return <pointLight ref={lantern} color="#ffcf8a" intensity={14} distance={11} decay={2} />
}

function Rooms() {
  return (
    <>
      {Object.values(ROOMS).map((room) => {
        const c = roomCenter(room.id)
        return (
          <group key={room.id} position={[c.x, 0, c.z]}>
            <mesh rotation-x={-Math.PI / 2}>
              <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
              <meshLambertMaterial color={THEME[room.id].floor} />
            </mesh>
            <mesh rotation-x={Math.PI / 2} position-y={WALL_HEIGHT}>
              <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
              <meshLambertMaterial color="#4a3a40" emissive="#140d10" />
            </mesh>
            {/* 天井から吊るしたランプ。部屋ごとの雰囲気づくり */}
            <mesh position-y={WALL_HEIGHT - 0.5}>
              <cylinderGeometry args={[0.01, 0.01, 1, 4]} />
              <meshBasicMaterial color="#2a2024" />
            </mesh>
            <mesh position-y={WALL_HEIGHT - 1}>
              <sphereGeometry args={[0.09, 12, 12]} />
              <meshBasicMaterial color="#ffd27a" />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

function Walls({ world }: { world: World }) {
  return (
    <>
      {world.walls.map((w, i) => {
        const height = WALL_HEIGHT - w.bottom
        return (
          <mesh key={i} position={[w.x, w.bottom + height / 2, w.z]}>
            <boxGeometry args={[w.hx * 2, height, w.hz * 2]} />
            <meshLambertMaterial color={THEME[w.room].wall} />
          </mesh>
        )
      })}
    </>
  )
}

function Label({
  text,
  position,
  height = 0.26,
  color,
}: {
  text: string
  position: [number, number, number]
  height?: number
  color?: string
}) {
  const { texture, aspect } = labelTexture(text, color)
  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

function Emoji({
  emoji,
  position,
  size = 0.7,
}: {
  emoji: string
  position: [number, number, number]
  size?: number
}) {
  const { texture } = emojiTexture(emoji)
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

/** 扉の上の行き先看板と、鍵の掛かった扉 */
function Doorways({ world }: { world: World }) {
  return (
    <>
      {world.doorways.map((d) => {
        const normal = d.axis === 'x' ? { x: 0, z: 1 } : { x: 1, z: 0 }
        return (
          <group key={`${d.x},${d.z}`}>
            {d.rooms.map((room) => {
              // 看板はその部屋の側に出し、向こう側の部屋の名前を書く
              const other = d.rooms.find((r) => r !== room)!
              const c = roomCenter(room)
              const sign = Math.sign((c.x - d.x) * normal.x + (c.z - d.z) * normal.z)
              return (
                <Label
                  key={room}
                  text={ROOMS[other].name}
                  position={[
                    d.x + normal.x * sign * 0.3,
                    DOOR_HEIGHT + 0.35,
                    d.z + normal.z * sign * 0.3,
                  ]}
                />
              )
            })}
            {d.locked && (
              <>
                <mesh position={[d.x, DOOR_HEIGHT / 2, d.z]}>
                  <boxGeometry
                    args={
                      d.axis === 'x'
                        ? [DOOR_WIDTH, DOOR_HEIGHT, 0.12]
                        : [0.12, DOOR_HEIGHT, DOOR_WIDTH]
                    }
                  />
                  <meshLambertMaterial color="#5a3418" />
                </mesh>
                {[-1, 1].map((s) => (
                  <Emoji
                    key={s}
                    emoji="🔒"
                    size={0.4}
                    position={[d.x + normal.x * s * 0.2, 1.3, d.z + normal.z * s * 0.2]}
                  />
                ))}
              </>
            )}
          </group>
        )
      })}
    </>
  )
}

/** 階段へ続く扉。近づくかタップすると別の階へ移る */
function Portals({ world, onTap }: { world: World; onTap: (p: Portal) => void }) {
  return (
    <>
      {world.portals.map((p) => {
        const stairs = p.exit.dir === 'up' ? '上り階段' : p.exit.dir === 'down' ? '下り階段' : '扉'
        const front = (d: number): [number, number] => [p.x + p.facing.x * d, p.z + p.facing.z * d]
        const [lx, lz] = front(0.3)
        const [ex, ez] = front(0.15)
        return (
          <group key={`${p.room}:${p.exit.dir}`}>
            <mesh
              position={[p.x, 1.1, p.z]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                if (e.delta > TAP_SLOP) return
                e.stopPropagation()
                onTap(p)
              }}
            >
              <boxGeometry args={p.axis === 'x' ? [1.3, 2.2, 0.06] : [0.06, 2.2, 1.3]} />
              <meshLambertMaterial color={p.locked ? '#3a2412' : '#1a0f08'} />
            </mesh>
            <Label text={`${stairs}：${p.exit.label}`} position={[lx, 2.55, lz]} color="#e0b354" />
            <Emoji
              emoji={p.locked ? '🔒' : p.exit.dir === 'down' ? '⬇️' : '⬆️'}
              size={0.45}
              position={[ex, 1.3, ez]}
            />
          </group>
        )
      })}
    </>
  )
}

function Hotspots({
  solved,
  onTap,
}: {
  solved: PuzzleId[]
  onTap: (room: RoomId, h: Hotspot) => void
}) {
  return (
    <>
      {Object.values(ROOMS).flatMap((room) =>
        room.hotspots.map((h) => (
          <HotspotObject
            key={h.id}
            room={room.id}
            hotspot={h}
            done={h.puzzle ? solved.includes(h.puzzle) : false}
            onTap={onTap}
          />
        )),
      )}
    </>
  )
}

function HotspotObject({
  room,
  hotspot,
  done,
  onTap,
}: {
  room: RoomId
  hotspot: Hotspot
  done: boolean
  onTap: (room: RoomId, h: Hotspot) => void
}) {
  const p = hotspotPosition(room, hotspot)
  const icon = useRef<Sprite>(null)
  const ring = useRef<Mesh>(null)
  const isPuzzle = hotspot.puzzle !== undefined
  const plinthHeight = 0.9
  // 位置ごとに位相をずらして、すべての物が揃って揺れないようにする
  const phase = (p.x * 7 + p.z * 13) % (Math.PI * 2)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    if (icon.current) icon.current.position.y = plinthHeight + 0.45 + Math.sin(t * 2) * 0.05
    if (ring.current && isPuzzle && !done) {
      const s = 1 + Math.sin(t * 3) * 0.12
      ring.current.scale.set(s, s, 1)
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > TAP_SLOP) return
    e.stopPropagation()
    onTap(room, hotspot)
  }

  const { texture } = emojiTexture(hotspot.emoji)
  const label = isPuzzle ? `${done ? '【解決】' : '【謎】'}${hotspot.name}` : hotspot.name
  const labelColor = isPuzzle ? (done ? '#7cc49a' : '#e0b354') : undefined

  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position-y={plinthHeight / 2} onClick={handleClick}>
        <boxGeometry args={[PLINTH_SIZE, plinthHeight, PLINTH_SIZE]} />
        <meshLambertMaterial color="#3a2616" />
      </mesh>
      {isPuzzle && (
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={plinthHeight + 0.01}>
          <ringGeometry args={[0.26, 0.34, 32]} />
          <meshBasicMaterial color={done ? '#7cc49a' : '#e0b354'} />
        </mesh>
      )}
      <sprite
        ref={icon}
        position-y={plinthHeight + 0.45}
        scale={[0.75, 0.75, 1]}
        onClick={handleClick}
      >
        <spriteMaterial map={texture} transparent depthWrite={false} />
      </sprite>
      <Label text={label} position={[0, plinthHeight + 1.05, 0]} height={0.22} color={labelColor} />
    </group>
  )
}
