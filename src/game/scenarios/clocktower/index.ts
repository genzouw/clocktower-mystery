import type { Scenario } from '../../types'
import { ENDING, RANK } from './ending'
import { EVIDENCE } from './evidence'
import { LAYOUT, PORTAL_PLACES, THEME } from './layout'
import { PUZZLES, PUZZLE_ORDER, SUSPECTS } from './puzzles'
import { ROOMS } from './rooms'

/** シナリオ 1「時計塔の館と星の涙」 */
export const clocktower: Scenario = {
  id: 'clocktower',
  title: '時計塔の館と星の涙',
  difficulty: 2,
  titleLines: ['時計塔の館と', '星の涙'],
  titleEmoji: '🕰️💎',
  lead: [
    '時任伯爵の館で、宝石「星の涙」が盗まれた。',
    '館を歩き回り、10の謎を解いて犯人を突き止めよ。',
  ],
  howto: ['集めた証拠は「手帳」でいつでも見返せる', '進行状況はこの端末に自動で保存される'],
  startRoom: 'hall',
  initialEvidence: ['case'],
  rooms: ROOMS,
  layout: LAYOUT,
  theme: THEME,
  portalPlaces: PORTAL_PLACES,
  puzzles: PUZZLES,
  puzzleOrder: PUZZLE_ORDER,
  finalPuzzle: 'p10',
  suspects: [...SUSPECTS],
  evidence: EVIDENCE,
  ending: ENDING,
  rank: RANK,
  hotspotMarkers: 'visible',
}
