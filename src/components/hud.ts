import type { Scenario } from '../game/types'

/** 操作ガイドが自動で閉じるまでの時間 */
export const GUIDE_AUTO_CLOSE_MS = 10000

/** 操作ガイドの表示を変える出来事 */
export type GuideEvent = 'timeout' | 'first-move' | 'tap' | 'show'

/** 操作ガイドの表示状態の遷移。自動で閉じる・最初に動く・タップで閉じ、「操作」ボタンで再表示する */
export function guideVisibleAfter(event: GuideEvent): boolean {
  return event === 'show'
}

/** 謎のある物の目印について、シナリオの設定に合った説明を返す */
export function markerHowto(scenario: Pick<Scenario, 'hotspotMarkers'>): string {
  return scenario.hotspotMarkers === 'hidden'
    ? '謎のある物に目印は付かない。名札と説明文をよく読み、気になる物を調べよう'
    : '足元の輪が光る物や【謎】の名札は、謎のある物。【解決】になれば解き終えた印'
}

/** 進行を消す確認の流れ。「確認する」で確認を出し、「やめる」で閉じ、実行で閉じて処理する */
export type ResetConfirmEvent = 'ask' | 'cancel' | 'confirm'
export function nextConfirming(confirming: boolean, event: ResetConfirmEvent): boolean {
  if (event === 'ask') return true
  if (event === 'cancel' || event === 'confirm') return false
  return confirming
}
