import type { Scenario } from '../types'
import { clocktower } from './clocktower'
import { observatory } from './observatory'

/** 登録したシナリオ。先頭が、最初に遊ぶシナリオ */
export const SCENARIOS: Scenario[] = [clocktower, observatory]
