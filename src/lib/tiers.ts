/**
 * 等级（Tier）—— 训练家的权限层级。
 *
 * 只有四档。加一档在能力模型下约为 5 行代码，所以不需要预留 ——
 * 但「约 5 行」低估了真实成本：任何硬编码的等级序号都会跟着崩。
 * 见 docs/adr/0002-admin-as-fourth-tier.md
 */

export type Tier = 'guest' | 'registered' | 'vip' | 'admin'

/**
 * 用有序的 rank 而不是字符串相等判断。
 * 这样「VIP 能不能用注册用户的东西」这类问题变成一次数字比较，
 * 而不是一张需要人工维护的真值表。
 */
export const TIER_RANK: Record<Tier, number> = {
  guest: 0,
  registered: 1,
  vip: 2,
  admin: 3,
}

export interface Trainer {
  id: string | null
  handle: string
  tier: Tier
}

/**
 * 访客是一个**具名常量**，不是 null。
 *
 * 这个区别决定了后面所有代码：不需要到处写 `if (!user)`，
 * 只需要问 `can(trainer, cap)`。
 *
 * ⚠️ 访客专指**未登录**。它不是一个可以被设置成的等级 ——
 * 「有没有会话」和「什么等级」是两件事。管理员最低只能把人设到 registered。
 */
export const GUEST: Trainer = { id: null, handle: '访客', tier: 'guest' }

export const TIER_LABEL: Record<Tier, string> = {
  guest: '访客',
  registered: '注册训练家',
  vip: 'VIP',
  admin: '管理员',
}

/**
 * 管理员**可以**把人设到的等级。不含 guest（那是「未登录」），
 * 不含 admin（「谁能成为管理员」只能由 seed 决定，界面不可授予）。
 *
 * 这是 UI 的选项来源，不是访问控制 —— 服务端还有一条同样的拒绝。
 */
export const ASSIGNABLE_TIERS: readonly Tier[] = ['registered', 'vip']

export function isTier(value: unknown): value is Tier {
  return (
    value === 'guest' ||
    value === 'registered' ||
    value === 'vip' ||
    value === 'admin'
  )
}
