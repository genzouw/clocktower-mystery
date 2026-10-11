/** 謎に添える図版の ID。図版の描画は `components/Figure.tsx` が ID から引く */
export const FIGURE_IDS = ['staff', 'seats', 'books', 'magic', 'cipher'] as const

export type FigureId = (typeof FIGURE_IDS)[number]

/** 五線譜上の音符。y はト音記号の五線で一番下の線（ミ）を 70 とした座標（上が小さい） */
export const STAFF_NOTES = [60, 80, 70, 55]

/** 魔方陣の植木鉢の番号札。空欄は抜け落ちた札、「？」は答える欄 */
export const MAGIC_CELLS = ['2', '7', '6', '', '5', '', '？', '？', '？']
