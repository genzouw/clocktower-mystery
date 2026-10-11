import { MAGIC_CELLS, STAFF_NOTES } from '../game/figures'
import type { Puzzle } from '../game/types'
import {
  BreakerPanel,
  CipherObservatory,
  Constellations,
  PlateBoxes,
  StarGrid,
} from './figures/Observatory'

function Staff() {
  const lines = [30, 40, 50, 60, 70]
  return (
    <svg
      viewBox="0 0 240 100"
      className="figure-svg"
      role="img"
      aria-label="4つの音符が書かれた五線譜"
    >
      {lines.map((y) => (
        <line key={y} x1="10" x2="230" y1={y} y2={y} stroke="currentColor" strokeWidth="1.2" />
      ))}
      <text x="14" y="74" fontSize="56" fill="currentColor">
        𝄞
      </text>
      {STAFF_NOTES.map((y, i) => {
        const x = 90 + i * 38
        return (
          <g key={i}>
            {y >= 80 && (
              <line
                x1={x - 12}
                x2={x + 12}
                y1={80}
                y2={80}
                stroke="currentColor"
                strokeWidth="1.2"
              />
            )}
            <ellipse
              cx={x}
              cy={y}
              rx="7"
              ry="5"
              transform={`rotate(-20 ${x} ${y})`}
              fill="currentColor"
            />
            <line
              x1={x + 6.5}
              x2={x + 6.5}
              y1={y - 2}
              y2={y - 32}
              stroke="currentColor"
              strokeWidth="1.4"
            />
          </g>
        )
      })}
    </svg>
  )
}

function Seats() {
  return (
    <div className="seats" aria-label="1番から5番までの席">
      <div className="seats-table">テーブル</div>
      <div className="seats-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="seat">
            <span>{n}</span>
            <small>{n === 3 ? '？' : '　'}</small>
          </div>
        ))}
      </div>
      <div className="seats-note">← 左　　　　右 →</div>
    </div>
  )
}

function Books() {
  const books = [
    { color: '#b33a3a', label: '赤' },
    { color: '#2f5fa8', label: '青' },
    { color: '#2f8a4a', label: '緑' },
  ]
  return (
    <div className="books">
      {books.map((b) => (
        <div key={b.label} className="book" style={{ background: b.color }}>
          {b.label}
        </div>
      ))}
    </div>
  )
}

function Magic() {
  const cells = MAGIC_CELLS
  return (
    <div className="magic">
      {cells.map((c, i) => (
        <div key={i} className={`magic-cell ${c === '？' ? 'ask' : ''}`}>
          <span className="pot">🪴</span>
          <b>{c}</b>
        </div>
      ))}
    </div>
  )
}

function Cipher() {
  return <div className="cipher">なこうはにき</div>
}

export function Figure({ figure }: { figure: Puzzle['figure'] }) {
  switch (figure) {
    case 'staff':
      return <Staff />
    case 'seats':
      return <Seats />
    case 'books':
      return <Books />
    case 'magic':
      return <Magic />
    case 'cipher':
      return <Cipher />
    case 'plateBoxes':
      return <PlateBoxes />
    case 'cipherObservatory':
      return <CipherObservatory />
    case 'starGrid':
      return <StarGrid />
    case 'breakerPanel':
      return <BreakerPanel />
    case 'constellations':
      return <Constellations />
    default:
      return null
  }
}
