import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

import { db } from '@/db/client'
import { trainers } from '@/db/schema'
import { GUEST, type Trainer } from '@/lib/tiers'
import { verify } from './session'

/**
 * 全项目**唯一的身份接缝**。
 *
 * 契约和签名一个字没变：返回一个 Trainer，任何异常都降级为 GUEST，绝不抛错。
 * 变的是实现内部 —— 从「读一个不验签的 JSON cookie」变成
 * 「验签 → 查库 → 比对密码版本」。
 *
 * 阶段 6 的验收标准：换掉本文件的实现后，其余代码零改动仍能编译。
 * 三个调用方（`_console.tsx` 的守卫、`middleware.ts` 的 authMiddleware、
 * `login.tsx` 的 loader）本次**一行未动** —— 接缝守住了。
 *
 * ⚠️ 这个文件**只能导出 createServerFn**。它是被客户端路由 import 的，
 * 一旦导出普通函数，构建期的 import-protection 就会因为 `react-start/server`
 * 而拒绝整个客户端图。写 cookie 的辅助函数因此放在 `./cookies.ts`。
 */

export const SESSION_COOKIE = 'pokelab_session'

/** 读当前训练家。验签失败、查不到、版本不符 —— 一律 GUEST，绝不抛错。 */
export const getTrainer = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Trainer> => {
    const payload = verify(getCookie(SESSION_COOKIE))
    if (!payload) return GUEST

    const row = db
      .select()
      .from(trainers)
      .where(eq(trainers.id, payload.uid))
      .get()

    if (!row) return GUEST
    // 改过密码 → 这个 cookie 是上一代的，作废
    if (row.passwordVersion !== payload.pv) return GUEST

    return { id: row.id, handle: row.handle, tier: row.tier }
  },
)
