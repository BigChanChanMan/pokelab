/**
 * 卡片倾斜的数学 —— 纯函数，不碰 DOM。
 *
 * 只借用 `simeydotme/pokemon-cards-css` 的**技法**（指针坐标写进 CSS 自定义属性 +
 * `perspective`），不引它的代码：那个仓库是 GPL-3.0、要 vendored 约 4.5 MB 纹理，
 * 而且它的 CSS 单独放着只是一张**静态**卡 —— 指针与 spring 逻辑在 Svelte 里。
 * 见 issue #25。
 *
 * 坐标约定：指针在卡片正中时两轴都是 0，左上角是 (-1, -1)。
 */

/** 指针在卡片内归一化后的位置，两轴都在 -1..1。 */
export interface TiltPoint {
  x: number
  y: number
}

/** 一次倾斜的全部输出。角度单位是度，位移单位是像素。 */
export interface TiltState {
  /** 绕 X 轴（上下俯仰），由指针的纵向位置驱动 */
  rotateX: number
  /** 绕 Y 轴（左右旋转），由指针的横向位置驱动 */
  rotateY: number
  /** 高光位置，百分比 0..100 */
  glareX: number
  glareY: number
  /** 相对基准阴影的**追加**位移 */
  shadowX: number
  shadowY: number
}

export interface TiltRect {
  left: number
  top: number
  width: number
  height: number
}

/** 卡片四角的最大倾角。再大就露馅 —— 这是个装饰，不是 3D 引擎。 */
export const MAX_TILT_DEG = 12

/** 阴影相对基准偏移的最大追加位移。基准是 4px（neobrutalism 的 --shadow-md）。 */
export const MAX_SHADOW_SHIFT = 10

/** 卡背的倾斜弱一档：它是「这里可以点」的暗示，不是欣赏对象。 */
export const BACK_TILT_SCALE = 0.55

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** 保留两位小数，免得往 CSS 里塞一长串浮点尾巴。顺手把 -0 收成 0（否则会写成 `-0px`）。 */
const r2 = (n: number) => {
  const v = Math.round(n * 100) / 100
  return v === 0 ? 0 : v
}

/**
 * 指针的视口坐标 → 卡片内的归一化位置。
 *
 * 超出卡片的部分**钳制**在边上，不外推：指针滑出去时角度应该停在最大值，
 * 而不是继续增大到卡片翻过去。
 */
export function pointerToUnit(
  rect: TiltRect,
  clientX: number,
  clientY: number,
): TiltPoint {
  // 退化矩形（还没布局、display:none）会算出 NaN / Infinity，直接当平放。
  if (!(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0 }
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
    y: clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
  }
}

/**
 * 归一化位置 → 旋转、高光、阴影位移。
 *
 * 旋转：指针在上方时卡片上沿后仰（`rotateX` 为正），在右侧时右沿后仰。
 * 阴影：与指针**反向**位移 —— 指针往左上，阴影往右下，卡片像被抬起来。
 *       这是厚度感的来源，也是 neobrutalism 偏移阴影本来就有的语汇。
 */
export function tiltState(point: TiltPoint, maxDeg = MAX_TILT_DEG): TiltState {
  const x = clamp(point.x, -1, 1)
  const y = clamp(point.y, -1, 1)
  // 弱一档的倾斜同时得到弱一档的阴影位移，否则卡背会像浮在半空。
  const shift = (maxDeg / MAX_TILT_DEG) * MAX_SHADOW_SHIFT
  return {
    rotateX: r2(-y * maxDeg),
    rotateY: r2(x * maxDeg),
    glareX: r2((x + 1) * 50),
    glareY: r2((y + 1) * 50),
    shadowX: r2(-x * shift),
    shadowY: r2(-y * shift),
  }
}

/** 平放。指针离开、或当前不该倾斜时用。 */
export function flatState(): TiltState {
  return tiltState({ x: 0, y: 0 })
}

/**
 * 转成 CSS 自定义属性，直接铺到 style 上。
 *
 * `activation` 是指针的**活动**程度：进入后缓动到 1、离开后缓动回 0。旋转、
 * 阴影位移、表面反光强度全部乘上它 —— 于是指针离开时卡片是**转回**平放而不是
 * 瞬移，反光也随倾斜一起淡出，不需要额外的显隐逻辑。缓动走 CSS transition
 * （见 `TiltCard`），不用 rAF 循环。
 *
 * 高光的**位置**不乘 activation：透明度已经是 0 了，位置没有意义。
 */
export function tiltVars(state: TiltState, activation = 1): Record<string, string> {
  const a = clamp(activation, 0, 1)
  return {
    '--tilt-rotate-x': `${r2(state.rotateX * a)}deg`,
    '--tilt-rotate-y': `${r2(state.rotateY * a)}deg`,
    '--tilt-glare-x': `${state.glareX}%`,
    '--tilt-glare-y': `${state.glareY}%`,
    '--tilt-shadow-x': `${r2(state.shadowX * a)}px`,
    '--tilt-shadow-y': `${r2(state.shadowY * a)}px`,
    '--tilt-glare-opacity': String(r2(a)),
  }
}
