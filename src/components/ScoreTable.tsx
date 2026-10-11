import type { PuzzleStat, ScoreTotals } from '../game/score'

/** 合計値を大きく見せるタイル */
export function ScoreSummary({
  totals,
  puzzleCount,
}: {
  totals: ScoreTotals
  /** 謎の総数（解いた謎の分母） */
  puzzleCount: number
}) {
  return (
    <div className="score-summary">
      <div className="score-tile">
        <span className="score-label">解いた謎</span>
        <b>
          {totals.solved}
          <small>/{puzzleCount}</small>
        </b>
      </div>
      <div className="score-tile">
        <span className="score-label">💡 ヒント</span>
        <b>
          {totals.hints}
          <small>/{totals.hintsMax}</small>
        </b>
      </div>
      <div className="score-tile">
        <span className="score-label">✕ 誤答</span>
        <b>
          {totals.mistakes}
          <small>回</small>
        </b>
      </div>
    </div>
  )
}

const statusLabel = (s: PuzzleStat) =>
  s.solved ? '解決済み' : s.locked ? '手がかり不足' : '挑戦できる'

/** 謎ごとのヒント使用数・誤答数の内訳 */
export function ScoreTable({ stats }: { stats: PuzzleStat[] }) {
  return (
    <table className="score-table">
      <thead>
        <tr>
          <th scope="col">謎</th>
          <th scope="col" className="num">
            💡 ヒント
          </th>
          <th scope="col" className="num">
            ✕ 誤答
          </th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.id} className={s.solved ? 'done' : 'pending'}>
            <th scope="row">
              <span className="status" aria-label={statusLabel(s)} title={statusLabel(s)}>
                {s.solved ? '✔' : s.locked ? '🔒' : '・'}
              </span>
              <span className="puzzle-number">{s.number}</span>
              <span className="puzzle-name">{s.name}</span>
            </th>
            <td className={`num ${s.hints > 0 ? 'used' : ''}`}>
              {s.hints}/{s.hintsMax}
            </td>
            <td className={`num ${s.mistakes > 0 ? 'used' : ''}`}>{s.mistakes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
