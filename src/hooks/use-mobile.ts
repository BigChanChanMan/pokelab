import { useEffect, useState } from 'react'

const BREAKPOINT = 768

/**
 * sidebar.tsx 硬依赖这个模块，但它不在 registryDependencies 里，
 * neobrutalism registry 也没有对应 item（r/base/use-mobile.json 实测 404）。
 *
 * 初始值必须是 false：SSR 阶段没有 window，返回「桌面」再由 effect 纠正，
 * 否则 hydration 会对不上。
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
