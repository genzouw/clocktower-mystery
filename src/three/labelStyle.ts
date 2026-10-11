/**
 * 名札の描画解像度の上限（端末の画素密度に対する倍率）。
 * 3D の Canvas の dpr（`dpr={[1, 2]}`）と揃えている。名札は 1 枚ごとに
 * 画素数 = 幅 × 高さ × 倍率² のテクスチャを GPU に置くため、画素密度が 3 の端末でも
 * 2 で頭打ちにして、メモリと描画の負荷を抑える。2 倍あれば、名札の文字（画面上で 1 文字およそ 20〜30px）は
 * 画素密度 3 の画面でも縁がにじまない
 */
export const LABEL_PIXEL_RATIO_MAX = 2

/** 端末の画素密度から、名札を描く倍率を決める。1 以上、上限以下の値になる */
export function labelPixelRatio(devicePixelRatio: number, max = LABEL_PIXEL_RATIO_MAX): number {
  if (!Number.isFinite(devicePixelRatio) || devicePixelRatio < 1) return 1
  return Math.min(devicePixelRatio, max)
}

/** 調べられる距離の外側で、強調が消えるまでの幅（ワールド座標） */
export const REACH_FADE_BAND = 0.7

/**
 * 調べられる距離に対する強調の度合い（0〜1）。
 * 距離が reach 以内なら 1、そこから fadeBand だけ離れると 0 になる。
 * 謎の有無には依存しない。同じ距離にある物は、どの物も同じ度合いになる
 */
export function reachEmphasis(distance: number, reach: number, fadeBand = REACH_FADE_BAND): number {
  if (distance <= reach) return 1
  if (distance >= reach + fadeBand) return 0
  return 1 - (distance - reach) / fadeBand
}

/** 名札の大きさが基準になる距離（ワールド座標）。これより近いと小さく、遠いと大きく出す */
export const LABEL_REFERENCE_DISTANCE = 3
/** 名札を縮める下限と、拡大する上限 */
export const LABEL_DISTANCE_SCALE_RANGE = { min: 0.55, max: 1.35 } as const

/**
 * 視点から名札までの距離に応じた倍率。
 * 近づくと画面いっぱいに広がって他の物を隠し、遠いと小さくて読めないため、
 * 画面上の大きさが極端に変わらないように補正する（完全には打ち消さない）
 */
export function labelDistanceScale(distance: number): number {
  const { min, max } = LABEL_DISTANCE_SCALE_RANGE
  return Math.min(max, Math.max(min, distance / LABEL_REFERENCE_DISTANCE))
}
