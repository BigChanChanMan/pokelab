import { createMiddleware } from '@tanstack/react-start'

import { can, type Capability } from '@/lib/capabilities'
import type { Trainer } from '@/lib/tiers'
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

/**
 * 强制判定本身。
 *
 * 单独抽出来是为了能被测试直接调用 —— 中间件要跑得先有 server function
 * 上下文，而这个函数就是中间件 `.server()` 里的**全部**逻辑。
 * 测它就等于测中间件，但不需要起一个请求。
 */
export function enforceCapability(trainer: Trainer, cap: Capability): void {
  const verdict = can(trainer, cap)
  if (!verdict.allowed) {
    throw new Error(`FORBIDDEN:${cap}:${verdict.reason}`)
  }
}

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
      enforceCapability(context.trainer, cap)
      return next({ context: { ...context, verdict: can(context.trainer, cap) } })
    })
