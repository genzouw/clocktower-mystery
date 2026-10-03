export type PuzzleId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8' | 'p9' | 'p10'

export type RoomId =
  | 'hall'
  | 'corridor'
  | 'study'
  | 'library'
  | 'music'
  | 'greenhouse'
  | 'dining'
  | 'kitchen'
  | 'bedroom'
  | 'cellar'
  | 'tower'

export type EvidenceId =
  'case' | 'shoes' | 'safe' | 'lefties' | 'time' | 'marco' | 'koharu' | 'footprint' | 'letter'

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
  figure?: 'staff' | 'seats' | 'books' | 'magic' | 'cipher'
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
