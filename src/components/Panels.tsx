import { useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { totals, type PuzzleStat } from '../game/score'
import type { EvidenceId, Room, RoomId, Scenario } from '../game/types'
import { Dialog } from './Dialog'
import { floorLinks, floorOrder, newestFirst, otherFloors } from './notebookView'
import { ScoreLegend, ScoreSummary, ScoreTable } from './ScoreTable'
import './Notebook.css'
import './MapView.css'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** 物の説明など、短い内容を重ねて出す。見た目と操作は Dialog に揃える */
export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <Dialog title={title} onClose={onClose}>
      {children}
    </Dialog>
  )
}

/* ---------- 手帳 ---------- */

type NotebookTab = 'evidence' | 'puzzles' | 'people'

const NOTEBOOK_TABS: { id: NotebookTab; label: string }[] = [
  { id: 'evidence', label: '証拠' },
  { id: 'puzzles', label: '謎' },
  { id: 'people', label: '人物' },
]

// 手帳を閉じて開き直しても、最後に見た切り替えを選んでおく（ページを読み込み直すと戻る）
let lastNotebookTab: NotebookTab = 'evidence'

/** 切り替えの見出し。矢印キーで隣へ移れる（選択中だけが Tab の対象） */
function TabList<T extends string>({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
}: {
  label: string
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  idPrefix: string
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === value)
    let next = index
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return
    e.preventDefault()
    onChange(tabs[next].id)
    document.getElementById(`${idPrefix}-tab-${tabs[next].id}`)?.focus()
  }
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`${idPrefix}-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          aria-controls={`${idPrefix}-panel`}
          tabIndex={t.id === value ? 0 : -1}
          className={`tab ${t.id === value ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
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
  const [tab, setTab] = useState<NotebookTab>(lastNotebookTab)
  const select = (next: NotebookTab) => {
    lastNotebookTab = next
    setTab(next)
  }
  const tabs = NOTEBOOK_TABS.map((t) =>
    t.id === 'evidence' ? { ...t, label: `証拠 ${evidence.length}` } : t,
  )
  return (
    <Dialog
      className="notebook"
      title="探偵手帳"
      onClose={onClose}
      meta={
        <TabList label="手帳の切り替え" tabs={tabs} value={tab} onChange={select} idPrefix="nb" />
      }
    >
      <div id="nb-panel" role="tabpanel" aria-labelledby={`nb-tab-${tab}`}>
        {tab === 'evidence' &&
          (evidence.length === 0 ? (
            <p className="empty">まだ証拠はない。</p>
          ) : (
            <ul className="evidence-list">
              {newestFirst(evidence).map((id) => (
                <li key={id}>
                  <b>{scenario.evidence[id].title}</b>
                  <p>{scenario.evidence[id].text}</p>
                </li>
              ))}
            </ul>
          ))}
        {tab === 'puzzles' && (
          <>
            <ScoreSummary totals={totals(stats)} puzzleCount={stats.length} />
            <ScoreTable stats={stats} />
            <ScoreLegend stats={stats} />
          </>
        )}
        {tab === 'people' && (
          <>
            <p className="people-note">この事件に関わる {scenario.suspects.length} 人。</p>
            <ul className="people-list">
              {scenario.suspects.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Dialog>
  )
}

/* ---------- 見取り図 ---------- */

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
  const floors = floorOrder(rooms)
  const [floor, setFloor] = useState(scenario.rooms[current]?.floor ?? floors[0])
  const onFloor = rooms.filter((r) => r.floor === floor)
  const minX = Math.min(...onFloor.map((r) => r.map.x))
  const minY = Math.min(...onFloor.map((r) => r.map.y))
  const cols = Math.max(...onFloor.map((r) => r.map.x)) - minX + 1
  const rows = Math.max(...onFloor.map((r) => r.map.y)) - minY + 1
  const place = (r: Room) => ({ x: r.map.x - minX, y: r.map.y - minY })
  const byId = new Map(onFloor.map((r) => [r.id, r]))
  const links = floorLinks(rooms, floor)
  const currentFloor = scenario.rooms[current]?.floor
  const tabs = floors.map((f) => ({ id: f, label: f === currentFloor ? `${f} ●` : f }))
  return (
    <Dialog
      className="map-view"
      title="館の見取り図"
      onClose={onClose}
      meta={
        floors.length > 1 ? (
          <TabList
            label="階の切り替え"
            tabs={tabs}
            value={floor}
            onChange={setFloor}
            idPrefix="map"
          />
        ) : undefined
      }
    >
      <div id="map-panel" role="tabpanel" aria-labelledby={`map-tab-${floor}`}>
        <div
          className="map-board"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, var(--map-row))`,
          }}
        >
          <svg
            className="map-links"
            viewBox={`0 0 ${cols} ${rows}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {links.map(([a, b]) => {
              const pa = place(byId.get(a)!)
              const pb = place(byId.get(b)!)
              return (
                <line
                  key={`${a}-${b}`}
                  x1={pa.x + 0.5}
                  y1={pa.y + 0.5}
                  x2={pb.x + 0.5}
                  y2={pb.y + 0.5}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>
          {onFloor.map((r) => {
            const seen = visited.includes(r.id)
            const isCurrent = r.id === current
            const p = place(r)
            const others = otherFloors(r, scenario.rooms, floors)
            return (
              <div
                key={r.id}
                className="map-slot"
                style={{ gridColumn: p.x + 1, gridRow: p.y + 1 }}
              >
                <div className={`map-room ${seen ? 'seen' : ''} ${isCurrent ? 'current' : ''}`}>
                  <span className="map-name">{seen ? r.name : '？？？'}</span>
                  {isCurrent && <span className="map-here">現在地</span>}
                  {others.length > 0 && (
                    <span className="map-stairs">{others.map((f) => `→${f}`).join(' ')}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <p className="map-note">
          線は扉でつながる部屋。訪れていない部屋は「？？？」と表示される。階は上の切り替えで変える。
        </p>
      </div>
    </Dialog>
  )
}
