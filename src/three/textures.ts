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

/** 角丸の札に文字を書いたテクスチャ（看板・名札用） */
export function labelTexture(
  text: string,
  color = '#f1e9dc',
  bg = 'rgba(0,0,0,0.6)',
): SpriteTexture {
  const fontSize = 40
  const font = `bold ${fontSize}px ${TEXT_FONT}`
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = font
  const w = Math.ceil(measure.measureText(text).width + fontSize)
  const h = Math.ceil(fontSize * 1.6)
  return makeTexture(`label:${text}:${color}:${bg}`, w, h, (ctx) => {
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, h / 2)
    ctx.fill()
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, h / 2 + 2)
  })
}
