import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { Tier } from '@/lib/tiers'

/**
 * 数据模型。DESIGN.md §9 早就画好了这张表，本次只是**加两列**：
 * `passwordHash` 和 `passwordVersion` —— 训练家第一次有真实凭据。
 *
 * 队伍 / 成员 / 对战三张表**暂时不建**。它们还在内存桩里（阶段 5），
 * 建出来没人用就是投机。见本次 spec 的 Out of Scope。
 */

export const trainers = sqliteTable('trainers', {
  id: text('id').primaryKey(),
  /** 训练家名：登录凭据**兼**展示名，唯一，不可改 */
  handle: text('handle').notNull().unique(),
  /**
   * scrypt 哈希，**自描述**格式（参数、盐、哈希串在一起）。
   * 分开存 hash + salt 的话，调 scrypt 参数就是一次全表迁移。
   */
  passwordHash: text('password_hash').notNull(),
  /** 改密码时 +1，让所有已发出的会话立即作废 */
  passwordVersion: integer('password_version').notNull().default(1),
  tier: text('tier').$type<Tier>().notNull().default('registered'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

/**
 * key/value 设置表。
 *
 * 升级码是「设置」—— 单数、当前值、由管理员改写 —— 所以不为它单开一张表。
 * 将来别的开关（比如「是否开放注册」）也能塞进来。
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export const UPGRADE_CODE_KEY = 'upgrade_code'

export type TrainerRow = typeof trainers.$inferSelect
