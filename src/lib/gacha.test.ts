import { describe, expect, it } from 'vitest'

import { CARD_BUCKETS, CARD_POOL } from '@/data/card-pool'
import {
  EPOCH,
  RARITY_RANK,
  RARITY_WEIGHTS,
  SSR_PITY,
  albumStats,
  addDays,
  daysBetween,
  drawFor,
  hashSeed,
  msUntilNextDraw,
  poolStats,
  rollTier,
  todayInTimeZone,
  type CardRarity,
} from './gacha'

const RARITIES: CardRarity[] = ['N', 'R', 'SR', 'SSR', 'UR']

/** 从基准日起算 n 天，逐日抽一次。 */
function simulate(n: number) {
  const days = daysBetween(EPOCH, addDays(EPOCH, n - 1))
  return days.map((date) => drawFor(date, CARD_BUCKETS))
}

const rate = (counts: Record<string, number>, n: number, t: string) =>
  ((counts[t] ?? 0) / n) * 100

describe('确定性', () => {
  it('同一天抽到同一张卡 —— 调两次结果完全一致', () => {
    const a = drawFor('2026-09-21', CARD_BUCKETS)
    const b = drawFor('2026-09-21', CARD_BUCKETS)
    expect(a.card.id).toBe(b.card.id)
    expect(a.tier).toBe(b.tier)
  })

  it('同一天、任何训练家都是同一张卡 —— 函数签名里根本没有身份参数', () => {
    // 这条测试守的是「全球同卡」这个卖点本身：一旦有人给 drawFor 加上
    // trainerId 并混进种子，下面这行会立刻编译不过。
    expect(drawFor.length).toBe(2) // (date, buckets)
  })

  it('不同日期会抽到不同的卡（否则种子没起作用）', () => {
    const ids = new Set(simulate(60).map((r) => r.card.id))
    expect(ids.size).toBeGreaterThan(20)
  })
})

describe('概率模型', () => {
  // 一百年。样本越大噪声越小 —— 3650 天时 N 档的抽样偏差能到 1.75 个百分点，
  // 那是 PRNG 的噪声不是 bug，但会让「< 1%」这条断言随机失败。
  const N = 36500

  it('档位频率与公示权重吻合（PRD M1 的验收标准：偏差 < 1%）', () => {
    const counts: Record<string, number> = {}
    for (const d of daysBetween(EPOCH, addDays(EPOCH, N - 1))) {
      const t = rollTier(d)
      counts[t] = (counts[t] ?? 0) + 1
    }
    for (const t of RARITIES) {
      expect(Math.abs(rate(counts, N, t) - RARITY_WEIGHTS[t] * 100)).toBeLessThan(1)
    }
  })

  it('档位频率是阶梯：N > R > SR > SSR > UR', () => {
    const counts: Record<string, number> = {}
    for (const d of daysBetween(EPOCH, addDays(EPOCH, N - 1))) {
      const t = rollTier(d)
      counts[t] = (counts[t] ?? 0) + 1
    }
    const rates = RARITIES.map((t) => rate(counts, N, t))
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThan(rates[i - 1])
    }
  })

  it('保底把 SR 的有效率抬高、把 N 压低 —— 这是设计使然，不是 bug', () => {
    const counts: Record<string, number> = {}
    for (const r of simulate(3650)) counts[r.tier] = (counts[r.tier] ?? 0) + 1
    // 保底只送 SR 和 SSR，永远不会送 UR
    expect(rate(counts, 3650, 'SR')).toBeGreaterThan(RARITY_WEIGHTS.SR * 100)
    expect(rate(counts, 3650, 'N')).toBeLessThan(RARITY_WEIGHTS.N * 100)
  })

  it('UR 从不由保底产生 —— 它是唯一的「纯运气」档位', () => {
    const counts: Record<string, number> = {}
    for (const r of simulate(N)) {
      counts[r.tier] = (counts[r.tier] ?? 0) + 1
      expect(r.tier !== 'UR' || !r.pity).toBe(true)
    }
    expect(Math.abs(rate(counts, N, 'UR') - RARITY_WEIGHTS.UR * 100)).toBeLessThan(0.15)
  })
})

describe('保底', () => {
  const N = 3650

  /**
   * 回归测试：原型把「保底计数」和「实际档位」算成了两回事 ——
   * 保底赠送的 SSR 从不重置计数器，于是「连续 60 天没有 SSR+」一旦成立
   * 就永远成立，从此**每天**强制 SSR。实测 31.7% 的天数被强制，
   * N 档实际只占 40.3%（公示 60%），而且全球用户同时锁死在 SSR 上。
   *
   * 这条测试就是钉住那个 bug 的。
   */
  it('不会锁死档位：连续强制天数 ≤ 2，整体触发率 < 8%', () => {
    const draws = simulate(N)

    let run = 0
    let maxRun = 0
    for (const d of draws) {
      run = d.pity ? run + 1 : 0
      if (run > maxRun) maxRun = run
    }
    expect(maxRun).toBeLessThanOrEqual(2)

    const pityRate = (draws.filter((d) => d.pity).length / N) * 100
    expect(pityRate).toBeLessThan(8) // 原型是 31.7%
  })

  it('连续同档不会超过保底窗口 —— 11 天', () => {
    const draws = simulate(N)
    let run = 1
    let maxRun = 1
    for (let i = 1; i < draws.length; i++) {
      run = draws[i].tier === draws[i - 1].tier ? run + 1 : 1
      if (run > maxRun) maxRun = run
    }
    expect(maxRun).toBeLessThanOrEqual(11)
  })

  it('SR 保底确实在计数到阈值那天强制提档', () => {
    const draws = simulate(400)
    const hit = draws.find((d) => d.pity && d.tier === 'SR')!
    expect(hit).toBeDefined()
    // `pityState` 是**当天之前**的计数（不含当天）。触发那天它必须已经到线。
    expect(hit.pityState.sinceSR).toBeGreaterThanOrEqual(10)
    expect(RARITY_RANK[hit.tier]).toBeGreaterThanOrEqual(RARITY_RANK.SR)
  })

  it('SSR 保底的窗口是 60 天，不是 10', () => {
    const draws = simulate(N)
    for (const d of draws) {
      if (d.tier === 'SSR' && d.pity) {
        // 触发 SSR 保底时，SR 计数必然也早就超了 —— SSR 窗口更长
        expect(d.pityState.sinceSSR).toBeGreaterThanOrEqual(SSR_PITY)
      }
    }
  })

  it('保底进度全球一致 —— 它是日期的纯函数', () => {
    expect(drawFor('2026-09-21', CARD_BUCKETS).pityState).toEqual(
      drawFor('2026-09-21', CARD_BUCKETS).pityState,
    )
  })
})

describe('卡池', () => {
  it('每张卡都落在一个桶里，且五档都有卡', () => {
    const total = RARITIES.reduce((n, t) => n + CARD_BUCKETS[t].length, 0)
    expect(total).toBe(CARD_POOL.length)
    for (const t of RARITIES) expect(CARD_BUCKETS[t].length).toBeGreaterThan(0)
  })

  it('每张卡都有 id 和名字，且 id 唯一', () => {
    const ids = new Set(CARD_POOL.map((c) => c.id))
    expect(ids.size).toBe(CARD_POOL.length)
    for (const c of CARD_POOL) {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
    }
  })

  it('池子占比是「池子里有多少张」，和设计权重是两回事', () => {
    const stats = poolStats(CARD_BUCKETS)
    const sum = stats.reduce((n, s) => n + s.share, 0)
    expect(sum).toBeCloseTo(1, 10)
    // N 占设计权重 60%，但池子里 N 只占 54%（324/599）—— 两个数字本来就不该相等
    const n = stats.find((s) => s.tier === 'N')!
    expect(n.count).toBe(324)
    expect(n.share).toBeCloseTo(324 / 599, 6)
  })
})

describe('日期工具', () => {
  it('addDays 跨月、跨年、跨闰日都正确', () => {
    expect(addDays('2026-09-21', 1)).toBe('2026-09-22')
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // 闰年
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01') // 平年
  })

  it('todayInTimeZone 输出 YYYY-MM-DD', () => {
    expect(todayInTimeZone()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // 东八区的「今天」在 UTC 日界前后和 UTC 日期不同 —— 这正是不能用 toISOString 的原因
    expect(todayInTimeZone(new Date('2026-09-21T17:00:00Z'))).toBe('2026-09-22')
    expect(todayInTimeZone(new Date('2026-09-21T15:59:00Z'))).toBe('2026-09-21')
  })

  it('msUntilNextDraw 落在 0 到 24 小时之间', () => {
    const ms = msUntilNextDraw(new Date('2026-09-21T12:00:00Z')) // 东八区 20:00
    expect(ms).toBe(4 * 60 * 60 * 1000)
  })

  it('hashSeed 稳定且落在 32 位无符号范围', () => {
    expect(hashSeed('2026-09-21|dailydraw-v1')).toBe(hashSeed('2026-09-21|dailydraw-v1'))
    const h = hashSeed('随便什么')
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('抽卡册统计', () => {
  it('空册子不炸', () => {
    const s = albumStats([])
    expect(s.total).toBe(0)
    expect(s.streak).toBe(0)
    expect(s.longestStreak).toBe(0)
  })

  it('连续天数：断一天就重来，最长连续独立记录', () => {
    const s = albumStats(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10'])
    expect(s.total).toBe(4)
    expect(s.longestStreak).toBe(3)
    expect(s.streak).toBe(1) // 最后一条是孤立的 09-10
  })

  it('连续到昨天、今天还没抽 —— 不算断签', () => {
    const s = albumStats(['2026-09-19', '2026-09-20'])
    expect(s.streak).toBe(2)
  })

  it('重复日期只算一次，且收集数按去重卡数算', () => {
    const s = albumStats(['2026-09-01', '2026-09-01'])
    expect(s.total).toBe(1)
    expect(s.unique).toBe(1)
  })
})
