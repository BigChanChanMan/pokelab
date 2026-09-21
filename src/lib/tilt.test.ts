import { describe, expect, it } from 'vitest'

import {
  BACK_TILT_SCALE,
  MAX_SHADOW_SHIFT,
  MAX_TILT_DEG,
  flatState,
  pointerToUnit,
  tiltState,
  tiltVars,
} from './tilt'

/** 200×100 的卡片，左上角在 (0, 0)。 */
const RECT = { left: 0, top: 0, width: 200, height: 100 }

describe('pointerToUnit', () => {
  it('正中是原点', () => {
    expect(pointerToUnit(RECT, 100, 50)).toEqual({ x: 0, y: 0 })
  })

  it('四角是 (±1, ±1)', () => {
    expect(pointerToUnit(RECT, 0, 0)).toEqual({ x: -1, y: -1 })
    expect(pointerToUnit(RECT, 200, 100)).toEqual({ x: 1, y: 1 })
  })

  it('指针在卡片外时钳制在边上，不外推', () => {
    // 往外 50px：若外推会得到 -1.5 / 2，钳制后仍是 ±1
    expect(pointerToUnit(RECT, -50, 50).x).toBe(-1)
    expect(pointerToUnit(RECT, 300, 50).x).toBe(1)
    expect(pointerToUnit(RECT, 100, -999).y).toBe(-1)
    expect(pointerToUnit(RECT, 100, 999).y).toBe(1)
  })

  it('带偏移的矩形按自身坐标系算', () => {
    const offset = { left: 100, top: 40, width: 200, height: 100 }
    expect(pointerToUnit(offset, 200, 90)).toEqual({ x: 0, y: 0 })
  })

  it('退化的零尺寸矩形不产生 NaN', () => {
    // 还没布局 / display:none 时 getBoundingClientRect 全零
    for (const rect of [
      { left: 0, top: 0, width: 0, height: 0 },
      { left: 0, top: 0, width: 0, height: 100 },
      { left: 0, top: 0, width: 200, height: 0 },
    ]) {
      const p = pointerToUnit(rect, 10, 10)
      expect(p).toEqual({ x: 0, y: 0 })
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
    }
  })
})

describe('tiltState', () => {
  it('指针在中心时卡片平放、阴影归零、高光在正中', () => {
    expect(tiltState({ x: 0, y: 0 })).toEqual({
      rotateX: 0,
      rotateY: 0,
      glareX: 50,
      glareY: 50,
      shadowX: 0,
      shadowY: 0,
    })
  })

  it('指针在上方时上沿后仰，在右侧时右沿后仰', () => {
    // 上方 → y = -1
    expect(tiltState({ x: 0, y: -1 }).rotateX).toBe(MAX_TILT_DEG)
    expect(tiltState({ x: 0, y: 1 }).rotateX).toBe(-MAX_TILT_DEG)
    expect(tiltState({ x: 1, y: 0 }).rotateY).toBe(MAX_TILT_DEG)
    expect(tiltState({ x: -1, y: 0 }).rotateY).toBe(-MAX_TILT_DEG)
  })

  it('阴影与指针反向位移 —— 这是厚度感的来源', () => {
    const tl = tiltState({ x: -1, y: -1 })
    expect(tl.shadowX).toBe(MAX_SHADOW_SHIFT)
    expect(tl.shadowY).toBe(MAX_SHADOW_SHIFT)

    const br = tiltState({ x: 1, y: 1 })
    expect(br.shadowX).toBe(-MAX_SHADOW_SHIFT)
    expect(br.shadowY).toBe(-MAX_SHADOW_SHIFT)
  })

  it('高光跟着指针走，四角是 0% / 100%', () => {
    expect(tiltState({ x: -1, y: -1 })).toMatchObject({ glareX: 0, glareY: 0 })
    expect(tiltState({ x: 1, y: 1 })).toMatchObject({ glareX: 100, glareY: 100 })
  })

  it('角度不超过上限，哪怕传进来的点已经越界', () => {
    const wild = tiltState({ x: 5, y: -5 })
    expect(Math.abs(wild.rotateX)).toBeLessThanOrEqual(MAX_TILT_DEG)
    expect(Math.abs(wild.rotateY)).toBeLessThanOrEqual(MAX_TILT_DEG)
    expect(wild.glareX).toBeGreaterThanOrEqual(0)
    expect(wild.glareX).toBeLessThanOrEqual(100)
  })

  it('弱一档的倾斜同时得到弱一档的阴影位移', () => {
    const back = tiltState({ x: 1, y: 0 }, MAX_TILT_DEG * BACK_TILT_SCALE)
    expect(back.rotateY).toBeLessThan(MAX_TILT_DEG)
    expect(Math.abs(back.shadowX)).toBeLessThan(MAX_SHADOW_SHIFT)
    // 阴影按同一比例缩放，否则卡背会像浮在半空
    expect(Math.abs(back.shadowX)).toBeCloseTo(
      MAX_SHADOW_SHIFT * BACK_TILT_SCALE,
      2,
    )
  })
})

describe('flatState', () => {
  it('就是中心点，且与指针无关', () => {
    expect(flatState()).toEqual(tiltState({ x: 0, y: 0 }))
  })
})

describe('tiltVars', () => {
  it('铺成 CSS 自定义属性', () => {
    expect(tiltVars(tiltState({ x: 1, y: -1 }))).toEqual({
      '--tilt-rotate-x': `${MAX_TILT_DEG}deg`,
      '--tilt-rotate-y': `${MAX_TILT_DEG}deg`,
      '--tilt-glare-x': '100%',
      '--tilt-glare-y': '0%',
      '--tilt-shadow-x': `${-MAX_SHADOW_SHIFT}px`,
      '--tilt-shadow-y': `${MAX_SHADOW_SHIFT}px`,
      '--tilt-glare-opacity': '1',
    })
  })

  it('activation = 0 时一切归零 —— 这就是指针离开后的终态', () => {
    const vars = tiltVars(tiltState({ x: 1, y: -1 }), 0)
    expect(vars['--tilt-rotate-x']).toBe('0deg')
    expect(vars['--tilt-rotate-y']).toBe('0deg')
    expect(vars['--tilt-shadow-x']).toBe('0px')
    expect(vars['--tilt-shadow-y']).toBe('0px')
    expect(vars['--tilt-glare-opacity']).toBe('0')
  })

  it('activation 减半时旋转与阴影位移都减半，但高光位置不动', () => {
    const vars = tiltVars(tiltState({ x: 1, y: 0 }), 0.5)
    expect(vars['--tilt-rotate-y']).toBe(`${MAX_TILT_DEG / 2}deg`)
    expect(vars['--tilt-shadow-x']).toBe(`${-MAX_SHADOW_SHIFT / 2}px`)
    expect(vars['--tilt-glare-x']).toBe('100%') // 位置不参与缩放
  })

  it('平放时阴影位移是 0px —— 不倾斜的调用点因此看不出差别', () => {
    const vars = tiltVars(flatState())
    expect(vars['--tilt-shadow-x']).toBe('0px')
    expect(vars['--tilt-shadow-y']).toBe('0px')
  })

  it('越界的 activation 被钳制，不产生负的或超过 1 的透明度', () => {
    expect(tiltVars(flatState(), -3)['--tilt-glare-opacity']).toBe('0')
    expect(tiltVars(flatState(), 99)['--tilt-glare-opacity']).toBe('1')
  })
})
