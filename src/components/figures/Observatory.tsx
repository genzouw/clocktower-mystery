import {
  BREAKER_COUNT,
  CONSTELLATIONS,
  OBSERVATORY_CIPHER,
  PLATE_BOX_LABELS,
  STAR_GRID_GIVENS,
} from '../../game/figures'

/** シナリオ 2（observatory）の図版。色は `.figure-svg` の `currentColor` に合わせ、CSS は足さない */

/** q3：札の貼られた 3 つの乾板の箱 */
export function PlateBoxes() {
  return (
    <svg
      viewBox="0 0 240 100"
      className="figure-svg"
      role="img"
      aria-label={`暗室の棚に並んだ3つの乾板の箱。札は左から「${PLATE_BOX_LABELS.join('」「')}」`}
    >
      {PLATE_BOX_LABELS.map((label, i) => {
        const x = 12 + i * 76
        return (
          <g key={label}>
            <rect
              x={x}
              y={22}
              width={64}
              height={56}
              rx={3}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <line x1={x} x2={x + 64} y1={34} y2={34} stroke="currentColor" strokeWidth="1.2" />
            <rect
              x={x + 6}
              y={46}
              width={52}
              height={22}
              rx={2}
              fill="#fffaf0"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text x={x + 32} y={61} fontSize="11" textAnchor="middle" fill="currentColor">
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** q5：手帳の最後のページに書かれた文字列 */
export function CipherObservatory() {
  const chars = [...OBSERVATORY_CIPHER]
  const width = 20 + chars.length * 24
  return (
    <svg
      viewBox={`0 0 ${width} 60`}
      className="figure-svg"
      role="img"
      aria-label={`博士の手帳の最後のページに書かれた、意味の通らない文字列「${OBSERVATORY_CIPHER}」`}
    >
      <line x1="10" x2={width - 10} y1="44" y2="44" stroke="currentColor" strokeWidth="1" />
      {chars.map((c, i) => (
        <text key={i} x={22 + i * 24} y="38" fontSize="20" textAnchor="middle" fill="currentColor">
          {c}
        </text>
      ))}
    </svg>
  )
}

/** q6：4×4 の星図。与えられたマスだけに等級を描く */
export function StarGrid() {
  const size = 4
  const cell = 40
  const origin = 20
  const end = origin + size * cell
  const label =
    '4×4の星図。' +
    STAR_GRID_GIVENS.map((g) => `${g.row}行目${g.col}列目が${g.value}等星`).join('、') +
    '。ほかのマスは空欄'
  return (
    <svg viewBox="0 0 200 200" className="figure-svg" role="img" aria-label={label}>
      {Array.from({ length: size + 1 }, (_, i) => {
        const p = origin + i * cell
        const w = i % 2 === 0 ? 2.4 : 0.8
        return (
          <g key={i}>
            <line x1={origin} x2={end} y1={p} y2={p} stroke="currentColor" strokeWidth={w} />
            <line x1={p} x2={p} y1={origin} y2={end} stroke="currentColor" strokeWidth={w} />
          </g>
        )
      })}
      {STAR_GRID_GIVENS.map((g) => {
        const cx = origin + (g.col - 1) * cell + cell / 2
        const cy = origin + (g.row - 1) * cell + cell / 2
        return (
          <g key={`${g.row}-${g.col}`}>
            <text x={cx} y={cy - 6} fontSize="12" textAnchor="middle" fill="currentColor">
              ★
            </text>
            <text x={cx} y={cy + 14} fontSize="18" textAnchor="middle" fill="currentColor">
              {g.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** q9：1〜4 番のブレーカーが並んだ配電盤。配線は描かない */
export function BreakerPanel() {
  const numbers = Array.from({ length: BREAKER_COUNT }, (_, i) => i + 1)
  const width = 20 + BREAKER_COUNT * 52
  return (
    <svg
      viewBox={`0 0 ${width} 110`}
      className="figure-svg"
      role="img"
      aria-label={`地下倉庫の配電盤。1番から${BREAKER_COUNT}番までのブレーカーが並び、今はすべて入っている`}
    >
      <rect
        x="8"
        y="8"
        width={width - 16}
        height="94"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      {numbers.map((n) => {
        const x = 20 + (n - 1) * 52
        return (
          <g key={n}>
            <rect
              x={x}
              y="22"
              width="38"
              height="52"
              rx="3"
              fill="#fffaf0"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <rect x={x + 10} y="28" width="18" height="20" rx="2" fill="currentColor" />
            <text x={x + 19} y="64" fontSize="10" textAnchor="middle" fill="currentColor">
              入
            </text>
            <text x={x + 19} y="92" fontSize="13" textAnchor="middle" fill="currentColor">
              {n}番
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** q11：制御盤に並ぶ 4 つの星座の記号 */
export function Constellations() {
  const label = `ドームの制御盤に並ぶ4つの星座の記号。${CONSTELLATIONS.map((c) => c.name).join('、')}`
  return (
    <svg viewBox="0 0 240 90" className="figure-svg" role="img" aria-label={label}>
      {CONSTELLATIONS.map((c, i) => {
        const x = 30 + i * 60
        return (
          <g key={c.name}>
            {/* U+FE0E で、カラー絵文字ではなくテキストの字形（墨一色）に固定する */}
            <text x={x} y="44" fontSize="30" textAnchor="middle" fill="currentColor">
              {`${c.symbol}\uFE0E`}
            </text>
            <text x={x} y="70" fontSize="11" textAnchor="middle" fill="currentColor">
              {c.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
