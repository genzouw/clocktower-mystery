import type { FigureId } from './figures'

/**
 * 謎・部屋・証拠の ID は、シナリオごとに定義する文字列。
 * 参照先が存在することは型ではなく、`scenarios.test.ts` の構造の検証で確かめる
 */
export type PuzzleId = string
export type RoomId = string
export type EvidenceId = string

export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

/** 隣の部屋や別の階へ続く出口 */
export interface Exit {
  dir: Direction
  to: RoomId
  label: string
}

/** 部屋の中で調べられる物。x / y はシーン内の位置（%） */
export interface Hotspot {
  id: string
  emoji: string
  name: string
  x: number
  y: number
  text: string
  puzzle?: PuzzleId
  evidence?: EvidenceId
}

export interface Room {
  id: RoomId
  name: string
  floor: string
  /** ミニマップ上の座標 */
  map: { x: number; y: number }
  description: string
  /** シーン背景（CSS の background 値） */
  background: string
  exits: Exit[]
  hotspots: Hotspot[]
}

interface PuzzleBase {
  id: PuzzleId
  title: string
  /** 問題文。改行区切りで段落になる */
  question: string
  /** 問題文の下に表示する図版 */
  figure?: FigureId
  hints: string[]
  /** 先に解いておかないと答えられない謎（手がかりの出どころは自動で含まれる） */
  requires?: PuzzleId[]
  /** 他の謎を解くと問題文に加わる手がかり。そろうまで、この謎は答えられない */
  clues?: { from: PuzzleId; text: string }[]
  /** 正解後に表示する文 */
  solvedText: string
  reward?: EvidenceId
}

export interface CodePuzzle extends PuzzleBase {
  kind: 'code'
  length: number
  answer: string
}

export interface ChoicePuzzle extends PuzzleBase {
  kind: 'choice'
  choices: string[]
  answer: string
}

export interface TextPuzzle extends PuzzleBase {
  kind: 'text'
  placeholder: string
  answers: string[]
}

export type Puzzle = CodePuzzle | ChoicePuzzle | TextPuzzle

export interface Evidence {
  id: EvidenceId
  title: string
  text: string
}

/** 部屋の壁の向き（東西南北） */
export type Side = 'north' | 'south' | 'east' | 'west'

/** 階段の転移扉を、部屋のどの壁のどの位置に置くか */
export type PortalPlaces = Partial<
  Record<RoomId, Partial<Record<Direction, { side: Side; offset: number }>>>
>

/** 事件解決時の画面に出す文 */
export interface Ending {
  /** 犯人の名前（`suspects` のいずれか） */
  culprit: string
  /** 推理のまとめ（箇条書きの各項目） */
  steps: string[]
  epilogue: string
}

/** 探偵ランクの境目。ヒントと誤答の合計がこの値以下なら、その段のランクになる */
export interface RankThresholds {
  great: number
  good: number
  fair: number
}

/**
 * シナリオ 1 つ分のデータ。進行ロジック・3D の世界・画面の部品は、これを引数か props で受け取る。
 * シナリオに依存する値（部屋・謎の ID、謎の数、犯人など）は、ここ以外に書かない
 */
export interface Scenario {
  /** シナリオの識別子 */
  id: string
  /** 一覧などに出す題名 */
  title: string
  /** タイトル画面の題名（改行位置ごとの行） */
  titleLines: string[]
  titleEmoji: string
  /** タイトル画面の導入文（行ごと） */
  lead: string[]
  /** タイトル画面の遊び方 */
  howto: string[]
  startRoom: RoomId
  /** 最初から手帳にある証拠 */
  initialEvidence: EvidenceId[]
  rooms: Record<RoomId, Room>
  /** 3D 空間での部屋の配置（グリッド座標。北は -z） */
  layout: Record<RoomId, { gx: number; gz: number }>
  theme: Record<RoomId, { wall: string; floor: string }>
  portalPlaces: PortalPlaces
  puzzles: Record<PuzzleId, Puzzle>
  /** 謎の並び（手帳の表示順） */
  puzzleOrder: PuzzleId[]
  /** 解くと事件が解決する最後の謎 */
  finalPuzzle: PuzzleId
  suspects: string[]
  evidence: Record<EvidenceId, Evidence>
  ending: Ending
  rank: RankThresholds
}
