import type { Ending, RankThresholds } from '../../types'

export const ENDING: Ending = {
  culprit: '執事・佐伯',
  steps: [
    '金庫のダイヤルは左手で回されていた → 犯人は左利き。左利きは佐伯と蓮の2人だけ。',
    '書斎の時計が止まったのは 21時30分。その時刻、マルコは厨房、小春は音楽室にいた。',
    '温室の隠し棚に残った靴跡は 26cm。蓮の靴は 27cm。',
    '3つの条件をすべて満たすのは、佐伯ただ一人。',
  ],
  epilogue:
    '観念した佐伯は、塔の大時計の振り子の中から「星の涙」を取り出した。館の時計の手入れを任されていた彼は、時計に細工がされていることにまでは気づかなかったのだ。',
}

/** ヒントと誤答の合計が 0 なら最上位。great・good・fair 以下なら順に下のランク、それを超えると見習い */
export const RANK: RankThresholds = { great: 0, good: 5, fair: 15 }
