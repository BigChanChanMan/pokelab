import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'

import { db } from '@/db/client'
import { trainers } from '@/db/schema'
import * as settings from '@/db/settings'
import { ASSIGNABLE_TIERS, type Tier, type Trainer } from '@/lib/tiers'
import { requireCapability } from './middleware'

/**
 * 管理后台的服务端函数。**这里是真正的防线。**
 *
 * 除了 requireCapability，还有两条规则**必须在服务端单独强制**，
 * 因为界面上的禁用不是访问控制（CLAUDE.md 硬约束 2）：
 *   1. 不能把任何人设成管理员 —— 「谁能成为管理员」只有 seed 一条路径
 *   2. 不能改自己那一行 —— 免得一次误操作把自己锁在系统外面
 */

export interface TrainerSummary {
  id: string
  handle: string
  tier: Tier
  createdAt: Date
}

export const listTrainers = createServerFn({ method: 'GET' })
  .middleware([requireCapability('user.manage')])
  .handler(async (): Promise<TrainerSummary[]> => {
    return db
      .select({
        id: trainers.id,
        handle: trainers.handle,
        tier: trainers.tier,
        createdAt: trainers.createdAt,
      })
      .from(trainers)
      .orderBy(trainers.createdAt)
      .all()
  })

export const setTrainerTier = createServerFn({ method: 'POST' })
  .middleware([requireCapability('user.manage')])
  .validator((input: { trainerId: string; tier: Tier }) => input)
  .handler(async ({ context, data }): Promise<TrainerSummary> => {
    // ★ 服务端拒绝「升为管理员」。UI 里少一个选项不算访问控制。
    if (!ASSIGNABLE_TIERS.includes(data.tier)) {
      throw new Error('FORBIDDEN:user.manage:tier-not-assignable')
    }

    // ★ 服务端拒绝改自己。自己那一行的控件在 UI 里也是禁用的，两处都有。
    if (data.trainerId === context.trainer.id) {
      throw new Error('FORBIDDEN:user.manage:self')
    }

    const row = db
      .update(trainers)
      .set({ tier: data.tier })
      .where(eq(trainers.id, data.trainerId))
      .returning()
      .get()

    if (!row) throw new Error(`TRAINER_NOT_FOUND:${data.trainerId}`)

    return {
      id: row.id,
      handle: row.handle,
      tier: row.tier,
      createdAt: row.createdAt,
    }
  })

export const readUpgradeCode = createServerFn({ method: 'GET' })
  .middleware([requireCapability('code.manage')])
  .handler(async (): Promise<string | null> => {
    return settings.getUpgradeCode()
  })

export const writeUpgradeCode = createServerFn({ method: 'POST' })
  .middleware([requireCapability('code.manage')])
  .validator((code: string) => code)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const code = data.trim()
    if (!code) throw new Error('CODE_EMPTY')
    settings.setUpgradeCode(code)
    return { ok: true }
  })

/** 管理员的等级自己不能被改 —— UI 用它禁用自己那一行的控件。 */
export const isSelf = (viewer: Trainer, id: string) => viewer.id === id
