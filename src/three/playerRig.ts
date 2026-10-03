import { moveWithCollision, type Box, type Vec2 } from '../game/world'

const MAX_PITCH = 0.7

/** 一人称視点のプレイヤーの位置と向き。毎フレーム書き換えるため React の state には載せない */
export class PlayerRig {
  pos: Vec2
  /** 0 で北（-z）を向く。左回りが + */
  yaw: number
  pitch = 0

  constructor(start: { pos: Vec2; yaw: number }) {
    this.pos = start.pos
    this.yaw = start.yaw
  }

  placeAt(start: { pos: Vec2; yaw: number }) {
    this.pos = start.pos
    this.yaw = start.yaw
    this.pitch = 0
  }

  /** 画面のドラッグ量（ラジアン換算済み）で見回す */
  look(dYaw: number, dPitch: number) {
    this.yaw += dYaw
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch + dPitch))
  }

  /** 前後・左右の入力（-1〜1）で歩く。動いたら true */
  walk(forward: number, strafe: number, distance: number, colliders: Box[]): boolean {
    const len = Math.hypot(forward, strafe)
    if (len < 0.05) return false
    const scale = (Math.min(len, 1) / len) * distance
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    // yaw = 0 で -z（北）が前、+x（東）が右
    const delta = {
      x: (-sin * forward + cos * strafe) * scale,
      z: (-cos * forward - sin * strafe) * scale,
    }
    this.pos = moveWithCollision(this.pos, delta, colliders)
    return true
  }

  distanceTo(p: Vec2): number {
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z)
  }
}
