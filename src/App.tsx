import { Suspense, lazy, useCallback, useEffect, useReducer, useState } from 'react'
import './App.css'
import { EVIDENCE } from './game/evidence'
import { PUZZLES } from './game/puzzles'
import { ROOMS } from './game/rooms'
import { loadState, reducer, saveState } from './game/state'
import type { EvidenceId, Hotspot, PuzzleId, RoomId } from './game/types'
import { MapView, Modal, Notebook } from './components/Panels'
import { PuzzleModal } from './components/PuzzleModal'
import { EndingScreen, TitleScreen } from './components/Screens'

// three.js は大きいので、タイトル画面を先に表示できるよう 3D 部分は後から読み込む
const World3D = lazy(() => import('./three/World3D').then((m) => ({ default: m.World3D })))

type Overlay =
  | { kind: 'puzzle'; id: PuzzleId }
  | { kind: 'look'; hotspot: Hotspot; newEvidence: EvidenceId | null }
  | { kind: 'locked'; text: string }
  | { kind: 'notebook' }
  | { kind: 'map' }
  | null

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => saveState(state), [state])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(t)
  }, [toast])

  const handleRoomChange = useCallback((to: RoomId) => dispatch({ type: 'move', to }), [])

  const handleHotspot = (_room: RoomId, h: Hotspot) => {
    if (h.puzzle) {
      setOverlay({ kind: 'puzzle', id: h.puzzle })
      return
    }
    const isNew = h.evidence !== undefined && !state.evidence.includes(h.evidence)
    if (h.evidence) dispatch({ type: 'collect', id: h.evidence })
    setOverlay({ kind: 'look', hotspot: h, newEvidence: isNew ? h.evidence! : null })
  }

  const handleSolve = (id: PuzzleId) => {
    dispatch({ type: 'solve', id })
    const reward = PUZZLES[id].reward
    setToast(reward ? `手帳に「${EVIDENCE[reward].title}」を記録した` : '謎を解いた！')
  }

  const hasProgress = state.solved.length > 0 || state.visited.length > 1

  if (!state.started) {
    return (
      <TitleScreen
        hasProgress={hasProgress}
        onStart={() => dispatch({ type: 'start' })}
        onReset={() => dispatch({ type: 'reset' })}
      />
    )
  }

  if (state.cleared) {
    const hintsTotal = Object.values(state.hintsUsed).reduce((a, b) => a + (b ?? 0), 0)
    return <EndingScreen hintsTotal={hintsTotal} onRestart={() => dispatch({ type: 'reset' })} />
  }

  const room = ROOMS[state.room]

  return (
    <div className="app">
      <Suspense fallback={<div className="loading">館の扉を開いています…</div>}>
        <World3D
          room={state.room}
          solved={state.solved}
          paused={overlay !== null}
          onRoomChange={handleRoomChange}
          onHotspot={handleHotspot}
          onLocked={(text) => setOverlay({ kind: 'locked', text: text || '扉は開かない。' })}
          onToast={setToast}
          onFirstMove={() => setShowGuide(false)}
        />
      </Suspense>

      <header className="topbar">
        <div className="room-title">
          <small>{room.floor}</small> {room.name}
        </div>
        <div className="progress" aria-label={`解いた謎 ${state.solved.length} / 10`}>
          🔑 {state.solved.length}/10
        </div>
      </header>

      {showGuide && (
        <div className="guide">
          <p>左下のスティックで歩く</p>
          <p>画面をドラッグして見回す</p>
          <p>近づいて物をタップして調べる</p>
        </div>
      )}

      <footer className="toolbar">
        <button className="btn tool" onClick={() => setOverlay({ kind: 'notebook' })}>
          📓 手帳
        </button>
        <button className="btn tool" onClick={() => setOverlay({ kind: 'map' })}>
          🗺️ 見取り図
        </button>
      </footer>

      {toast && <div className="toast">{toast}</div>}

      {overlay?.kind === 'puzzle' && (
        <PuzzleModal
          key={overlay.id}
          puzzle={PUZZLES[overlay.id]}
          solved={state.solved.includes(overlay.id)}
          hintsUsed={state.hintsUsed[overlay.id] ?? 0}
          onSolve={() => handleSolve(overlay.id)}
          onHint={() => dispatch({ type: 'hint', id: overlay.id })}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === 'look' && (
        <Modal
          title={`${overlay.hotspot.emoji} ${overlay.hotspot.name}`}
          onClose={() => setOverlay(null)}
        >
          <p>{overlay.hotspot.text}</p>
          {overlay.hotspot.evidence && (
            <div className="evidence-card">
              {overlay.newEvidence && <p className="new-badge">手帳に記録した</p>}
              <b>{EVIDENCE[overlay.hotspot.evidence].title}</b>
              <p>{EVIDENCE[overlay.hotspot.evidence].text}</p>
            </div>
          )}
        </Modal>
      )}
      {overlay?.kind === 'locked' && (
        <Modal title="🔒 進めない" onClose={() => setOverlay(null)}>
          <p>{overlay.text}</p>
        </Modal>
      )}
      {overlay?.kind === 'notebook' && (
        <Notebook
          evidence={state.evidence}
          solved={state.solved}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === 'map' && (
        <MapView current={state.room} visited={state.visited} onClose={() => setOverlay(null)} />
      )}
    </div>
  )
}
