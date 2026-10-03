import { EVIDENCE } from '../game/evidence'
import { totals, type PuzzleStat } from '../game/score'
import { ROOMS } from '../game/rooms'
import type { EvidenceId, RoomId } from '../game/types'
import { ScoreSummary, ScoreTable } from './ScoreTable'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Notebook({
  evidence,
  stats,
  onClose,
}: {
  evidence: EvidenceId[]
  stats: PuzzleStat[]
  onClose: () => void
}) {
  return (
    <Modal title="探偵手帳" onClose={onClose}>
      <h3>捜査の記録</h3>
      <ScoreSummary totals={totals(stats)} />
      <ScoreTable stats={stats} />
      <p className="legend">✔ 解決済み　・ 挑戦できる　🔒 手がかり不足</p>
      <h3>証拠（{evidence.length}）</h3>
      <ul className="evidence-list">
        {evidence.map((id) => (
          <li key={id}>
            <b>{EVIDENCE[id].title}</b>
            <p>{EVIDENCE[id].text}</p>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

export function MapView({
  current,
  visited,
  onClose,
}: {
  current: RoomId
  visited: RoomId[]
  onClose: () => void
}) {
  const rooms = Object.values(ROOMS)
  return (
    <Modal title="館の見取り図" onClose={onClose}>
      <div className="map-grid">
        {rooms.map((r) => {
          const seen = visited.includes(r.id)
          return (
            <div
              key={r.id}
              className={`map-cell ${seen ? 'seen' : ''} ${r.id === current ? 'current' : ''}`}
              style={{ gridColumn: r.map.x + 1, gridRow: r.map.y + 1 }}
            >
              <small>{r.floor}</small>
              {seen ? r.name : '？？？'}
            </div>
          )
        })}
      </div>
      <p className="map-note">光っている部屋が現在地。訪れていない部屋は「？？？」と表示される。</p>
    </Modal>
  )
}
