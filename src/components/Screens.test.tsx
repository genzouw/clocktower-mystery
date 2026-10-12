import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { clocktower } from '../game/scenarios/clocktower'
import { observatory } from '../game/scenarios/observatory'
import type { Scenario } from '../game/types'
import { TitleScreen } from './Screens'

const noop = () => {}
const titleItems = (scenario: Scenario) => {
  const html = renderToStaticMarkup(
    createElement(TitleScreen, {
      scenario,
      hasProgress: false,
      onStart: noop,
      onReset: noop,
      onBack: noop,
    }),
  )
  return [...html.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1])
}

describe('タイトルの遊び方', () => {
  it('シナリオ 2 は、目印が付かないことを述べた項目が 1 つだけある', () => {
    const items = titleItems(observatory)
    expect(items.filter((t) => t.includes('目印は付かない'))).toHaveLength(1)
    // 「見た目では分からない」を言い換えた重複項目が残っていない
    expect(items.filter((t) => t.includes('見た目では分からない'))).toHaveLength(0)
  })

  it('シナリオ 1 は、共通の操作 3 項目・目印・固有の 2 項目のままである', () => {
    const items = titleItems(clocktower)
    expect(items).toHaveLength(3 + 1 + clocktower.howto.length)
    expect(items.some((t) => t.includes('足元の輪が光る物'))).toBe(true)
  })
})
