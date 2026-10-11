import { describe, expect, it } from 'vitest'
import { FOCUSABLE } from './dialogFocus'

describe('FOCUSABLE', () => {
  it('どの種類の要素も、tabindex="-1" を除く条件を持つ', () => {
    const parts = FOCUSABLE.split(', ')
    expect(parts).toHaveLength(6)
    for (const p of parts) expect(p).toContain(':not([tabindex="-1"])')
  })

  it('選ばれていないタブ（button の tabindex=-1）を拾わない形になっている', () => {
    expect(FOCUSABLE).toContain('button:not([disabled]):not([tabindex="-1"])')
  })
})
