import { describe, expect, it } from 'vitest'
import { clocktower } from '../game/scenarios/clocktower'
import { endingScreenClass, revealOrder, revealTotalMs } from './endingReveal'
import { guideVisibleAfter, markerHowto, nextConfirming } from './hud'

describe('markerHowto', () => {
  it('目印が hidden のシナリオは「目印は付かない」と説明する', () => {
    expect(markerHowto({ hotspotMarkers: 'hidden' })).toContain('目印は付かない')
  })
  it('目印が visible のシナリオは、光る物と【解決】の印を説明する', () => {
    const text = markerHowto({ hotspotMarkers: 'visible' })
    expect(text).toContain('光る')
    expect(text).not.toContain('目印は付かない')
  })
  it('シナリオ 1 の設定で、説明が空にならない', () => {
    expect(markerHowto(clocktower).length).toBeGreaterThan(0)
  })
})

describe('エンディングの段階表示', () => {
  it('--i は結末 → 見出し → 各項目 → 後日談 → 成績の順に、重ならず増える', () => {
    const o = revealOrder(4)
    const seq = [o.lead, o.heading, ...[0, 1, 2, 3].map(o.step), o.epilogue, o.result]
    expect(seq).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
  it('項目が増えると、全表示までの時間も延びる', () => {
    expect(revealTotalMs(6)).toBeGreaterThan(revealTotalMs(4))
  })
  it('スキップ後・表示後は revealed が付き、動きを止める', () => {
    expect(endingScreenClass(false)).not.toContain('revealed')
    expect(endingScreenClass(true)).toContain('revealed')
  })
})

describe('進行を消す確認', () => {
  it('確認を出し、やめるか実行すると閉じる', () => {
    expect(nextConfirming(false, 'ask')).toBe(true)
    expect(nextConfirming(true, 'cancel')).toBe(false)
    expect(nextConfirming(true, 'confirm')).toBe(false)
  })
})

describe('操作ガイド', () => {
  it('時間切れ・最初の移動・タップで閉じ、「操作」ボタンで再表示する', () => {
    expect(guideVisibleAfter('timeout')).toBe(false)
    expect(guideVisibleAfter('first-move')).toBe(false)
    expect(guideVisibleAfter('tap')).toBe(false)
    expect(guideVisibleAfter('show')).toBe(true)
  })
})
