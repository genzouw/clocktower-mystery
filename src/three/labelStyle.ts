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
  if (!Number.isFinite(distance) || !Number.isFinite(reach)) return 0
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
  if (!Number.isFinite(distance)) return 1
  return Math.min(max, Math.max(min, distance / LABEL_REFERENCE_DISTANCE))
}

/** 名札の幅が画面幅に占める割合の上限。両端が切れないように、少し余白を残す */
export const LABEL_MAX_SCREEN_FRACTION = 0.9
/** 近づいた物の名札を強調で拡大する最大の倍率（World3D の強調と揃える） */
export const LABEL_EMPHASIS_MAX_SCALE = 1.12

/**
 * 名札の幅（ワールド座標。倍率 1 のとき）が、画面幅の約 90% に収まる倍率の上限。
 * 距離による倍率（labelDistanceScale）は文字数を考慮しないため、長い名札は近距離で画面幅を超える。
 * 強調で拡大する分（LABEL_EMPHASIS_MAX_SCALE）も見込んで、強調時にも 90% を超えないようにする。
 * 引数が不正なときは制限しない（Infinity を返す）
 *
 * @param labelWidth 名札の幅（ワールド座標）
 * @param distance カメラ前方向の奥行き（視点から名札までのベクトルを視軸へ射影した長さ。直線距離ではない）
 * @param fovDegrees カメラの縦方向の視野角（度）
 * @param aspect 画面の幅 / 高さ
 */
export function labelMaxScale(
  labelWidth: number,
  distance: number,
  fovDegrees: number,
  aspect: number,
): number {
  if (![labelWidth, distance, fovDegrees, aspect].every(Number.isFinite)) return Infinity
  if (labelWidth <= 0 || distance <= 0 || fovDegrees <= 0 || fovDegrees >= 180 || aspect <= 0) {
    return Infinity
  }
  const visibleWidth = 2 * distance * Math.tan((fovDegrees * Math.PI) / 360) * aspect
  return (visibleWidth * LABEL_MAX_SCREEN_FRACTION) / (labelWidth * LABEL_EMPHASIS_MAX_SCALE)
}

/**
 * 視点から名札までのカメラ前方向の奥行き（視点から名札へのベクトルを視軸へ射影した長さ）。
 * 画面上の幅を決めるのは直線距離ではなくこの奥行きで、視軸から外れた名札ほど直線距離は奥行きより長い。
 * カメラの後ろにある名札は 0 以下になる。forward は単位ベクトルであること
 */
export function labelDepth(
  eye: { x: number; y: number; z: number },
  forward: { x: number; y: number; z: number },
  point: { x: number; y: number; z: number },
): number {
  return (
    (point.x - eye.x) * forward.x + (point.y - eye.y) * forward.y + (point.z - eye.z) * forward.z
  )
}
