import { count, eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'

import { db } from '@/db/client'
import { gachaDraws, trainers } from '@/db/schema'
import * as settings from '@/db/settings'
import { assertDeletable } from '@/lib/admin'
import { ASSIGNABLE_TIERS, type Tier, type Trainer } from '@/lib/tiers'
import { requireCapability } from './middleware'

/**
 * 管理后台的服务端函数。**这里是真正的防线。**
 *
 * 除了 requireCapability，还有两条规则**必须在服务端单独强制**，
 * 因为界面上的禁用不是访问控制（CLAUDE.md 硬约束 2）：
 *   1. 不能把任何人设成管理员 —— 「谁能成为管理员」只有 seed 一条路径
 *   2. 不能改自己那一行 —— 免得一次误操作把自己锁在系统外面
 *
 * 删除那条规则（管理员不可删）抽在 `lib/admin.ts`，那里能被单测直接覆盖。
 */

export interface TrainerSummary {
  id: string
  handle: string
  tier: Tier
  createdAt: Date
  /** 抽卡记录数。删除确认框用它说明「会连带毁掉什么」。 */
  gachaDraws: number
}

/** 一行训练家的全部展示字段。`listTrainers` 与 `setTrainerTier` 共用。 */
const summaryColumns = {
  id: trainers.id,
  handle: trainers.handle,
  tier: trainers.tier,
  createdAt: trainers.createdAt,
}

/** 一个训练家的抽卡记录数。删除确认框靠它说清「会连带毁掉什么」。 */
function countDraws(trainerId: string): number {
  return (
    db
      .select({ n: count(gachaDraws.trainerId) })
      .from(gachaDraws)
      .where(eq(gachaDraws.trainerId, trainerId))
      .get()?.n ?? 0
  )
}

export const listTrainers = createServerFn({ method: 'GET' })
  .middleware([requireCapability('user.manage')])
  .handler(async (): Promise<TrainerSummary[]> => {
    // `leftJoin` + `groupBy` 而不是对每一行再查一次 —— 列表要显示条数，
    // 没有理由为它写一个 N+1。
    return db
      .select({ ...summaryColumns, gachaDraws: count(gachaDraws.trainerId) })
      .from(trainers)
      .leftJoin(gachaDraws, eq(gachaDraws.trainerId, trainers.id))
      .groupBy(trainers.id)
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

    // 改等级不影响抽卡记录，但返回类型是 TrainerSummary —— 少一个字段
    // 前端那一行状态就退化成 undefined。
    const draws = countDraws(row.id)

    return {
      id: row.id,
      handle: row.handle,
      tier: row.tier,
      createdAt: row.createdAt,
      gachaDraws: draws,
    }
  })

/**
 * 删除训练家。**永久、不可逆。**
 *
 * 两条规则都在服务端强制，界面上禁用删除按钮不是访问控制：
 *   - 管理员一律不可删（`assertDeletable`，与 `docs/adr/0002` 同源）
 *   - 能进到这里的已经是管理员（`user.manage`），所以「不能删自己」被上一条覆盖
 *
 * 抽卡记录靠 schema 的 `onDelete: 'cascade'` 连带删除，不在这里手写 ——
 * 领域规则落在 schema 上比落在应用层可靠。实测 `PRAGMA foreign_keys` 是开的。
 *
 * 返回被删掉的抽卡记录数，让调用方能核对确认框里报的数字。
 */
export const deleteTrainer = createServerFn({ method: 'POST' })
  .middleware([requireCapability('user.manage')])
  .validator((trainerId: string) => trainerId)
  .handler(async ({ data: trainerId }): Promise<{ draws: number }> => {
    const target = db
      .select({ id: trainers.id, tier: trainers.tier })
      .from(trainers)
      .where(eq(trainers.id, trainerId))
      .get()

    if (!target) throw new Error(`TRAINER_NOT_FOUND:${trainerId}`)
    assertDeletable(target)

    // 先数再删 —— 删完就查不到了。cascade 随后把这几行带走。
    const draws = countDraws(trainerId)

    db.delete(trainers).where(eq(trainers.id, trainerId)).run()

    return { draws }
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
