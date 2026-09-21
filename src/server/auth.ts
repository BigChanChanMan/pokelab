import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'

import { db } from '@/db/client'
import { trainers } from '@/db/schema'
import { getUpgradeCode } from '@/db/settings'
import { normalizeHandle, handleError, passwordError } from '@/lib/credentials'
import { ERR } from '@/lib/errors'
import type { Trainer } from '@/lib/tiers'
import { hashPassword, verifyPassword } from './password'
import { clearSession, issueSession } from './cookies'
import { getTrainer } from './trainer'

/**
 * 认证的服务端函数。
 *
 * 注意这里**没有** requireCapability —— 注册和登录天然是公开的，
 * 它们建立身份，不是消费身份。改密码和兑换升级码则要求已登录，
 * 各自在 handler 里断言。
 */

const toTrainer = (row: {
  id: string
  handle: string
  tier: Trainer['tier']
}): Trainer => ({ id: row.id, handle: row.handle, tier: row.tier })

/** 取当前训练家，断言它是真实账号（访客没有 id）。 */
function requireIdentity(trainer: Trainer): string {
  if (!trainer.id) throw new Error('FORBIDDEN:no-identity')
  return trainer.id
}

export const register = createServerFn({ method: 'POST' })
  .validator((input: { handle: string; password: string }) => input)
  .handler(async ({ data }): Promise<Trainer> => {
    const handle = normalizeHandle(data.handle)

    // 和前端表单用的是同一个函数，所以提示不可能不一致
    if (handleError(handle)) throw new Error(ERR.NAME_INVALID)
    if (passwordError(data.password)) throw new Error(ERR.WEAK_PASSWORD)

    const existing = db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.handle, handle))
      .get()
    if (existing) throw new Error(ERR.NAME_TAKEN)

    const row = {
      id: crypto.randomUUID(),
      handle,
      passwordHash: await hashPassword(data.password),
      passwordVersion: 1,
      tier: 'registered' as const,
      createdAt: new Date(),
    }
    db.insert(trainers).values(row).run()

    issueSession(row.id, row.passwordVersion)
    return toTrainer(row)
  })

export const login = createServerFn({ method: 'POST' })
  .validator((input: { handle: string; password: string }) => input)
  .handler(async ({ data }): Promise<Trainer> => {
    const row = db
      .select()
      .from(trainers)
      .where(eq(trainers.handle, normalizeHandle(data.handle)))
      .get()

    // ★ 统一错误：不存在和密码错给同一个码，不泄露哪些训练家名存在
    if (!row) throw new Error(ERR.BAD_CREDENTIALS)
    if (!(await verifyPassword(data.password, row.passwordHash))) {
      throw new Error(ERR.BAD_CREDENTIALS)
    }

    issueSession(row.id, row.passwordVersion)
    return toTrainer(row)
  })

export const logout = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: true }> => {
    // 服务端真的删 cookie，不只是前端跳走
    clearSession()
    return { ok: true }
  },
)

export const changePassword = createServerFn({ method: 'POST' })
  .validator((input: { current: string; next: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const trainer = await getTrainer()
    const id = requireIdentity(trainer)

    if (passwordError(data.next)) throw new Error(ERR.WEAK_PASSWORD)

    const row = db.select().from(trainers).where(eq(trainers.id, id)).get()
    if (!row) throw new Error('FORBIDDEN:no-identity')
    if (!(await verifyPassword(data.current, row.passwordHash))) {
      throw new Error(ERR.WRONG_PASSWORD)
    }

    const pv = row.passwordVersion + 1
    db.update(trainers)
      .set({ passwordHash: await hashPassword(data.next), passwordVersion: pv })
      .where(eq(trainers.id, id))
      .run()

    // 版本号 +1 已经让所有旧 cookie 作废；给自己重签一个，免得踢掉自己
    issueSession(id, pv)
    return { ok: true }
  })

/**
 * 凭升级码自助升到 VIP。
 *
 * 升级码是**全局单条、可复用**的（ADR 层面记在本次 spec 里）：
 * 「谁升级了」不需要它记账 —— 训练家自己的 tier 就是记录。
 * 所以它退化成一次「输入对不对」的判断。
 */
export const redeemUpgradeCode = createServerFn({ method: 'POST' })
  .validator((code: string) => code)
  .handler(async ({ data: raw }): Promise<Trainer> => {
    const trainer = await getTrainer()
    const id = requireIdentity(trainer)

    const expected = getUpgradeCode()
    // 没设置过升级码 → 不接受任何输入
    if (!expected) throw new Error(ERR.CODE_INVALID)
    if (raw.trim() !== expected) throw new Error(ERR.CODE_INVALID)

    const row = db.select().from(trainers).where(eq(trainers.id, id)).get()
    if (!row) throw new Error('FORBIDDEN:no-identity')

    // 管理员不该被升级码降级 —— 升级只往上升
    if (row.tier === 'admin') return toTrainer(row)

    db.update(trainers)
      .set({ tier: 'vip' })
      .where(eq(trainers.id, id))
      .run()

    return { id: row.id, handle: row.handle, tier: 'vip' }
  })
