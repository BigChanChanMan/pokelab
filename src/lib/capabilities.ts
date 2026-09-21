import { TIER_RANK, type Tier, type Trainer } from './tiers'

/**
 * 本项目的核心：能力模型。
 *
 * 等级是**人的属性**，能力是**动作的属性**，两者通过这张表连接。
 *
 * 为什么不用 `isVip: boolean`：
 *   1. 加第三档就崩 —— 三态塌成布尔会退化成两个布尔值，四种组合里有一种非法，
 *      类型系统抓不住
 *   2. 能力和等级被焊死 —— `if (isVip)` 会散落在几十个组件里，无法统一审计
 *   3. 无法 grep —— 想知道哪些功能是 VIP 专属，只能人肉判断每一处的语义
 */
export interface CapabilitySpec {
  /** 能用这个能力的最低等级 */
  minTier: Tier
  /** 带数量的能力。缺省表示不限量。 */
  quota?: Partial<Record<Tier, number>>
}

export const CAPABILITIES = {
  'dex.browse': { minTier: 'guest' },
  'matchup.view': { minTier: 'guest' },
  'team.create': {
    minTier: 'registered',
    quota: { registered: 3, vip: Infinity },
  },
  'battle.record': {
    minTier: 'registered',
    quota: { registered: 30, vip: Infinity },
  },
  'team.diagnose': { minTier: 'vip' },
  'meta.report': { minTier: 'vip' },
  'export.share': { minTier: 'vip' },
  /**
   * 每日一抽拆成两个能力，是为了让**降级不封数据**（DESIGN.md §6.4）。
   *
   * 抽卡册里的东西是训练家的资产 —— 他抽到过的卡。降级之后如果连册子都打不开，
   * 那就是「降级删数据」的软版本。所以抽卡要 VIP，看自己的册子只要注册。
   *
   * 这也让锁定的「今日卡包」后面还有半扇开着的门，而不是一堵墙。
   */
  'gacha.draw': { minTier: 'vip' },
  'gacha.album': { minTier: 'registered' },
  // 分成两个而不是一个，是为了让「升级码管理」将来能单独授予（比如客服）。
  'user.manage': { minTier: 'admin' },
  'code.manage': { minTier: 'admin' },
} as const satisfies Record<string, CapabilitySpec>

export type Capability = keyof typeof CAPABILITIES

export type Verdict =
  | { allowed: true }
  | { allowed: false; reason: 'tier'; need: Tier }
  | { allowed: false; reason: 'quota'; limit: number; used: number }

/**
 * 全项目唯一的权限判定入口。
 *
 * UI 用它、服务端用它、测试也用它 —— 所以它们不可能不一致。
 * 任何地方出现第二个权限判断，都是 bug。
 */
export function can(
  trainer: Trainer,
  cap: Capability,
  usage?: { used: number },
): Verdict {
  const spec: CapabilitySpec = CAPABILITIES[cap]

  if (TIER_RANK[trainer.tier] < TIER_RANK[spec.minTier]) {
    return { allowed: false, reason: 'tier', need: spec.minTier }
  }

  const limit = spec.quota?.[trainer.tier]
  if (limit !== undefined && usage && usage.used >= limit) {
    return { allowed: false, reason: 'quota', limit, used: usage.used }
  }

  return { allowed: true }
}

/** 给 UI 用的简写：只看等级，不看配额。 */
export function allowed(trainer: Trainer, cap: Capability): boolean {
  return can(trainer, cap).allowed
}
