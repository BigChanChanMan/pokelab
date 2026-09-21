import { useEffect, useRef, type ReactNode } from 'react'

import { MAX_TILT_DEG, flatState, pointerToUnit, tiltState, tiltVars } from '@/lib/tilt'

/**
 * 指针跟随的 3D 倾斜。包住卡片即可，被包的卡片不需要知道这件事。
 *
 * 只借用 `simeydotme/hover-tilt` 的**技法**，不引它：那是个 Svelte 5 编出来的
 * web component，49 KB gzip 里大半是内联的 Svelte 运行时，而且它在模块顶层
 * 无条件调 `customElements.define` —— 在 TanStack Start 的 SSR 下直接抛
 * `ReferenceError`。我们只要它的三件事：`perspective: 600px`、指针坐标写进
 * CSS 自定义属性、缓动回正。见 issue #25。
 *
 * 两个它没做而我们做了的事：
 *
 *   1. **`prefers-reduced-motion: reduce` 时完全不接线** —— 它源码里 0 处匹配。
 *      指针跟随对前庭敏感人群是实打实的问题，这条是 PRD §14.2 的硬性要求。
 *   2. **`hover: none` 时不接线**，且**不动 `touch-action`** —— 它给容器设了
 *      `touch-action: none`（为了防双指缩放），而那会吃掉卡背按钮的点击。
 *      触屏上我们干脆不倾斜：没有指针可跟随，陀螺仪又要弹 iOS 权限框。
 *
 * 接线走原生事件 + 直接改 style，不过 React state：指针每移动一像素就
 * setState 会让整棵子树重渲染，而这里要的只是改几个 CSS 变量。
 */
export function TiltCard({
  children,
  maxDeg = MAX_TILT_DEG,
  className,
}: {
  children: ReactNode
  /** 最大倾角。卡背传一个更小的值 —— 它是「这里可以点」的暗示，不是欣赏对象。 */
  maxDeg?: number
  className?: string
}) {
  const outer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = outer.current
    if (!el) return

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    const setVars = (state: ReturnType<typeof flatState>, activation: number) => {
      for (const [k, v] of Object.entries(tiltVars(state, activation))) {
        el.style.setProperty(k, v)
      }
    }

    let tracking = false

    const onEnter = () => {
      tracking = true
      el.dataset.tracking = 'true'
    }

    const onMove = (e: PointerEvent) => {
      if (!tracking) onEnter()
      setVars(tiltState(pointerToUnit(el.getBoundingClientRect(), e.clientX, e.clientY), maxDeg), 1)
    }

    const onLeave = () => {
      tracking = false
      el.dataset.tracking = 'false'
      // activation 归零 —— 旋转、阴影位移、反光一起缓动回去（见 styles.css 的 .tilt-card）
      setVars(flatState(), 0)
    }

    let wired = false
    /** 媒体查询可能在会话中途变化（用户改系统设置、插拔鼠标），所以跟着重接线。 */
    const sync = () => {
      const want = fine.matches && !still.matches
      if (want === wired) return
      wired = want
      if (want) {
        el.addEventListener('pointerenter', onEnter)
        el.addEventListener('pointermove', onMove)
        el.addEventListener('pointerleave', onLeave)
      } else {
        el.removeEventListener('pointerenter', onEnter)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerleave', onLeave)
        onLeave() // 退回静态，别把卡片留在歪着的状态
      }
    }

    sync()
    fine.addEventListener('change', sync)
    still.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      still.removeEventListener('change', sync)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [maxDeg])

  return (
    <div ref={outer} className={`tilt-card ${className ?? ''}`} style={{ perspective: '600px' }}>
      {/* transform 必须在**子**元素上：perspective 作用于子元素，套在自己身上无效 */}
      <div
        className="tilt-card__inner"
        style={{
          transform:
            'rotateX(var(--tilt-rotate-x, 0deg)) rotateY(var(--tilt-rotate-y, 0deg))',
        }}
      >
        {children}
      </div>
    </div>
  )
}
