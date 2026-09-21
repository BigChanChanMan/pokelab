import { eq } from 'drizzle-orm'

import { db } from './client'
import { settings, trainers, UPGRADE_CODE_KEY } from './schema'
import { hashPassword } from '../server/password'

/**
 * 种子数据。`pnpm db:seed` 一次造出演示需要的三个账号和默认升级码。
 *
 * 存在的理由：Q9 定了「第一个管理员由 seed 产生」—— 「谁能成为管理员」
 * 必须有一条**唯一、显式**的路径。同时也解决了「切等级桩删掉之后，
 * 开发期怎么造 VIP」。
 *
 * 幂等：按训练家名判断，已存在就跳过，所以可以反复跑。
 */

export const SEED_ACCOUNTS = [
  { handle: 'admin', password: 'admin12345', tier: 'admin' as const },
  { handle: '小智', password: 'satoshi12345', tier: 'registered' as const },
  { handle: '小茂', password: 'shigeru12345', tier: 'vip' as const },
]

export const SEED_UPGRADE_CODE = '天王盖地虎'

async function seed() {
  for (const acct of SEED_ACCOUNTS) {
    const existing = db
      .select({ id: trainers.id })
      .from(trainers)
      .where(eq(trainers.handle, acct.handle))
      .get()
    if (existing) {
      console.log(`跳过（已存在）：${acct.handle}`)
      continue
    }

    db.insert(trainers)
      .values({
        id: crypto.randomUUID(),
        handle: acct.handle,
        passwordHash: await hashPassword(acct.password),
        passwordVersion: 1,
        tier: acct.tier,
        createdAt: new Date(),
      })
      .run()
    console.log(`创建：${acct.handle}（${acct.tier}）`)
  }

  db.insert(settings)
    .values({ key: UPGRADE_CODE_KEY, value: SEED_UPGRADE_CODE })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: SEED_UPGRADE_CODE },
    })
    .run()

  console.log('\n=== 演示账号 ===')
  for (const a of SEED_ACCOUNTS) {
    console.log(`  ${a.handle.padEnd(8)} / ${a.password.padEnd(14)} (${a.tier})`)
  }
  console.log(`\n升级码：${SEED_UPGRADE_CODE}`)
}

// ponytail: 顶层直接跑，seed 不需要被 import —— 它是脚本，不是模块。
await seed()
