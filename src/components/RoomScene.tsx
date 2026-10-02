import { useRef } from 'react'
import { canPass } from '../game/rooms'
import type { Direction, Exit, Hotspot, PuzzleId, Room } from '../game/types'

interface Props {
  room: Room
  solved: PuzzleId[]
  enteredFrom: Direction | null
  onHotspot: (h: Hotspot) => void
  onExit: (e: Exit) => void
}

const ARROWS: Record<Direction, string> = {
  north: '↑',
  south: '↓',
  east: '→',
  west: '←',
  up: '⤴',
  down: '⤵',
}

/** スワイプ方向 → 進む方角。指を上に払うと奥（北）へ進む */
function swipeDirection(dx: number, dy: number): Direction | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 60) return null
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'east' : 'west'
  return dy < 0 ? 'north' : 'south'
}

export function RoomScene({ room, solved, enteredFrom, onHotspot, onExit }: Props) {
  const touch = useRef<{ x: number; y: number } | null>(null)

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current
    touch.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dir = swipeDirection(t.clientX - start.x, t.clientY - start.y)
    const exit = room.exits.find((x) => x.dir === dir)
    if (exit) onExit(exit)
  }

  return (
    <div className="room">
      <div
        key={room.id}
        className={`scene enter-${enteredFrom ?? 'none'}`}
        style={{ background: room.background }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={handleTouchEnd}
      >
        <div className="scene-floor-label">{room.floor}</div>
        {room.hotspots.map((h) => {
          const done = h.puzzle ? solved.includes(h.puzzle) : false
          return (
            <button
              key={h.id}
              className={`hotspot ${h.puzzle ? 'has-puzzle' : ''} ${done ? 'done' : ''}`}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              onClick={() => onHotspot(h)}
              aria-label={h.name}
            >
              <span className="hotspot-emoji">{h.emoji}</span>
              <span className="hotspot-name">{h.name}</span>
            </button>
          )
        })}
        {room.exits
          .filter((x) => ['north', 'south', 'east', 'west'].includes(x.dir))
          .map((x) => (
            <button
              key={x.dir}
              className={`edge-exit edge-${x.dir} ${canPass(x.requires, solved) ? '' : 'locked'}`}
              onClick={() => onExit(x)}
              aria-label={`${x.label}へ移動`}
            >
              {ARROWS[x.dir]}
            </button>
          ))}
      </div>
      <p className="room-desc">{room.description}</p>
      <nav className="exits">
        {room.exits.map((x) => {
          const open = canPass(x.requires, solved)
          return (
            <button
              key={x.dir}
              className={`btn exit ${open ? '' : 'locked'}`}
              onClick={() => onExit(x)}
            >
              <span className="exit-arrow">{ARROWS[x.dir]}</span>
              {x.label}
              {!open && ' 🔒'}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
