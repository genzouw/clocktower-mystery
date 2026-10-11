import { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import './App.css'
import { cluesFrom } from './game/scenario'
import { SCENARIOS } from './game/scenarios'
import { puzzleStats } from './game/score'
import { loadState, reducerFor, saveState } from './game/state'
import type { EvidenceId, Hotspot, PuzzleId, RoomId, Scenario } from './game/types'
import { buildWorld } from './game/world'
import { MapView, Modal, Notebook } from './components/Panels'
import { PuzzleModal } from './components/PuzzleModal'
import { EndingScreen, TitleScreen } from './components/Screens'

// three.js は大きいので、タイトル画面を先に表示できるよう 3D 部分は後から読み込む
const World3D = lazy(() => import('./three/World3D').then((m) => ({ default: m.World3D })))

type Overlay =
  | { kind: 'puzzle'; id: PuzzleId }
  | { kind: 'look'; hotspot: Hotspot; newEvidence: EvidenceId | null }
  | { kind: 'notebook' }
  | { kind: 'map' }
  | null

export default function App() {
  // シナリオ選択画面ができるまでは、先頭のシナリオだけを遊ぶ
  const scenario = SCENARIOS[0]
  return <Game key={scenario.id} scenario={scenario} />
}

/** 1 つのシナリオを遊ぶ。シナリオを切り替えるときは key を変えて、状態と 3D の世界を作り直す */
function Game({ scenario }: { scenario: Scenario }) {
  const reducer = useMemo(() => reducerFor(scenario), [scenario])
  const world = useMemo(() => buildWorld(scenario), [scenario])
  const [state, dispatch] = useReducer(reducer, scenario, loadState)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => saveState(state), [state])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), toast.includes('\n') ? 4000 : 2500)
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
    const reward = scenario.puzzles[id].reward
    const messages = [
      reward ? `手帳に「${scenario.evidence[reward].title}」を記録した` : '謎を解いた！',
      ...cluesFrom(scenario, id).map((p) => `「${scenario.puzzles[p].title}」の手がかりを見つけた`),
    ]
    setToast(messages.join('\n'))
  }

  const hasProgress = state.solved.length > 0 || state.visited.length > 1

  if (!state.started) {
    return (
      <TitleScreen
        scenario={scenario}
        hasProgress={hasProgress}
        onStart={() => dispatch({ type: 'start' })}
        onReset={() => dispatch({ type: 'reset' })}
      />
    )
  }

  if (state.cleared) {
    return (
      <EndingScreen
        scenario={scenario}
        stats={puzzleStats(scenario, state)}
        onRestart={() => dispatch({ type: 'reset' })}
      />
    )
  }

  const room = scenario.rooms[state.room]
  const puzzleCount = scenario.puzzleOrder.length

  return (
    <div className="app">
      <Suspense fallback={<div className="loading">館の扉を開いています…</div>}>
        <World3D
          scenario={scenario}
          world={world}
          room={state.room}
          solved={state.solved}
          paused={overlay !== null}
          onRoomChange={handleRoomChange}
          onHotspot={handleHotspot}
          onToast={setToast}
          onFirstMove={() => setShowGuide(false)}
        />
      </Suspense>

      <header className="topbar">
        <div className="room-title">
          <small>{room.floor}</small> {room.name}
        </div>
        <div className="progress" aria-label={`解いた謎 ${state.solved.length} / ${puzzleCount}`}>
          🔑 {state.solved.length}/{puzzleCount}
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
          scenario={scenario}
          puzzle={scenario.puzzles[overlay.id]}
          solvedIds={state.solved}
          hintsUsed={state.hintsUsed[overlay.id] ?? 0}
          mistakes={state.mistakes[overlay.id] ?? 0}
          onSolve={() => handleSolve(overlay.id)}
          onHint={() => dispatch({ type: 'hint', id: overlay.id })}
          onMistake={() => dispatch({ type: 'mistake', id: overlay.id })}
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
              <b>{scenario.evidence[overlay.hotspot.evidence].title}</b>
              <p>{scenario.evidence[overlay.hotspot.evidence].text}</p>
            </div>
          )}
        </Modal>
      )}
      {overlay?.kind === 'notebook' && (
        <Notebook
          scenario={scenario}
          evidence={state.evidence}
          stats={puzzleStats(scenario, state)}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.kind === 'map' && (
        <MapView
          scenario={scenario}
          current={state.room}
          visited={state.visited}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  )
}
