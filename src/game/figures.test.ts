import { describe, expect, it } from 'vitest'
import {
  FIGURE_IDS,
  FIGURES_BY_SCENARIO,
  OBSERVATORY_CIPHER,
  STAR_GRID_GIVENS,
  figuresOf,
} from './figures'
import { SCENARIOS } from './scenarios'

describe('図版の ID', () => {
  it('シナリオをまたいで重複しない', () => {
    expect(new Set(FIGURE_IDS).size).toBe(FIGURE_IDS.length)
  })

  it('登録されたシナリオが使う図版は、そのシナリオの図版として引ける', () => {
    for (const s of SCENARIOS) {
      for (const p of Object.values(s.puzzles)) {
        if (p.figure) expect(figuresOf(s.id)).toContain(p.figure)
      }
    }
  })

  it('図版を持たないシナリオ ID には空を返す', () => {
    expect(figuresOf('unknown')).toEqual([])
    expect(Object.keys(FIGURES_BY_SCENARIO)).toContain('observatory')
  })
})

// 以下は、図版のデータだけから q5・q6 の答えが 1 つに決まることの確認。
// 謎全体の総当たり（手がかり・選択肢を含む）は、謎のデータを加えるタスクで行う
describe('シナリオ 2 の図版データ', () => {
  it('q5：鍵 2076 で復号すると「ろうかのほしのえ」になる', () => {
    const table = [
      ...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
    ]
    expect(table).toHaveLength(46)
    const key = [2, 0, 7, 6]
    const plain = [...OBSERVATORY_CIPHER]
      .map((c, i) => table[(table.indexOf(c) - key[i % key.length] + 46) % 46])
      .join('')
    expect(plain).toBe('ろうかのほしのえ')
  })

  it('q6：与えたマスと矛盾しない 4×4 の数独の完成形は 1 つだけで、一番下の段は 3241', () => {
    const grid = Array.from({ length: 4 }, () => [0, 0, 0, 0])
    for (const g of STAR_GRID_GIVENS) grid[g.row - 1][g.col - 1] = g.value
    const ok = (r: number, c: number, v: number) => {
      for (let i = 0; i < 4; i++) if (grid[r][i] === v || grid[i][c] === v) return false
      const br = r - (r % 2)
      const bc = c - (c % 2)
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) if (grid[br + i][bc + j] === v) return false
      return true
    }
    const found: string[] = []
    const fill = (pos: number) => {
      if (pos === 16) {
        found.push(grid.map((row) => row.join('')).join('/'))
        return
      }
      const r = Math.floor(pos / 4)
      const c = pos % 4
      if (grid[r][c] !== 0) return fill(pos + 1)
      for (let v = 1; v <= 4; v++) {
        if (!ok(r, c, v)) continue
        grid[r][c] = v
        fill(pos + 1)
        grid[r][c] = 0
      }
    }
    fill(0)
    expect(found).toEqual(['2314/4132/1423/3241'])
  })
})
