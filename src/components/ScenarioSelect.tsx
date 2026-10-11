import type { ScenarioStatus } from '../game/storage'
import type { Scenario } from '../game/types'
import './ScenarioSelect.css'

export interface ScenarioEntry {
  scenario: Scenario
  status: ScenarioStatus
}

function statusLabel(status: ScenarioStatus): string {
  switch (status.kind) {
    case 'new':
      return '未着手'
    case 'playing':
      return `進行中　解いた謎 ${status.solved}/${status.total}`
    case 'cleared':
      return `解決済み　${status.rank}`
  }
}

function Stars({ level }: { level: number }) {
  return (
    <span className="scenario-stars" role="img" aria-label={`難易度 ${level} / 3`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= level ? 'on' : 'off'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  )
}

/** 起動時に出す、事件ファイル（シナリオ）の一覧 */
export function ScenarioSelect({
  entries,
  currentId,
  onSelect,
}: {
  entries: ScenarioEntry[]
  /** 最後に選んだシナリオ。カードに目印を付ける */
  currentId: string | null
  onSelect: (scenario: Scenario) => void
}) {
  return (
    <div className="screen scenario-select">
      <h1>事件ファイル</h1>
      <p className="scenario-select-lead">
        挑む事件を選んでください。進行は事件ごとに保存されます。
      </p>
      <ul className="scenario-list">
        {entries.map(({ scenario, status }) => (
          <li key={scenario.id}>
            <button
              className={`scenario-card status-${status.kind}`}
              data-scenario={scenario.id}
              onClick={() => onSelect(scenario)}
            >
              <span className="scenario-emoji" aria-hidden="true">
                {scenario.titleEmoji}
              </span>
              <span className="scenario-body">
                <span className="scenario-title">{scenario.title}</span>
                <span className="scenario-meta">
                  <Stars level={scenario.difficulty} />
                  {scenario.id === currentId && <span className="scenario-last">前回</span>}
                </span>
                <span className="scenario-status">{statusLabel(status)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
