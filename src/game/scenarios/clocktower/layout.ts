import type { PortalPlaces, Scenario } from '../../types'

/**
 * 3D 空間での部屋の配置（グリッド座標）。北は -z。
 * 東西南北の出口は隣接セルとつながる扉になり、階段（up / down）は離れた場所への転移扉になる。
 * 2階・地下・時計塔は 1階と離して置き、壁越しに見えないようにする。
 */
export const LAYOUT: Scenario['layout'] = {
  library: { gx: 1, gz: 1 },
  music: { gx: 2, gz: 1 },
  greenhouse: { gx: 3, gz: 1 },
  study: { gx: 0, gz: 2 },
  corridor: { gx: 1, gz: 2 },
  dining: { gx: 2, gz: 2 },
  kitchen: { gx: 3, gz: 2 },
  hall: { gx: 1, gz: 3 },
  bedroom: { gx: 6, gz: 0 },
  tower: { gx: 6, gz: 2 },
  cellar: { gx: 6, gz: 3 },
}

export const THEME: Scenario['theme'] = {
  hall: { wall: '#6b4a32', floor: '#3d2a1c' },
  corridor: { wall: '#4b3d58', floor: '#5b3a2b' },
  study: { wall: '#2f4a3c', floor: '#4a3322' },
  library: { wall: '#5a3d28', floor: '#2f241c' },
  music: { wall: '#33406e', floor: '#3b2c25' },
  greenhouse: { wall: '#3f7a52', floor: '#6b3324' },
  dining: { wall: '#6e3434', floor: '#3d2a1c' },
  kitchen: { wall: '#66604f', floor: '#5d5d5d' },
  bedroom: { wall: '#4e3a6b', floor: '#3b2a40' },
  cellar: { wall: '#3a3a3a', floor: '#3a3530' },
  tower: { wall: '#2b3e66', floor: '#4a3b2a' },
}

/** 階段の転移扉を、部屋のどの壁のどの位置に置くか */
export const PORTAL_PLACES: PortalPlaces = {
  corridor: { up: { side: 'north', offset: 2.6 }, down: { side: 'north', offset: -2.6 } },
  bedroom: { down: { side: 'south', offset: 0 } },
  cellar: { up: { side: 'south', offset: 0 } },
}
