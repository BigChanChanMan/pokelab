import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'

import { CARD_BUCKETS, CARD_POOL } from '@/data/card-pool'
import { db } from '@/db/client'
import { gachaDraws } from '@/db/schema'
import {
  EPOCH,
  RARITY_WEIGHTS,
  SEED_VERSION,
  SSR_PITY,
  SR_PITY,
  TIME_ZONE,
  albumStats,
  drawFor,
  msUntilNextDraw,
  poolStats,
  todayInTimeZone,
  type AlbumStats,
  type CardRarity,
  type PoolStats,
} from '@/lib/gacha'
import type { PoolCard } from '@/data/card-pool'
import { requireCapability } from './middleware'
import type { Trainer } from '@/lib/tiers'

/**
 * 每日一抽的服务端函数。**这里是真正的防线。**
 *
 * 关键设计：**客户端永远不传日期。**
 *
 * 「今天」由服务端按 Asia/Shanghai 算（lib/gacha.ts 的 todayInTimeZone）。
 * 客户端传的日期如果被采信，VIP 就能传一串历史日期把整本抽卡册刷满 ——
 * 抽卡结果本身不可作弊（日期纯函数），但**「我哪天抽过」是可作弊的**，
 * 而抽卡册正是需要服务端强制的那个资产。
 *
 * 客户端不知道今天是几号，从响应里读 —— 所以响应里都带 `today`。
 * 这不成问题：loader 在 SSR 阶段就在服务端跑，首屏渲染时日期已经有了。
 */

function trainerId(trainer: Trainer): string {
  if (!trainer.id) throw new Error('FORBIDDEN:no-identity')
  return trainer.id
}

/** 这个训练家抽过的所有日期，升序。 */
function drawnDates(id: string): string[] {
  return db
    .select({ date: gachaDraws.date })
    .from(gachaDraws)
    .where(eq(gachaDraws.trainerId, id))
    .all()
    .map((r) => r.date)
    .sort()
}

/**
 * 概率公示页的数据。**不加能力门。**
 *
 * PRD §4.4 把概率公示定成硬性合规要求；本项目不做真实支付，所以那条论证
 * 在这里不成立，但这一页仍然不该锁：
 *   - 它不含任何特权数据，锁它没有任何收益
 *   - 它是最好的升级广告 —— 用户看到概率表和保底进度，才知道自己错过了什么
 * 锁的是「抽」和「册」，不该锁「说明」。
 */
export const readRates = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RatesData> => {
    const today = todayInTimeZone()
    const pity = drawFor(today, CARD_BUCKETS).pityState
    return {
      today,
      timeZone: TIME_ZONE,
      epoch: EPOCH,
      seedVersion: SEED_VERSION,
      weights: RARITY_WEIGHTS,
      pool: poolStats(CARD_BUCKETS),
      poolSize: CARD_POOL.length,
      pity,
      srPity: SR_PITY,
      ssrPity: SSR_PITY,
    }
  },
)

/**
 * 主界面和抽卡册共用的读取。
 *
 * 走 `gacha.album`（registered）而不是 `gacha.draw`（vip）——
 * 降级之后册子还看得见（DESIGN.md §6.4：降级不删数据）。
 * 注册用户进来能知道「今天已抽/未抽」，只是点不动抽卡按钮。
 */
export const readAlbum = createServerFn({ method: 'GET' })
  .middleware([requireCapability('gacha.album')])
  .handler(async ({ context }): Promise<AlbumData> => {
    const today = todayInTimeZone()
    const dates = drawnDates(trainerId(context.trainer))
    const todayDraw = dates.includes(today)
      ? project(drawFor(today, CARD_BUCKETS), dates, today)
      : null

    return {
      today,
      msLeft: msUntilNextDraw(),
      todayDraw,
      stats: albumStats(dates),
      timeline: [...dates]
        .reverse()
        .map((d) => project(drawFor(d, CARD_BUCKETS), dates, d)),
      pity: drawFor(today, CARD_BUCKETS).pityState,
      srPity: SR_PITY,
      ssrPity: SSR_PITY,
      poolCounts: poolCountsByRarity(),
    }
  })

/**
 * 抽今天这一张。
 *
 * 三道门：
 *   1. `requireCapability('gacha.draw')` —— 等级门（VIP）
 *   2. 复合主键 `(trainerId, date)` —— 「一天一次」这条领域规则落在 schema 上
 *   3. 下面显式查重 —— 给用户一个**能读懂**的错，而不是 SQLite 的约束报错
 */
export const drawToday = createServerFn({ method: 'POST' })
  .middleware([requireCapability('gacha.draw')])
  .handler(async ({ context }): Promise<AlbumData['todayDraw']> => {
    const id = trainerId(context.trainer)
    const today = todayInTimeZone()

    const existing = db
      .select({ date: gachaDraws.date })
      .from(gachaDraws)
      .where(and(eq(gachaDraws.trainerId, id), eq(gachaDraws.date, today)))
      .get()
    if (existing) throw new Error('GACHA_ALREADY_DRAWN')

    db.insert(gachaDraws)
      .values({ trainerId: id, date: today, seedVersion: SEED_VERSION, createdAt: new Date() })
      .run()

    const dates = drawnDates(id)
    return project(drawFor(today, CARD_BUCKETS), dates, today)
  })

/**
 * 抽卡结果 → 界面要的东西。
 *
 * `isNew` / `owned` 都从**抽过的日期**算，不存计数 —— 存了就会和事实漂移。
 */
function project(
  result: ReturnType<typeof drawFor>,
  allDates: string[],
  date: string,
): DrawView {
  const sameCard = allDates.filter(
    (d) => drawFor(d, CARD_BUCKETS).card.id === result.card.id,
  )
  return {
    date,
    card: result.card,
    tier: result.tier,
    pity: result.pity,
    isNew: sameCard.length <= 1,
    owned: sameCard.length,
  }
}

export interface DrawView {
  date: string
  card: PoolCard
  tier: CardRarity
  pity: boolean
  /** 首次收集 —— 界面显示 NEW 徽标 */
  isNew: boolean
  /** 这张卡一共抽到过几次 */
  owned: number
}

export interface AlbumData {
  today: string
  msLeft: number
  todayDraw: DrawView | null
  stats: AlbumStats
  timeline: DrawView[]
  pity: { sinceSR: number; sinceSSR: number }
  srPity: number
  ssrPity: number
  /** 各档池内总数 —— 收集完成度的分母 */
  poolCounts: Record<CardRarity, number>
}

function poolCountsByRarity(): Record<CardRarity, number> {
  return {
    N: CARD_BUCKETS.N.length,
    R: CARD_BUCKETS.R.length,
    SR: CARD_BUCKETS.SR.length,
    SSR: CARD_BUCKETS.SSR.length,
    UR: CARD_BUCKETS.UR.length,
  }
}

export interface RatesData {
  today: string
  timeZone: string
  epoch: string
  seedVersion: string
  weights: Record<CardRarity, number>
  pool: PoolStats[]
  poolSize: number
  pity: { sinceSR: number; sinceSSR: number }
  srPity: number
  ssrPity: number
}
