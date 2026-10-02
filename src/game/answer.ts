import type { Puzzle } from './types'

/** 全角英数を半角に、カタカナをひらがなに寄せ、空白と記号を除く */
export function normalize(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s、。・,.!！?？「」『』ー〜~-]/g, '')
}

export function isCorrect(puzzle: Puzzle, input: string): boolean {
  switch (puzzle.kind) {
    case 'code':
      return normalize(input) === puzzle.answer
    case 'choice':
      return input === puzzle.answer
    case 'text':
      return puzzle.answers.some((a) => normalize(a) === normalize(input))
  }
}
