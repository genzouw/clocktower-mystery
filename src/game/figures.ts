/**
 * 謎に添える図版の ID を、図版を持つシナリオ ID ごとに並べた表。
 * 図版の描画は `components/Figure.tsx` が ID から引く。ID はシナリオをまたいで一意にする
 */
export const FIGURES_BY_SCENARIO = {
  clocktower: ['staff', 'seats', 'books', 'magic', 'cipher'],
  observatory: ['plateBoxes', 'cipherObservatory', 'starGrid', 'breakerPanel', 'constellations'],
} as const

export type FigureScenarioId = keyof typeof FIGURES_BY_SCENARIO

export const FIGURE_IDS = [
  ...FIGURES_BY_SCENARIO.clocktower,
  ...FIGURES_BY_SCENARIO.observatory,
] as const

export type FigureId = (typeof FIGURE_IDS)[number]

/** 図版を持つシナリオの図版 ID。図版を持たないシナリオ ID には空配列を返す */
export function figuresOf(scenarioId: string): readonly FigureId[] {
  return (FIGURES_BY_SCENARIO as Record<string, readonly FigureId[]>)[scenarioId] ?? []
}

// ---- シナリオ 1（clocktower） ----

/** 五線譜上の音符。y はト音記号の五線で一番下の線（ミ）を 70 とした座標（上が小さい） */
export const STAFF_NOTES = [60, 80, 70, 55]

/** 魔方陣の植木鉢の番号札。空欄は抜け落ちた札、「？」は答える欄 */
export const MAGIC_CELLS = ['2', '7', '6', '', '5', '', '？', '？', '？']

// ---- シナリオ 2（observatory） ----

/** q3 の乾板の箱に貼られた札（左の箱から順）。答えの箱は謎の側で決まり、図版は札だけを描く */
export const PLATE_BOX_LABELS = ['未使用', '撮影済み', '混在']

/** q5 の手帳に書かれた文字列。復号の鍵は手がかり（q3・q4）にあり、図版には含めない */
export const OBSERVATORY_CIPHER = 'をうすまみしみこ'

/** q6 の星図で、最初から与えられた等級。row・col は 1 始まり。図版は、このマスだけを描く */
export const STAR_GRID_GIVENS: readonly { row: number; col: number; value: number }[] = [
  { row: 1, col: 3, value: 1 },
  { row: 2, col: 1, value: 4 },
  { row: 3, col: 4, value: 3 },
  { row: 4, col: 2, value: 2 },
]

/** q9 の配電盤のブレーカーの数。配線（どの番号がどの部屋へ電気を送るか）は図版に含めない */
export const BREAKER_COUNT = 4

/** q11 の制御盤に並ぶ星座の記号 */
export const CONSTELLATIONS = [
  { symbol: '♈', name: '牡羊座' },
  { symbol: '♋', name: '蟹座' },
  { symbol: '♎', name: '天秤座' },
  { symbol: '♑', name: '山羊座' },
] as const
