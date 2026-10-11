import { describe, expect, it } from 'vitest'
import { shouldCloseOnBackdropClick, shouldSubmitOnEnter } from './puzzleInput'

describe('shouldSubmitOnEnter', () => {
  it('桁がそろっていれば、ヒントのボタンにフォーカスがあっても送信する', () => {
    expect(shouldSubmitOnEnter(4, 4, 'other')).toBe(true)
  })
  it('桁がそろっていなければ送信しない（ヒントのボタンの Enter は開く操作のまま）', () => {
    expect(shouldSubmitOnEnter(3, 4, 'other')).toBe(false)
    expect(shouldSubmitOnEnter(0, 4, 'other')).toBe(false)
  })
  it('画面キーと × にフォーカスがあるときは、そのボタンに任せる', () => {
    expect(shouldSubmitOnEnter(4, 4, 'keypad')).toBe(false)
    expect(shouldSubmitOnEnter(4, 4, 'dialog-close')).toBe(false)
  })
})

describe('shouldCloseOnBackdropClick', () => {
  const backdrop = new EventTarget()
  const panel = new EventTarget()
  it('押下も離した位置も背景なら閉じる', () => {
    expect(shouldCloseOnBackdropClick(backdrop, backdrop, backdrop)).toBe(true)
  })
  it('パネル内で押して背景で離したときは閉じない', () => {
    expect(shouldCloseOnBackdropClick(panel, backdrop, backdrop)).toBe(false)
  })
  it('パネル内のクリックでは閉じない', () => {
    expect(shouldCloseOnBackdropClick(panel, panel, backdrop)).toBe(false)
    expect(shouldCloseOnBackdropClick(null, panel, backdrop)).toBe(false)
  })
  it('押下を観測していないときは、クリックの位置だけで判定する', () => {
    expect(shouldCloseOnBackdropClick(null, backdrop, backdrop)).toBe(true)
  })
})
