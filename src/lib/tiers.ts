/**
 * 等级（Tier）—— 训练家的权限层级。
 *
 * 只有三档。第 4 档在没有真实需求前是纯负担；在能力模型下加一档约为 5 行代码，
 * 所以不需要现在预留。
 */

export type Tier = 'guest' | 'registered' | 'vip'

/**
 * 用有序的 rank 而不是字符串相等判断。
 * 这样「VIP 能不能用注册用户的东西」这类问题变成一次数字比较，
 * 而不是一张需要人工维护的真值表。
 */
export const TIER_RANK: Record<Tier, number> = {
  guest: 0,
  registered: 1,
  vip: 2,
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
 */
export const GUEST: Trainer = { id: null, handle: '访客', tier: 'guest' }

export const TIER_LABEL: Record<Tier, string> = {
  guest: '访客',
  registered: '注册训练家',
  vip: 'VIP',
}

export function isTier(value: unknown): value is Tier {
  return value === 'guest' || value === 'registered' || value === 'vip'
}
