import { Suspense, lazy, useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import './App.css'
import './Hud.css'
import './Focus.css'
import { solveToast, tapOutcome } from './game/hotspot'
import { SCENARIOS } from './game/scenarios'
import { puzzleStats } from './game/score'
import { reducerFor } from './game/state'
import {
  hasProgress,
  loadCurrent,
  loadState,
  saveCurrent,
  saveState,
  scenarioStatus,
} from './game/storage'
import type { EvidenceId, Hotspot, PuzzleId, RoomId, Scenario } from './game/types'
import { buildWorld } from './game/world'
import { MapView, Modal, Notebook } from './components/Panels'
import { PuzzleModal } from './components/PuzzleModal'
import { ScenarioSelect } from './components/ScenarioSelect'
import { EndingScreen, TitleScreen } from './components/Screens'
import { GUIDE_AUTO_CLOSE_MS, guideVisibleAfter } from './components/hud'

// three.js は大きいので、タイトル画面を先に表示できるよう 3D 部分は後から読み込む
const World3D = lazy(() => import('./three/World3D').then((m) => ({ default: m.World3D })))

type Overlay =
  | { kind: 'puzzle'; id: PuzzleId }
  | { kind: 'look'; hotspot: Hotspot; newEvidence: EvidenceId | null }
  | { kind: 'notebook' }
  | { kind: 'map' }
  | null

export default function App({ scenarios = SCENARIOS }: { scenarios?: Scenario[] }) {
  // 起動するとシナリオの一覧を出す。選んだシナリオだけを遊ぶ
  const [selected, setSelected] = useState<Scenario | null>(null)

  const select = (scenario: Scenario) => {
    saveCurrent(scenario.id)
    setSelected(scenario)
  }

  if (!selected) return <SelectView scenarios={scenarios} onSelect={select} />
  return <Game key={selected.id} scenario={selected} onExit={() => setSelected(null)} />
}

/** 一覧を開くたびに、保存済みの進行から各シナリオの状態を読み直す */
function SelectView({
  scenarios,
  onSelect,
}: {
  scenarios: Scenario[]
  onSelect: (scenario: Scenario) => void
}) {
  const [entries] = useState(() =>
    scenarios.map((scenario) => ({
      scenario,
      status: scenarioStatus(scenario, loadState(scenario)),
    })),
  )
  const [currentId] = useState(() => loadCurrent(scenarios))
  return <ScenarioSelect entries={entries} currentId={currentId} onSelect={onSelect} />
}

/**
 * 1 つのシナリオを遊ぶ。シナリオを切り替えるときは key を変えて、状態と 3D の世界を作り直す。
 * onExit でシナリオの一覧へ戻る（進行は保存されたまま残る）
 */
function Game({ scenario, onExit }: { scenario: Scenario; onExit: () => void }) {
  const reducer = useMemo(() => reducerFor(scenario), [scenario])
  const world = useMemo(() => buildWorld(scenario), [scenario])
  const [state, dispatch] = useReducer(reducer, scenario, loadState)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(true)
  // 一覧から選んだら、進行があってもまずシナリオのタイトル画面を出す
  const [onTitle, setOnTitle] = useState(true)

  useEffect(() => saveState(scenario, state), [scenario, state])

  // 操作ガイドは最初に動くか、しばらくすると消える。「操作」ボタンで再表示できる
  useEffect(() => {
    if (!showGuide) return
    const t = window.setTimeout(
      () => setShowGuide(guideVisibleAfter('timeout')),
      GUIDE_AUTO_CLOSE_MS,
    )
    return () => window.clearTimeout(t)
  }, [showGuide])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), toast.includes('\n') ? 4000 : 2500)
    return () => window.clearTimeout(t)
  }, [toast])

  const handleRoomChange = useCallback((to: RoomId) => dispatch({ type: 'move', to }), [])

  const handleHotspot = (_room: RoomId, h: Hotspot) => {
    // concealed の物は、前提を解くまで説明文だけを見せる
    const outcome = tapOutcome(scenario, h, state)
    if (outcome.kind === 'puzzle') {
      dispatch({ type: 'open', id: outcome.id })
      setOverlay({ kind: 'puzzle', id: outcome.id })
      return
    }
    if (outcome.collect) dispatch({ type: 'collect', id: outcome.collect })
    setOverlay({ kind: 'look', hotspot: h, newEvidence: outcome.newEvidence })
  }

  const handleSolve = (id: PuzzleId) => {
    dispatch({ type: 'solve', id })
    setToast(solveToast(scenario, id))
  }

  if (onTitle) {
    return (
      <TitleScreen
        scenario={scenario}
        hasProgress={hasProgress(state)}
        onStart={() => {
          dispatch({ type: 'start' })
          setOnTitle(false)
        }}
        onReset={() => {
          dispatch({ type: 'reset' })
          setOnTitle(false)
        }}
        onBack={onExit}
      />
    )
  }

  if (state.cleared) {
    return (
      <EndingScreen
        scenario={scenario}
        stats={puzzleStats(scenario, state)}
        onRestart={() => dispatch({ type: 'reset' })}
        onBack={onExit}
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
          onFirstMove={() => setShowGuide(guideVisibleAfter('first-move'))}
        />
      </Suspense>

      <header className="topbar">
        <div className="room-title">
          <small>{room.floor}</small> {room.name}
        </div>
        <div
          className="progress"
          role="img"
          aria-label={`解いた謎 ${state.solved.length} / ${puzzleCount}`}
        >
          <span aria-hidden="true">
            🔑 {state.solved.length}
            <span className="progress-total">/{puzzleCount}</span>
          </span>
        </div>
        {showGuide && (
          <button className="guide" onClick={() => setShowGuide(guideVisibleAfter('tap'))}>
            <span>左下のスティックで歩く</span>
            <span>画面をドラッグして見回す</span>
            <span>近づいて物をタップして調べる</span>
            <small>タップで閉じる</small>
          </button>
        )}
      </header>

      <footer className="toolbar">
        <button className="btn tool" onClick={() => setOverlay({ kind: 'notebook' })}>
          📓 手帳
        </button>
        <button className="btn tool" onClick={() => setOverlay({ kind: 'map' })}>
          🗺️ 見取り図
        </button>
        <button className="btn tool" onClick={() => setShowGuide(guideVisibleAfter('show'))}>
          🧭 操作
        </button>
        <button className="btn tool" onClick={onExit}>
          📁 メニュー
        </button>
      </footer>

      {toast && <div className="toast">{toast}</div>}

      {overlay?.kind === 'puzzle' && (
        <PuzzleModal
          key={overlay.id}
          scenario={scenario}
          puzzle={scenario.puzzles[overlay.id]}
          solvedIds={state.solved}
          seenIds={state.seen}
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
