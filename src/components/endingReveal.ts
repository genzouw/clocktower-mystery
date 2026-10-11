/** エンディングの段階表示の間隔（ms）。Ending.css の delay と同じ */
export const REVEAL_INTERVAL_MS = 700
/** 1 項目が現れる時間（ms）。Ending.css の --dur-slow と同じ */
export const REVEAL_DURATION_MS = 600

/** 段階表示の順番（--i の値）。結末 → 推理のまとめの見出し → 各項目 → 後日談 → 成績 の順 */
export function revealOrder(stepCount: number) {
  return {
    lead: 1,
    heading: 2,
    step: (n: number) => 3 + n,
    epilogue: 3 + stepCount,
    result: 4 + stepCount,
  }
}

/** 段階表示が終わるまでの時間（ms） */
export function revealTotalMs(stepCount: number): number {
  return revealOrder(stepCount).result * REVEAL_INTERVAL_MS + REVEAL_DURATION_MS
}

/** 画面に付ける class。スキップ済み・表示が終わった後は、時間差の動きを止めて全部を見せる */
export function endingScreenClass(revealed: boolean): string {
  return revealed ? 'screen ending-screen revealed' : 'screen ending-screen'
}
