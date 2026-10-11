import { statusView } from '../game/score'
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
        {stats.map((s) => {
          const status = statusView(s)
          return (
            <tr key={s.id} className={s.solved ? 'done' : 'pending'}>
              <th scope="row">
                <span className="status" aria-label={status.label} title={status.label}>
                  {status.mark}
                </span>
                <span className="puzzle-number">{s.number}</span>
                <span className="puzzle-name">{s.name}</span>
              </th>
              <td className={`num ${s.hints > 0 ? 'used' : ''}`}>
                {s.hints}/{s.hintsMax}
              </td>
              <td className={`num ${s.mistakes > 0 ? 'used' : ''}`}>{s.mistakes}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/**
 * 成績表の記号の凡例。いま表に出ている状態の分だけ出す
 * （伏せている謎は記号を出さないので、hidden のシナリオで状態の種類を教えない）
 */
export function ScoreLegend({ stats }: { stats: PuzzleStat[] }) {
  const items = new Map<string, string>()
  for (const s of stats) {
    const v = statusView(s)
    if (v.label) items.set(v.label, v.mark)
  }
  // 並びは固定する（解決済み・挑戦できる・手がかり不足）
  const order = ['解決済み', '挑戦できる', '手がかり不足']
  const shown = order.filter((l) => items.has(l))
  if (shown.length === 0) return null
  return <p className="legend">{shown.map((l) => `${items.get(l)} ${l}`).join('　')}</p>
}
