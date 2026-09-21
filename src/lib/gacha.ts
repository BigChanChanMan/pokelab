import { CARD_BUCKETS, type PoolCard } from '@/data/card-pool'

/**
 * 每日一抽的内核 —— 纯函数，没有 IO，没有身份。
 *
 * 两条必须守住的领域规则（CONTEXT.md 「抽卡」小节）：
 *
 *   1. **结果是日期的纯函数。** 同一天、任何训练家、任何设备，抽到同一张卡。
 *      所以这里的每个函数都**不接受 trainerId** —— 不是「忘了传」，是刻意的：
 *      一旦把训练家混进种子，「全球同卡」立刻失效，而这是本功能的全部卖点。
 *      抽卡结果因此不可作弊；真正需要服务端强制的资产是抽卡册，不是抽卡。
 *
 *   2. **保底计数也只由日期决定。** 所以全球所有训练家的保底进度天然一致，
 *      不需要任何服务端存储（PRD §6.2）。
 *
 * 术语：`Rarity` 是**卡牌**的稀有度档位，`Tier` 是**训练家**的等级。
 * 两者都是有序档位轴、都容易写成 RANK 表，所以绝不复用同一个词。
 */

export type CardRarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR'

export const RARITY_RANK: Record<CardRarity, number> = {
  N: 0,
  R: 1,
  SR: 2,
  SSR: 3,
  UR: 4,
}

export const RARITY_LABEL: Record<CardRarity, string> = {
  N: '普通',
  R: '稀有',
  SR: '超稀有',
  SSR: '顶级稀有',
  UR: '传说',
}

/** 设计权重 —— 公开公示（PRD §4.2）。改这里必须同步改概率公示页。 */
export const RARITY_WEIGHTS: Record<CardRarity, number> = {
  N: 0.6,
  R: 0.28,
  SR: 0.09,
  SSR: 0.027,
  UR: 0.003,
}

const RARITIES: readonly CardRarity[] = ['N', 'R', 'SR', 'SSR', 'UR']

/**
 * 种子版本号。**调整概率模型或卡池时必须 +1**，让新规则从切换日生效，
 * 而不是让历史记录与当天结果对不上（PRD §5.1）。
 *
 * ponytail: 现在全程只用这一个版本号扫描历史。真要切版本时，边界日**之前**
 * 得用旧版本重算 —— 那时再加一张 版本 → 权重/卡池 的表。现在加是纯负担。
 */
export const SEED_VERSION = 'dailydraw-v1'

/** 保底推算的基准日。抽卡册里所有历史都由它逐日推出。 */
export const EPOCH = '2026-01-01'

/** 连续这么多天没拿到 SR 及以上，下一次强制 SR+（PRD §6.1） */
export const SR_PITY = 10
/** 连续这么多天没拿到 SSR 及以上，下一次强制 SSR+ */
export const SSR_PITY = 60

/**
 * 刷新时刻固定在 **Asia/Shanghai 的 00:00**。
 *
 * PRD §5.3 原本要求「按用户本地时区」，那是为「纯前端、无后端」写的。
 * 但「全球同卡」和「用户本地时区」本身是矛盾的：同一个 UTC 时刻，
 * 东京已是明天、洛杉矶还是昨天，两边抽到的**不是同一张卡**。
 * 定死时区之后，「全球同卡」才从近似成立变成精确成立，
 * 保底进度也才真的全球一致（PRD §6.2 的声称在本地时区下同样是假的）。
 *
 * 代价：非东八区用户看到的重置时刻不在本地午夜。
 * ponytail: 固定东八区；要真做多时区，得先重新定义「全球同卡」。
 */
export const TIME_ZONE = 'Asia/Shanghai'

const DAY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const CLOCK_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** 服务端说了算的「今天」。客户端传什么都不采信 —— 见 lib 里没有日期参数的原因。 */
export function todayInTimeZone(now = new Date()): string {
  return DAY_FMT.format(now) // en-CA 就是 YYYY-MM-DD
}

/** 距离下一次可抽（东八区午夜）还有多少毫秒，给倒计时用。 */
export function msUntilNextDraw(now = new Date()): number {
  const [h, m, s] = CLOCK_FMT.format(now).split(':').map(Number)
  return ((24 * 60 - (h * 60 + m)) * 60 - s) * 1000
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 日期字符串加减天数。
 *
 * 用 `Date.UTC` 而不是 `new Date(y, m, d+n)`：后者走本地时区，
 * 遇到夏令时切换日会多算/少算一小时，进而算错一整天。
 * 这里处理的是「纯日期」，UTC 数学没有时区、没有夏令时。
 */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** 含头含尾的日期区间。 */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let cur = from; cur <= to; cur = addDays(cur, 1)) out.push(cur)
  return out
}

/** FNV-1a：字符串 → 32 位无符号整数种子。 */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32：轻量、够均匀、可复现。 */
export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 按权重抽档位。 */
function pickTier(r: number): CardRarity {
  let acc = 0
  for (const tier of RARITIES) {
    acc += RARITY_WEIGHTS[tier]
    if (r < acc) return tier
  }
  return 'N'
}

/** **基础**档位 —— 不含保底。保底计数要用不含保底的值推，见 pityStateAt。 */
export function rollTier(date: string): CardRarity {
  return pickTier(mulberry32(hashSeed(`${date}|${SEED_VERSION}`))())
}

export interface PityState {
  sinceSR: number
  sinceSSR: number
}

const ZERO_PITY: PityState = { sinceSR: 0, sinceSSR: 0 }

/** 保底是否该在这一天强制提档。SSR 先判 —— 高的赢。 */
function applyPity(
  base: CardRarity,
  state: PityState,
): { tier: CardRarity; pity: boolean } {
  if (state.sinceSSR >= SSR_PITY && RARITY_RANK[base] < RARITY_RANK.SSR) {
    return { tier: 'SSR', pity: true }
  }
  if (state.sinceSR >= SR_PITY && RARITY_RANK[base] < RARITY_RANK.SR) {
    return { tier: 'SR', pity: true }
  }
  return { tier: base, pity: false }
}

/** 用**实际抽到的**档位推进保底计数。 */
function advance(state: PityState, tier: CardRarity): PityState {
  return {
    sinceSR: RARITY_RANK[tier] >= RARITY_RANK.SR ? 0 : state.sinceSR + 1,
    sinceSSR: RARITY_RANK[tier] >= RARITY_RANK.SSR ? 0 : state.sinceSSR + 1,
  }
}

/**
 * 推到 `date` **之前一天**为止的保底状态（不含 date 当天）。
 *
 * ⚠️ 这里必须用 `applyPity` 之后的**最终**档位推进计数，不能用 `rollTier` 的基础档位。
 * 用基础档位的话，一次保底赠送的 SSR 永远不会让计数器归零 —— 于是
 * 「连续 60 天没有 SSR+」一旦成立就**永远成立**，从此每天都强制 SSR。
 * PRD §6.3 的伪码是对的；原型的 JS 实现踩了这个坑（实测 31.7% 的天数被强制，
 * N 档实际只占 40.3%）。别照抄原型。
 *
 * 逐日推进的结果**缓存**在模块级 Map 里。这不破坏「纯函数」——
 * 缓存只是把 O(n²) 的重复扫描摊成 O(n)，值永远由日期唯一决定。
 * 抽卡册每读一次都要为每条记录重算保底，不缓存的话册子越长越慢。
 */
const stateBefore = new Map<string, PityState>([[EPOCH, ZERO_PITY]])
let scannedThrough = EPOCH

export function pityStateAt(date: string): PityState {
  if (date <= EPOCH) return ZERO_PITY

  // 从已扫过的位置向前推进。`date` 永远来自服务端时钟或库里的历史记录，
  // 不是用户输入，所以循环长度天然有界。
  while (scannedThrough < date) {
    const cur = stateBefore.get(scannedThrough)!
    const next = addDays(scannedThrough, 1)
    stateBefore.set(next, advance(cur, applyPity(rollTier(scannedThrough), cur).tier))
    scannedThrough = next
  }

  return stateBefore.get(date)!
}

export interface DrawResult {
  date: string
  card: PoolCard
  tier: CardRarity
  /** 本次是否由保底触发 —— 界面上要如实标注，不隐瞒（PRD §P1-03） */
  pity: boolean
  pityState: PityState
}

/** 把日期变成一张卡。整个功能的核心就是这一行时间的纯函数。 */
export function drawFor(
  date: string,
  buckets: Record<CardRarity, PoolCard[]>,
): DrawResult {
  const pityState = pityStateAt(date)
  const { tier, pity } = applyPity(rollTier(date), pityState)

  // 空桶退化成 N 桶：宁可抽到普通卡，也不能让抽卡崩掉（PRD §16 的兜底原则）。
  const bucket = buckets[tier].length ? buckets[tier] : buckets.N
  const rnd = mulberry32(hashSeed(`${date}|${SEED_VERSION}|${tier}`))
  const card = bucket[Math.floor(rnd() * bucket.length)]

  return { date, card, tier, pity, pityState }
}

export interface PoolStats {
  tier: CardRarity
  count: number
  /** 占整个卡池的比例 —— 和设计权重并列公示，是两回事（PRD §P3-02） */
  share: number
}

export function poolStats(
  buckets: Record<CardRarity, PoolCard[]>,
): PoolStats[] {
  const total = RARITIES.reduce((n, t) => n + buckets[t].length, 0)
  return RARITIES.map((tier) => ({
    tier,
    count: buckets[tier].length,
    share: total ? buckets[tier].length / total : 0,
  }))
}

/** 时间线倒序 + 统计。输入是**日期**，卡由日期重算 —— 库里不存卡片（见 db/schema.ts）。 */
export interface AlbumStats {
  total: number
  unique: number
  /** 截至最后一次抽卡的连续天数。今天还没抽不算断签。 */
  streak: number
  longestStreak: number
  /** 各档实际抽到的次数 —— 和公示的理论值对照，用户能看到自己偏了多少 */
  drawn: Record<CardRarity, number>
  /** 各档已收集的**去重**卡数 */
  collected: Record<CardRarity, number>
}

const zeroByRarity = (): Record<CardRarity, number> => ({
  N: 0,
  R: 0,
  SR: 0,
  SSR: 0,
  UR: 0,
})

export function albumStats(dates: string[]): AlbumStats {
  const sorted = [...new Set(dates)].sort()
  const drawn = zeroByRarity()
  const seen: Record<CardRarity, Set<string>> = {
    N: new Set(),
    R: new Set(),
    SR: new Set(),
    SSR: new Set(),
    UR: new Set(),
  }
  const uniqueCards = new Set<string>()

  for (const date of sorted) {
    const { tier, card } = drawFor(date, CARD_BUCKETS)
    drawn[tier] += 1
    seen[tier].add(card.id)
    uniqueCards.add(card.id)
  }

  // 最长连续：一趟扫过去，断在哪就从 1 重来。
  let longestStreak = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1
    if (run > longestStreak) longestStreak = run
  }

  // 当前连续截至**最后一次抽卡**，不是截至今天 —— 今天还没抽不该算断签。
  let streak = sorted.length ? 1 : 0
  for (let i = sorted.length - 1; i > 0; i--) {
    if (addDays(sorted[i - 1], 1) === sorted[i]) streak++
    else break
  }

  return {
    total: sorted.length,
    unique: uniqueCards.size,
    streak,
    longestStreak,
    drawn,
    collected: {
      N: seen.N.size,
      R: seen.R.size,
      SR: seen.SR.size,
      SSR: seen.SSR.size,
      UR: seen.UR.size,
    },
  }
}
