import { describe, expect, it } from 'vitest'

import type { Tier } from './tiers'
import { assertDeletable } from './admin'

const target = (tier: Tier) => ({ id: `t-${tier}`, tier })

/**
 * 删除训练家的规则。
 *
 * 这条「管理员不可删」的断言是 issue #26 的核心验收标准 ——
 * 界面上永远点不到另一个管理员的删除按钮，所以它**没有正向流程**可以
 * 顺手覆盖，只能在这里钉住。
 */
describe('assertDeletable() —— 管理员不可删除', () => {
  it('管理员 → 抛 FORBIDDEN', () => {
    expect(() => assertDeletable(target('admin'))).toThrow(
      'FORBIDDEN:user.manage:admin-undeletable',
    )
  })

  it('注册训练家与 VIP 都可以删', () => {
    // 这两档是「能成为删除目标」的全部 —— 访客没有数据库行。
    for (const tier of ['registered', 'vip'] as const) {
      expect(() => assertDeletable(target(tier))).not.toThrow()
    }
  })
})
