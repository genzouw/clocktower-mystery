import { CanvasTexture, SRGBColorSpace } from 'three'

export interface SpriteTexture {
  texture: CanvasTexture
  /** 幅 / 高さ */
  aspect: number
}

const cache = new Map<string, SpriteTexture>()

function makeTexture(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): SpriteTexture {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  draw(canvas.getContext('2d')!)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  const entry = { texture, aspect: w / h }
  cache.set(key, entry)
  return entry
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
const TEXT_FONT = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif'

/** 絵文字1文字を正方形のテクスチャにする */
export function emojiTexture(emoji: string): SpriteTexture {
  const size = 128
  return makeTexture(`emoji:${emoji}`, size, size, (ctx) => {
    ctx.font = `${size * 0.8}px ${EMOJI_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.05)
  })
}

/**
 * 角丸の札に文字を書いたテクスチャ（看板・名札用）。
 * 縁取りを付けて、明るい壁や床の前でも読めるようにする。
 * pixelRatio は端末の画素密度（labelPixelRatio で上限を掛けた値）。
 * 画面上の大きさは aspect とスプライトの scale で決まるため、解像度だけが変わる
 */
export function labelTexture(
  text: string,
  color = '#f1e9dc',
  bg = 'rgba(0,0,0,0.72)',
  pixelRatio = 1,
): SpriteTexture {
  const fontSize = Math.round(40 * pixelRatio)
  const font = `bold ${fontSize}px ${TEXT_FONT}`
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = font
  const w = Math.ceil(measure.measureText(text).width + fontSize)
  const h = Math.ceil(fontSize * 1.6)
  const border = Math.max(1, Math.round(fontSize * 0.04))
  return makeTexture(`label:${text}:${color}:${bg}:${fontSize}`, w, h, (ctx) => {
    ctx.beginPath()
    ctx.roundRect(border / 2, border / 2, w - border, h - border, h / 2)
    ctx.fillStyle = bg
    ctx.fill()
    // 明るい壁の前でも札の輪郭が分かるように、薄い縁を付ける
    ctx.lineWidth = border
    ctx.strokeStyle = 'rgba(255,244,214,0.55)'
    ctx.stroke()
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // 文字の縁取り（暗色）。塗りより先に描く
    ctx.lineJoin = 'round'
    ctx.lineWidth = fontSize * 0.16
    ctx.strokeStyle = '#120a08'
    ctx.strokeText(text, w / 2, h / 2 + 2 * pixelRatio)
    ctx.fillStyle = color
    ctx.fillText(text, w / 2, h / 2 + 2 * pixelRatio)
  })
}

/** 近づいた物の背後に敷く、やわらかい光のテクスチャ（強調用。物の種類に依存しない） */
export function glowTexture(): SpriteTexture {
  const size = 128
  return makeTexture('glow', size, size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,241,201,0.95)')
    g.addColorStop(0.45, 'rgba(255,226,160,0.45)')
    g.addColorStop(1, 'rgba(255,226,160,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  })
}
