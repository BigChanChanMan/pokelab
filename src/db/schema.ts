import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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

/**
 * 抽卡记录 —— 本仓库**第一张业务数据表**（`teams`/`members`/`battles` 至今未建）。
 *
 * 为什么只存「谁在哪天抽过」，不存卡片快照（推翻 PRD §9 的 `DrawRecord`）：
 *
 *   1. 抽卡是**日期的纯函数**（CONTEXT.md「抽卡」）。卡片、档位、是否保底
 *      全部能从 `date` 重算，存下来就是冗余。
 *   2. 存快照会引入一类脏数据：「库里的 tier」和「按日期重算的 tier」不一致。
 *      这种不一致没有正确答案，只有一堆 if。
 *   3. 连续天数、重复计数、档位分布**全部由这一张表推导**，不需要额外字段。
 *      PRD 存了 `streak`，那是冗余，还会因为断签逻辑写错而悄悄漂移。
 *
 * `seedVersion` 是必须的：它记录这一行是**哪一版规则**算出来的。
 * 调整概率模型或卡池时，新规则从切换日生效，历史记录仍按旧版本重算
 * —— 没有它，历史会和「按今天规则重算」的结果对不上（PRD §5.1）。
 */
export const gachaDraws = sqliteTable(
  'gacha_draws',
  {
    trainerId: text('trainer_id')
      .references(() => trainers.id, { onDelete: 'cascade' })
      .notNull(),
    /** 东八区的 YYYY-MM-DD。服务端算，客户端传什么都不采信（lib/gacha.ts）。 */
    date: text('date').notNull(),
    seedVersion: text('seed_version').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    // 复合主键 = 「一个训练家一天只能有一行」。每日一抽这条领域规则
    // 落在 schema 上，而不是靠应用层记得去查重。
    primaryKey({ columns: [t.trainerId, t.date] }),
  ],
)

export type TrainerRow = typeof trainers.$inferSelect
