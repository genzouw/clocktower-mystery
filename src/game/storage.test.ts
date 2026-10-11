import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScenarioSelect } from '../components/ScenarioSelect'
import { reducerFor, initialState, type GameState } from './state'
import { SCENARIOS } from './scenarios'
import { clocktower } from './scenarios/clocktower'
import {
  CURRENT_KEY,
  loadCurrent,
  loadState,
  parseSave,
  saveCurrent,
  saveKey,
  saveState,
  scenarioStatus,
  type KeyValueStore,
} from './storage'
import type { Scenario } from './types'

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {
  data: Map<string, string>
} {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

/**
 * 選択の動作を確かめるためのダミーのシナリオ。本番のデータ（SCENARIOS）には含めない。
 * 部屋・謎・証拠はシナリオ 1 の ID の一部だけを持つ（ID を取り除く処理の検証にも使う）
 */
const dummy: Scenario = {
  ...clocktower,
  id: 'dummy',
  title: 'ダミーの事件',
  difficulty: 3,
  startRoom: 'study',
}

describe('保存のキー', () => {
  it('シナリオ 1 は従来のキー、それ以外は <ID>:v1 を使う', () => {
    expect(saveKey('clocktower')).toBe('clocktower-mystery:v1')
    expect(saveKey('observatory')).toBe('clocktower-mystery:observatory:v1')
    expect(saveKey('dummy')).toBe('clocktower-mystery:dummy:v1')
    expect(CURRENT_KEY).toBe('clocktower-mystery:current')
    // 本番に登録したシナリオの ID が、キーの形を壊す文字を含まない
    for (const s of SCENARIOS) expect(s.id).toMatch(/^[a-z][a-z0-9-]*$/)
  })
})

describe('更新前に保存した進行（シナリオ 1）', () => {
  // 更新前の版が書いた形式のまま。解いた謎・ヒント・誤答・部屋を持つ
  const legacy = {
    started: true,
    room: 'study',
    visited: ['hall', 'study'],
    solved: ['p1', 'p2'],
    evidence: ['case'],
    hintsUsed: { p1: 1, p3: 2 },
    mistakes: { p2: 3 },
    cleared: false,
  }

  it('従来のキーから、内容を変えずに続きから遊べる状態として読み込める', () => {
    const store = memoryStore({ 'clocktower-mystery:v1': JSON.stringify(legacy) })
    const s = loadState(clocktower, store)
    expect(s).toEqual(legacy)
    expect(scenarioStatus(clocktower, s)).toEqual({ kind: 'playing', solved: 2, total: 10 })
  })

  it('保存すると従来のキーに同じ形式で書き、他のキーは増やさない', () => {
    const store = memoryStore()
    saveState(clocktower, legacy as GameState, store)
    expect([...store.data.keys()]).toEqual(['clocktower-mystery:v1'])
    expect(JSON.parse(store.data.get('clocktower-mystery:v1')!)).toEqual(legacy)
  })

  it('読み込んで保存し直しても、既存のセーブデータが壊れない', () => {
    const raw = JSON.stringify(legacy)
    const store = memoryStore({ 'clocktower-mystery:v1': raw })
    saveState(clocktower, loadState(clocktower, store), store)
    expect(JSON.parse(store.data.get('clocktower-mystery:v1')!)).toEqual(legacy)
  })

  it('解決済みの保存データは「解決済み」になり、ランクが出る', () => {
    const cleared = { ...legacy, solved: clocktower.puzzleOrder, cleared: true }
    const s = parseSave(JSON.stringify(cleared), clocktower)
    expect(s.cleared).toBe(true)
    expect(scenarioStatus(clocktower, s).kind).toBe('cleared')
  })
})

describe('シナリオごとの保存', () => {
  it('シナリオ 1 以外の進行は別のキーに保存され、互いに影響しない', () => {
    const store = memoryStore()
    const a = reducerFor(clocktower)(initialState(clocktower), { type: 'solve', id: 'p1' })
    const b = reducerFor(dummy)(initialState(dummy), { type: 'solve', id: 'p4' })
    saveState(clocktower, a, store)
    saveState(dummy, b, store)
    expect([...store.data.keys()].sort()).toEqual([
      'clocktower-mystery:dummy:v1',
      'clocktower-mystery:v1',
    ])
    expect(loadState(clocktower, store).solved).toEqual(['p1'])
    expect(loadState(dummy, store).solved).toEqual(['p4'])
  })

  it('「はじめから」は選んだシナリオの進行だけを書き換える', () => {
    const store = memoryStore()
    saveState(clocktower, { ...initialState(clocktower), solved: ['p1'], started: true }, store)
    saveState(dummy, { ...initialState(dummy), solved: ['p4'], started: true }, store)
    const reset = reducerFor(dummy)(loadState(dummy, store), { type: 'reset' })
    saveState(dummy, reset, store)
    expect(loadState(dummy, store).solved).toEqual([])
    expect(loadState(clocktower, store).solved).toEqual(['p1'])
  })

  it('最後に選んだシナリオを current に保存し、登録の無い ID は無視する', () => {
    const store = memoryStore()
    expect(loadCurrent([clocktower, dummy], store)).toBeNull()
    saveCurrent('dummy', store)
    expect(store.data.get('clocktower-mystery:current')).toBe('dummy')
    expect(loadCurrent([clocktower, dummy], store)).toBe('dummy')
    // 公開を戻して、そのシナリオが無くなった場合
    expect(loadCurrent([clocktower], store)).toBeNull()
  })

  it('ストレージが使えなくても落ちず、初期状態で遊べる', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {},
    }
    expect(loadState(clocktower, broken)).toEqual(initialState(clocktower))
    expect(() => saveState(clocktower, initialState(clocktower), broken)).not.toThrow()
    expect(loadCurrent([clocktower], broken)).toBeNull()
    expect(() => saveCurrent('clocktower', broken)).not.toThrow()
  })
})

describe('読み込み時の ID の検証', () => {
  it('シナリオに無い部屋・謎・証拠の ID を取り除き、部屋は開始の部屋へ戻す', () => {
    const raw = JSON.stringify({
      started: true,
      room: 'no-such-room',
      visited: ['hall', 'no-such-room', 'study'],
      solved: ['p1', 'q99'],
      evidence: ['case', 'ghost'],
      hintsUsed: { p1: 1, q99: 2 },
      mistakes: { q99: 1, p2: 1 },
      cleared: true,
    })
    const s = parseSave(raw, clocktower)
    expect(s.room).toBe(clocktower.startRoom)
    expect(s.visited).toEqual(['hall', 'study'])
    expect(s.solved).toEqual(['p1'])
    expect(s.evidence).toEqual(['case'])
    expect(s.hintsUsed).toEqual({ p1: 1 })
    expect(s.mistakes).toEqual({ p2: 1 })
    // 最後の謎が解けていないので、解決済みにはしない
    expect(s.cleared).toBe(false)
  })

  it('型の合わない項目は初期値に戻し、壊れたデータは初期状態にする', () => {
    const s = parseSave(JSON.stringify({ solved: 'p1', hintsUsed: [1], room: 5 }), clocktower)
    expect(s).toEqual(initialState(clocktower))
    for (const raw of ['null', '42', '[]', '"x"', '{壊れた', '']) {
      expect(parseSave(raw, clocktower)).toEqual(initialState(clocktower))
    }
  })

  it('別のシナリオの保存データを読んでも、そのシナリオに存在する ID だけが残る', () => {
    const other = { ...initialState(clocktower), room: 'hall', solved: ['p1'] }
    const s = parseSave(JSON.stringify(other), {
      ...dummy,
      rooms: { study: clocktower.rooms.study },
    })
    expect(s.room).toBe('study')
    expect(s.visited).toEqual(['study'])
  })
})

describe('シナリオ選択の一覧', () => {
  const html = (store: ReturnType<typeof memoryStore>, currentId: string | null) =>
    renderToStaticMarkup(
      ScenarioSelect({
        entries: [clocktower, dummy].map((scenario) => ({
          scenario,
          status: scenarioStatus(scenario, loadState(scenario, store)),
        })),
        currentId,
        onSelect: () => {},
      }),
    )

  it('各シナリオの題名・難易度・状態を出す', () => {
    const store = memoryStore({
      'clocktower-mystery:v1': JSON.stringify({ started: true, solved: ['p1', 'p2', 'p3'] }),
    })
    const out = html(store, 'dummy')
    expect(out).toContain(clocktower.title)
    expect(out).toContain('ダミーの事件')
    expect(out).toContain('進行中')
    expect(out).toContain('解いた謎 3/10')
    expect(out).toContain('未着手')
    expect(out).toContain('難易度 2 / 3')
    expect(out).toContain('難易度 3 / 3')
    expect(out).toContain('前回')
  })

  it('解決済みはランクを出す', () => {
    const store = memoryStore({
      'clocktower-mystery:dummy:v1': JSON.stringify({
        started: true,
        solved: dummy.puzzleOrder,
        cleared: true,
      }),
    })
    expect(html(store, null)).toContain('解決済み')
    expect(html(store, null)).toContain('名探偵')
  })

  it('本番に登録したシナリオには、ダミーを含めない', () => {
    expect(SCENARIOS.map((s) => s.id)).not.toContain('dummy')
  })
})
