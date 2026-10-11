import { describe, expect, it } from 'vitest'
import {
  LABEL_DISTANCE_SCALE_RANGE,
  LABEL_PIXEL_RATIO_MAX,
  LABEL_REFERENCE_DISTANCE,
  labelDistanceScale,
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
