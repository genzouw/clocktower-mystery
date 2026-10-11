import { describe, expect, it } from 'vitest'
import {
  LABEL_DISTANCE_SCALE_RANGE,
  LABEL_EMPHASIS_MAX_SCALE,
  LABEL_MAX_SCREEN_FRACTION,
  LABEL_PIXEL_RATIO_MAX,
  LABEL_REFERENCE_DISTANCE,
  labelDepth,
  labelDistanceScale,
  labelMaxScale,
  labelPixelRatio,
  reachEmphasis,
} from './labelStyle'

describe('labelPixelRatio', () => {
  it('画素密度をそのまま使い、上限で頭打ちにする', () => {
    expect(labelPixelRatio(1)).toBe(1)
    expect(labelPixelRatio(1.5)).toBe(1.5)
    expect(labelPixelRatio(3)).toBe(LABEL_PIXEL_RATIO_MAX)
  })

  it('1 未満や不正な値は 1 にする', () => {
    expect(labelPixelRatio(0)).toBe(1)
    expect(labelPixelRatio(0.75)).toBe(1)
    expect(labelPixelRatio(Number.NaN)).toBe(1)
  })
})

describe('reachEmphasis', () => {
  it('調べられる距離の内側は 1、十分に離れると 0', () => {
    expect(reachEmphasis(0.5, 2.8)).toBe(1)
    expect(reachEmphasis(2.8, 2.8)).toBe(1)
    expect(reachEmphasis(2.8 + 0.7, 2.8)).toBe(0)
    expect(reachEmphasis(10, 2.8)).toBe(0)
  })

  it('NaN や無限大を入れても NaN を返さない', () => {
    expect(reachEmphasis(Number.NaN, 2.8)).toBe(0)
    expect(reachEmphasis(1, Number.NaN)).toBe(0)
    expect(reachEmphasis(Number.POSITIVE_INFINITY, 2.8)).toBe(0)
  })

  it('境界の外側では、離れるほど単調に小さくなる', () => {
    const near = reachEmphasis(3.0, 2.8)
    const far = reachEmphasis(3.3, 2.8)
    expect(near).toBeLessThan(1)
    expect(far).toBeLessThan(near)
    expect(far).toBeGreaterThan(0)
  })
})

describe('labelDistanceScale', () => {
  it('基準の距離では等倍で、近いほど小さく、遠いほど大きい', () => {
    expect(labelDistanceScale(LABEL_REFERENCE_DISTANCE)).toBe(1)
    expect(labelDistanceScale(2)).toBeLessThan(1)
    expect(labelDistanceScale(4)).toBeGreaterThan(1)
  })

  it('下限と上限で頭打ちになる', () => {
    expect(labelDistanceScale(0)).toBe(LABEL_DISTANCE_SCALE_RANGE.min)
    expect(labelDistanceScale(100)).toBe(LABEL_DISTANCE_SCALE_RANGE.max)
  })
})

describe('labelDistanceScale の不正な入力', () => {
  it('NaN は等倍にする', () => {
    expect(labelDistanceScale(Number.NaN)).toBe(1)
  })
})

describe('labelMaxScale', () => {
  // 縦 70 度・390x844 の画面（縦持ちのスマートフォン）
  const fov = 70
  const aspect = 390 / 844
  const visibleWidth = (d: number) => 2 * d * Math.tan((fov * Math.PI) / 360) * aspect

  it('倍率を掛けた名札（強調込み）の幅が、画面幅の約 90% に収まる', () => {
    const width = 3.2
    for (const d of [1.65, 2, 3, 4]) {
      const s = labelMaxScale(width, d, fov, aspect)
      expect(width * s * LABEL_EMPHASIS_MAX_SCALE).toBeCloseTo(
        visibleWidth(d) * LABEL_MAX_SCREEN_FRACTION,
      )
    }
  })

  it('近いほど上限が小さくなり、名札が広いほど上限が小さくなる', () => {
    expect(labelMaxScale(3, 1.5, fov, aspect)).toBeLessThan(labelMaxScale(3, 3, fov, aspect))
    expect(labelMaxScale(4, 2, fov, aspect)).toBeLessThan(labelMaxScale(2, 2, fov, aspect))
  })

  it('広い画面では上限が大きく、制限にならない', () => {
    expect(labelMaxScale(2, 3, fov, 16 / 9)).toBeGreaterThan(LABEL_DISTANCE_SCALE_RANGE.max)
  })

  it('不正な入力は制限しない', () => {
    expect(labelMaxScale(Number.NaN, 2, fov, aspect)).toBe(Number.POSITIVE_INFINITY)
    expect(labelMaxScale(3, 0, fov, aspect)).toBe(Number.POSITIVE_INFINITY)
    expect(labelMaxScale(3, 2, fov, 0)).toBe(Number.POSITIVE_INFINITY)
    expect(labelMaxScale(3, 2, 180, aspect)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('labelDepth', () => {
  const eye = { x: 1, y: 1.6, z: 1 }
  const forward = { x: 0, y: 0, z: -1 }

  it('正面にある名札は、直線距離と同じ奥行きになる', () => {
    expect(labelDepth(eye, forward, { x: 1, y: 1.6, z: -2 })).toBeCloseTo(3)
  })

  it('視軸から外れた名札は、直線距離より短い奥行きになる', () => {
    const point = { x: 1, y: 2.55, z: 0 }
    const straight = Math.hypot(point.x - eye.x, point.y - eye.y, point.z - eye.z)
    expect(labelDepth(eye, forward, point)).toBeCloseTo(1)
    expect(labelDepth(eye, forward, point)).toBeLessThan(straight)
  })

  it('カメラの後ろの名札は 0 以下になり、labelMaxScale が制限しない', () => {
    const depth = labelDepth(eye, forward, { x: 1, y: 1.6, z: 3 })
    expect(depth).toBeLessThanOrEqual(0)
    expect(labelMaxScale(3, depth, 70, 0.46)).toBe(Number.POSITIVE_INFINITY)
  })
})
