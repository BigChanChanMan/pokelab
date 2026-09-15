import { createMiddleware } from '@tanstack/react-start'

import { can, type Capability } from '@/lib/capabilities'
import { getTrainer } from './trainer'

/**
 * 铁律：**UI 里隐藏一个按钮，不是访问控制。**
 *
 * 侧边栏藏起来的 VIP 菜单项，只要服务端函数没有拦截，任何人用 devtools
 * 或直接构造请求都能调用。前端做的所有权限判断都是 UX，不是安全。
 *
 * 所以每个能力必须同时在两处判定：
 *   1. UI 处 —— 决定「看不看得见」
 *   2. 这里 —— 决定「能不能执行」
 *
 * 第 2 处是必须的，第 1 处是可选的。
 */

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const trainer = await getTrainer()
    return next({ context: { trainer } })
  },
)

/**
 * 和 UI 调用的是同一个 `can()` —— 所以它们不可能不一致。
 * 这就是能力模型最大的价值。
 */
export const requireCapability = (cap: Capability) =>
  createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
      const verdict = can(context.trainer, cap)
      if (!verdict.allowed) {
        throw new Error(`FORBIDDEN:${cap}:${verdict.reason}`)
      }
      return next({ context: { ...context, verdict } })
    })
