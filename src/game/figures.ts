/** 謎に添える図版の ID。図版の描画は `components/Figure.tsx` が ID から引く */
export const FIGURE_IDS = ['staff', 'seats', 'books', 'magic', 'cipher'] as const

export type FigureId = (typeof FIGURE_IDS)[number]
