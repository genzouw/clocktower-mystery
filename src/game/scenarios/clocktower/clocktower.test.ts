import { describe, expect, it } from 'vitest'
import { isCorrect, normalize } from '../../answer'
import { isUnlocked } from '../../scenario'
import { buildWorld, isAtPortal, roomAt } from '../../world'
import { clocktower } from '.'
import { SUSPECT_TRAITS } from './solve'

// シナリオ 1 の固有の値を確かめる。構造と解の一意性は scenarios.test.ts が全シナリオに対して確かめる
describe('シナリオ 1：時計塔の館と星の涙', () => {
  it('謎は 10 問で、最後の謎は p10', () => {
    expect(clocktower.puzzleOrder).toHaveLength(10)
    expect(clocktower.finalPuzzle).toBe('p10')
  })

  it('最初から挑める謎が 4 問以上あり、手がかり待ちの謎もある', () => {
    const open = clocktower.puzzleOrder.filter((id) => isUnlocked(clocktower, id, []))
    expect(open.length).toBeGreaterThanOrEqual(4)
    expect(open.length).toBeLessThan(clocktower.puzzleOrder.length)
  })

  it('容疑者の一覧と犯人が、推理の条件の表と一致する', () => {
    expect(SUSPECT_TRAITS.map((s) => s.name)).toEqual(clocktower.suspects)
    expect(clocktower.ending.culprit).toBe('執事・佐伯')
    expect(isCorrect(clocktower.puzzles.p10, clocktower.ending.culprit)).toBe(true)
  })

  it('見取り図は 4 列に収まる', () => {
    const columns = Math.max(...Object.values(clocktower.rooms).map((r) => r.map.x)) + 1
    expect(columns).toBe(4)
  })

  it('廊下の北壁の階段の扉は、廊下側からだけ反応し、壁の向こうの図書室からは反応しない', () => {
    const world = buildWorld(clocktower)
    const up = world.portals.find((p) => p.room === 'corridor' && p.exit.dir === 'up')!
    expect(isAtPortal(world, up, { x: up.x, z: up.z + 0.5 })).toBe(true)
    expect(isAtPortal(world, up, { x: up.x, z: up.z - 0.6 })).toBe(false)
    expect(roomAt(world, { x: up.x, z: up.z - 0.6 })).toBe('library')
  })

  it('答えの表記ゆれ：カタカナ・全角・空白を吸収する', () => {
    const { p1, p3 } = clocktower.puzzles
    expect(normalize('ト ケ イ ノ ナ カ')).toBe('とけいのなか')
    expect(isCorrect(p1, '４２６５')).toBe(true)
    expect(isCorrect(p3, '時計の中')).toBe(true)
    expect(isCorrect(p3, 'とけい')).toBe(false)
  })
})
