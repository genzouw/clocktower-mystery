import type { PortalPlaces, Scenario } from '../../types'

/**
 * 3D 空間での部屋の配置（グリッド座標）。北は -z。
 * 東西南北の出口は隣接セルとつながる扉になり、階段（up / down）は離れた場所への転移扉になる。
 * 2階・地下・ドームは 1階と離して置き、壁越しに見えないようにする。
 */
export const LAYOUT: Scenario['layout'] = {
  archive: { gx: 0, gz: 1 },
  lounge: { gx: 1, gz: 1 },
  dining: { gx: 2, gz: 1 },
  darkroom: { gx: 0, gz: 2 },
  corridor: { gx: 1, gz: 2 },
  kitchen: { gx: 2, gz: 2 },
  entrance: { gx: 1, gz: 3 },
  study: { gx: 5, gz: 1 },
  guest: { gx: 6, gz: 1 },
  dome: { gx: 9, gz: 1 },
  storage: { gx: 5, gz: 3 },
}

/** 雪と星の題材に合わせた、青みの寒色を基調にする配色 */
export const THEME: Scenario['theme'] = {
  entrance: { wall: '#3b4f6b', floor: '#2a2f3a' },
  corridor: { wall: '#34425e', floor: '#3a3340' },
  lounge: { wall: '#4a4a6e', floor: '#4a3326' },
  archive: { wall: '#2f3f5a', floor: '#2b2a33' },
  darkroom: { wall: '#3a2a3a', floor: '#1e1a24' },
  dining: { wall: '#3d5470', floor: '#3a2f2a' },
  kitchen: { wall: '#5a6a78', floor: '#555b63' },
  study: { wall: '#2c4560', floor: '#3d3228' },
  guest: { wall: '#46587a', floor: '#34303a' },
  storage: { wall: '#2e3640', floor: '#2f2f33' },
  dome: { wall: '#1c2a4a', floor: '#2a3550' },
}

/** 階段の転移扉を、部屋のどの壁のどの位置に置くか */
export const PORTAL_PLACES: PortalPlaces = {
  corridor: { up: { side: 'north', offset: 2.6 }, down: { side: 'north', offset: -2.6 } },
  study: { down: { side: 'south', offset: 0 } },
  guest: { up: { side: 'east', offset: 0 } },
  dome: { down: { side: 'south', offset: 0 } },
  storage: { up: { side: 'south', offset: 0 } },
}
