import { useEffect, useReducer, useState } from 'react'
import './App.css'
import { EVIDENCE } from './game/evidence'
import { PUZZLES } from './game/puzzles'
import { ROOMS, canPass } from './game/rooms'
import { loadState, reducer, saveState } from './game/state'
import type { Direction, EvidenceId, Exit, Hotspot, PuzzleId } from './game/types'
import { MapView, Modal, Notebook } from './components/Panels'
import { PuzzleModal } from './components/PuzzleModal'
import { RoomScene } from './components/RoomScene'
import { EndingScreen, TitleScreen } from './components/Screens'

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
  const [enteredFrom, setEnteredFrom] = useState<Direction | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => saveState(state), [state])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(t)
  }, [toast])

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

  const handleExit = (exit: Exit) => {
    if (!canPass(exit.requires, state.solved)) {
      setOverlay({ kind: 'locked', text: exit.lockedText ?? '扉は開かない。' })
      return
    }
    setEnteredFrom(exit.dir)
    dispatch({ type: 'move', to: exit.to })
  }

  const handleHotspot = (h: Hotspot) => {
    if (h.puzzle) {
      setOverlay({ kind: 'puzzle', id: h.puzzle })
      return
    }
    const isNew = h.evidence !== undefined && !state.evidence.includes(h.evidence)
    if (h.evidence) dispatch({ type: 'collect', id: h.evidence })
    setOverlay({
      kind: 'look',
      hotspot: h,
      newEvidence: isNew ? h.evidence! : null,
    })
  }

  const handleSolve = (id: PuzzleId) => {
    dispatch({ type: 'solve', id })
    const reward = PUZZLES[id].reward
    setToast(reward ? `手帳に「${EVIDENCE[reward].title}」を記録した` : '謎を解いた！')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="room-title">
          <small>{room.floor}</small> {room.name}
        </div>
        <div className="progress" aria-label={`解いた謎 ${state.solved.length} / 10`}>
          🔑 {state.solved.length}/10
        </div>
      </header>

      <RoomScene
        room={room}
        solved={state.solved}
        enteredFrom={enteredFrom}
        onHotspot={handleHotspot}
        onExit={handleExit}
      />

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
