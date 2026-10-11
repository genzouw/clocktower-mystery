import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { AdditiveBlending, Vector3 } from 'three'
import type { Group, Mesh, MeshBasicMaterial, PointLight, Sprite, SpriteMaterial } from 'three'
import { hotspotAppearance, type HotspotAppearance } from '../game/hotspot'
import type { Hotspot, PuzzleId, RoomId, Scenario } from '../game/types'
import {
  DOOR_HEIGHT,
  PLINTH_SIZE,
  ROOM_SIZE,
  WALL_HEIGHT,
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
import { labelDistanceScale, labelPixelRatio, reachEmphasis } from './labelStyle'
import { emojiTexture, glowTexture, labelTexture } from './textures'

/** 名札の距離の計算に使う作業用ベクトル */
const worldPoint = new Vector3()

const EYE_HEIGHT = 1.6
const WALK_SPEED = 2.6
const TURN_SPEED = 2
const LOOK_SPEED = 0.005
/** これより遠い物はタップしても調べられない */
const REACH = 2.8
/** タップとドラッグを見分けるしきい値（px） */
const TAP_SLOP = 10

interface Props {
  scenario: Scenario
  /** 館の形（謎の進行に依存しない）。シナリオから 1 度だけ組み立てたもの */
  world: World
  room: RoomId
  solved: PuzzleId[]
  paused: boolean
  onRoomChange: (room: RoomId) => void
  onHotspot: (room: RoomId, h: Hotspot) => void
  onToast: (text: string) => void
  onFirstMove: () => void
}

export function World3D(props: Props) {
  const [rig] = useState(() => new PlayerRig(spawnPoint(props.world, props.room)))
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
    if (roomAt(props.world, rig.pos) !== props.room)
      rig.placeAt(spawnPoint(props.world, props.room))
  }, [rig, props.world, props.room])

  const enterPortal = (portal: Portal) => {
    rig.placeAt(portalArrival(props.world, portal.room, portal.exit))
    latest.current.onRoomChange(portal.exit.to)
  }

  const tapHotspot = (room: RoomId, h: Hotspot) => {
    if (rig.distanceTo(hotspotPosition(props.world, room, h)) > REACH)
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
          world={props.world}
          latest={latest}
          onPortal={enterPortal}
        />
        <Rooms scenario={props.scenario} world={props.world} />
        <Walls scenario={props.scenario} world={props.world} />
        <Doorways scenario={props.scenario} world={props.world} />
        <Portals world={props.world} onTap={enterPortal} />
        <Hotspots
          scenario={props.scenario}
          world={props.world}
          solved={props.solved}
          rig={rig}
          onTap={tapHotspot}
        />
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

      const here = roomAt(world, rig.pos)
      if (here && here !== props.room) props.onRoomChange(here)

      const nowNear = new Set<string>()
      for (const portal of world.portals) {
        if (!isAtPortal(world, portal, rig.pos)) continue
        const key = `portal:${portal.room}:${portal.exit.dir}`
        nowNear.add(key)
        if (!near.current.has(key)) onPortal(portal)
      }
      near.current = nowNear
    }

    camera.position.set(rig.pos.x, EYE_HEIGHT, rig.pos.z)
    camera.rotation.set(rig.pitch, rig.yaw, 0, 'YXZ')
    lantern.current?.position.set(rig.pos.x, EYE_HEIGHT + 0.3, rig.pos.z)
  })

  return <pointLight ref={lantern} color="#ffcf8a" intensity={14} distance={11} decay={2} />
}

function Rooms({ scenario, world }: { scenario: Scenario; world: World }) {
  return (
    <>
      {Object.values(scenario.rooms).map((room) => {
        const c = roomCenter(world, room.id)
        return (
          <group key={room.id} position={[c.x, 0, c.z]}>
            <mesh rotation-x={-Math.PI / 2}>
              <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
              <meshLambertMaterial color={scenario.theme[room.id].floor} />
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

function Walls({ scenario, world }: { scenario: Scenario; world: World }) {
  return (
    <>
      {world.walls.map((w, i) => {
        const height = WALL_HEIGHT - w.bottom
        return (
          <mesh key={i} position={[w.x, w.bottom + height / 2, w.z]}>
            <boxGeometry args={[w.hx * 2, height, w.hz * 2]} />
            <meshLambertMaterial color={scenario.theme[w.room].wall} />
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
  groupRef,
}: {
  text: string
  position: [number, number, number]
  height?: number
  color?: string
  /** 名札の位置を原点にした入れ物。強調で拡大するときに使う */
  groupRef?: React.Ref<Group>
}) {
  const { texture, aspect } = labelTexture(
    text,
    color,
    undefined,
    labelPixelRatio(window.devicePixelRatio),
  )
  // 近いと小さく、遠いと大きく出して、画面上の大きさが極端に変わらないようにする
  const scaler = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    const g = scaler.current
    if (!g) return
    g.getWorldPosition(worldPoint)
    g.scale.setScalar(labelDistanceScale(camera.position.distanceTo(worldPoint)))
  })
  return (
    <group ref={groupRef} position={position}>
      <group ref={scaler}>
        <sprite scale={[height * aspect, height, 1]}>
          <spriteMaterial map={texture} transparent depthWrite={false} />
        </sprite>
      </group>
    </group>
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
function Doorways({ scenario, world }: { scenario: Scenario; world: World }) {
  return (
    <>
      {world.doorways.map((d) => {
        const normal = d.axis === 'x' ? { x: 0, z: 1 } : { x: 1, z: 0 }
        return (
          <group key={`${d.x},${d.z}`}>
            {d.rooms.map((room) => {
              // 看板はその部屋の側に出し、向こう側の部屋の名前を書く
              const other = d.rooms.find((r) => r !== room)!
              const c = roomCenter(world, room)
              const sign = Math.sign((c.x - d.x) * normal.x + (c.z - d.z) * normal.z)
              return (
                <Label
                  key={room}
                  text={scenario.rooms[other].name}
                  position={[
                    d.x + normal.x * sign * 0.3,
                    DOOR_HEIGHT + 0.35,
                    d.z + normal.z * sign * 0.3,
                  ]}
                />
              )
            })}
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
              <meshLambertMaterial color="#1a0f08" />
            </mesh>
            <Label text={`${stairs}：${p.exit.label}`} position={[lx, 2.55, lz]} color="#e0b354" />
            <Emoji
              emoji={p.exit.dir === 'down' ? '⬇️' : '⬆️'}
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
  scenario,
  world,
  solved,
  rig,
  onTap,
}: {
  scenario: Scenario
  world: World
  solved: PuzzleId[]
  rig: PlayerRig
  onTap: (room: RoomId, h: Hotspot) => void
}) {
  return (
    <>
      {Object.values(scenario.rooms).flatMap((room) =>
        room.hotspots.map((h) => (
          <HotspotObject
            key={h.id}
            world={world}
            room={room.id}
            hotspot={h}
            appearance={hotspotAppearance(scenario, h, solved)}
            rig={rig}
            onTap={onTap}
          />
        )),
      )}
    </>
  )
}

function HotspotObject({
  world,
  room,
  hotspot,
  appearance,
  rig,
  onTap,
}: {
  world: World
  room: RoomId
  hotspot: Hotspot
  rig: PlayerRig
  /** 輪と名札の見た目。シナリオの目印の設定と謎の状態から決まる */
  appearance: HotspotAppearance
  onTap: (room: RoomId, h: Hotspot) => void
}) {
  const p = hotspotPosition(world, room, hotspot)
  const icon = useRef<Sprite>(null)
  const ring = useRef<Mesh>(null)
  const reachRing = useRef<Mesh>(null)
  const reachMaterial = useRef<MeshBasicMaterial>(null)
  const glow = useRef<Sprite>(null)
  const glowMaterial = useRef<SpriteMaterial>(null)
  const labelGroup = useRef<Group>(null)
  const plinthHeight = 0.9
  // 位置ごとに位相をずらして、すべての物が揃って揺れないようにする
  const phase = (p.x * 7 + p.z * 13) % (Math.PI * 2)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase
    const bob = plinthHeight + 0.45 + Math.sin(t * 2) * 0.05
    if (icon.current) icon.current.position.y = bob
    if (glow.current) glow.current.position.y = bob
    if (ring.current && appearance.pulse) {
      const s = 1 + Math.sin(t * 3) * 0.12
      ring.current.scale.set(s, s, 1)
    }
    // 調べられる距離に入った物には、謎の有無に関係なく同じ強調を付ける
    const e = reachEmphasis(rig.distanceTo(p), REACH)
    if (reachRing.current) reachRing.current.visible = e > 0
    if (reachMaterial.current) reachMaterial.current.opacity = e * 0.85
    if (glow.current) glow.current.visible = e > 0
    if (glowMaterial.current) glowMaterial.current.opacity = e * 0.8
    labelGroup.current?.scale.setScalar(1 + e * 0.12)
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > TAP_SLOP) return
    e.stopPropagation()
    onTap(room, hotspot)
  }

  const { texture } = emojiTexture(hotspot.emoji)
  const label = `${appearance.prefix}${hotspot.name}`

  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position-y={plinthHeight / 2} onClick={handleClick}>
        <boxGeometry args={[PLINTH_SIZE, plinthHeight, PLINTH_SIZE]} />
        <meshLambertMaterial color="#3a2616" />
      </mesh>
      {appearance.ringColor !== null && (
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={plinthHeight + 0.01}>
          <ringGeometry args={[0.26, 0.34, 32]} />
          <meshBasicMaterial color={appearance.ringColor} />
        </mesh>
      )}
      {/* 調べられる距離に入ると、全部の物の足元に同じ輪が出る */}
      <mesh ref={reachRing} rotation-x={-Math.PI / 2} position-y={0.02} visible={false}>
        <ringGeometry args={[0.62, 0.72, 40]} />
        <meshBasicMaterial ref={reachMaterial} color="#fff1c9" transparent depthWrite={false} />
      </mesh>
      {/* 物の背後の光。調べられる距離に入った物すべてに同じものが付く */}
      <sprite ref={glow} position-y={plinthHeight + 0.45} scale={[1.5, 1.5, 1]} visible={false}>
        <spriteMaterial
          ref={glowMaterial}
          map={glowTexture().texture}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </sprite>
      <sprite
        ref={icon}
        position-y={plinthHeight + 0.45}
        scale={[0.75, 0.75, 1]}
        onClick={handleClick}
      >
        <spriteMaterial map={texture} transparent depthWrite={false} />
      </sprite>
      <Label
        text={label}
        position={[0, plinthHeight + 1.05, 0]}
        height={0.22}
        color={appearance.labelColor}
        groupRef={labelGroup}
      />
    </group>
  )
}
