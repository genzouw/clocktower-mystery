import type { Scenario } from '../../types'
import { ENDING, RANK } from './ending'
import { EVIDENCE } from './evidence'
import { LAYOUT, PORTAL_PLACES, THEME } from './layout'
import { PUZZLES, PUZZLE_ORDER, SUSPECTS } from './puzzles'
import { ROOMS } from './rooms'

/**
 * シナリオ 2「雪の天文台と消えた彗星」。
 * 導入文に停電の時刻を書かない（q1 の答えになるため）
 */
export const observatory: Scenario = {
  id: 'observatory',
  title: '雪の天文台と消えた彗星',
  difficulty: 3,
  titleLines: ['雪の天文台と', '消えた彗星'],
  titleEmoji: '🔭❄️',
  lead: [
    '雪に閉ざされた山荘「星見荘」で、天文学者の朝霧博士が見つけた彗星の写真乾板が、夜の停電のあいだに消えた。',
    '山荘を歩き回り、12の謎を解いて、乾板を持ち去った人物を突き止めよ。',
  ],
  howto: [
    '謎のある物は、見た目では分からない。どの物も、近づいて調べてみよう',
    '手がかりが足りない謎は、答えられない。ほかの物を調べて、情報を集めよう',
    '部屋の絵や張り紙など、何気ない物の説明も、謎を解く手がかりになる',
  ],

  startRoom: 'entrance',
  initialEvidence: ['case'],
  rooms: ROOMS,
  layout: LAYOUT,
  theme: THEME,
  portalPlaces: PORTAL_PLACES,
  puzzles: PUZZLES,
  puzzleOrder: PUZZLE_ORDER,
  finalPuzzle: 'q12',
  suspects: [...SUSPECTS],
  evidence: EVIDENCE,
  ending: ENDING,
  rank: RANK,
  hotspotMarkers: 'hidden',
}
