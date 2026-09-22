import type { Tier } from './tiers'

/**
 * 管理后台的领域规则。
 *
 * 抽成纯函数是为了能被直接测 —— 和 `server/middleware.ts` 的
 * `enforceCapability` 是同一个理由：handler 要跑得先有数据库和 server function
 * 上下文，而这里就是规则的全部逻辑。
 *
 * 「管理员不能删管理员」这条**永远不会有正向流程**可以顺手覆盖到 ——
 * 界面上永远点不到另一个管理员的删除按钮。只有单测能钉住它。
 */

/** 被管理的那个人。判定只需要 id 和等级。 */
export interface Manageable {
  id: string
  tier: Tier
}

/**
 * 断言这个训练家可以被删除。不能删就抛。
 *
 * ⚠️ **任何管理员都不可删。** 这与 `docs/adr/0002` 同源：「谁能成为管理员」
 * 只有 seed 一条路径，界面既然造不出管理员，也不该能销毁它 ——
 * 否则一次误操作之后，唯一的恢复手段是重置数据库。
 *
 * 注意这里**没有独立的「不能删自己」分支**，因为能进管理页的只有管理员
 * （`user.manage` 要求 admin），而管理员一律不可删 —— 自己必然被覆盖。
 * 单独写一条会是永远走不到的代码。（这条依赖是显式的：`user.manage`
 * 一旦放宽给非管理员，「自己不能删自己」就要重新考虑。）
 *
 * 访客不在此列：访客没有数据库行，不会是删除目标。
 */
export function assertDeletable(target: Manageable): void {
  if (target.tier === 'admin') {
    throw new Error('FORBIDDEN:user.manage:admin-undeletable')
  }
}
