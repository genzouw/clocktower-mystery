import { totals, type PuzzleStat } from '../game/score'
import type { EvidenceId, RoomId, Scenario } from '../game/types'
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
  scenario,
  evidence,
  stats,
  onClose,
}: {
  scenario: Scenario
  evidence: EvidenceId[]
  stats: PuzzleStat[]
  onClose: () => void
}) {
  return (
    <Modal title="探偵手帳" onClose={onClose}>
      <h3>捜査の記録</h3>
      <ScoreSummary totals={totals(stats)} puzzleCount={stats.length} />
      <ScoreTable stats={stats} />
      <p className="legend">✔ 解決済み　・ 挑戦できる　🔒 手がかり不足</p>
      <h3>証拠（{evidence.length}）</h3>
      <ul className="evidence-list">
        {evidence.map((id) => (
          <li key={id}>
            <b>{scenario.evidence[id].title}</b>
            <p>{scenario.evidence[id].text}</p>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

export function MapView({
  scenario,
  current,
  visited,
  onClose,
}: {
  scenario: Scenario
  current: RoomId
  visited: RoomId[]
  onClose: () => void
}) {
  const rooms = Object.values(scenario.rooms)
  const columns = Math.max(...rooms.map((r) => r.map.x)) + 1
  return (
    <Modal title="館の見取り図" onClose={onClose}>
      <div className="map-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
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
