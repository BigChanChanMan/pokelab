import { describe, expect, it } from 'vitest'

import { GUEST, type Tier, type Trainer } from './tiers'
import { teamNameError, teamSlots, type Team } from './team'

const trainer = (tier: Tier): Trainer =>
  tier === 'guest' ? GUEST : { id: `t-${tier}`, handle: tier, tier }

/** 造 n 支队伍，createdAt 严格递增 —— teamSlots 的可写窗口依赖这个序 */
const teams = (n: number): Team[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `team_${i}`,
    trainerId: 't-registered',
    name: `队伍 ${i + 1}`,
    createdAt: 1000 + i,
    members: [],
  }))

describe('teamSlots() —— 降级后的可写窗口', () => {
  it('注册训练家（配额 3）：5 支里前 3 支可写，后 2 支只读', () => {
    const slots = teamSlots(trainer('registered'), teams(5))
    expect(slots.map((s) => s.writable)).toEqual([true, true, true, false, false])
  })

  it('VIP：5 支全可写', () => {
    const slots = teamSlots(trainer('vip'), teams(5))
    expect(slots.every((s) => s.writable)).toBe(true)
  })

  it('没有队伍时不报错', () => {
    expect(teamSlots(trainer('registered'), [])).toEqual([])
  })

  it('输入顺序不影响窗口 —— 排序按 createdAt，不按数组下标', () => {
    const reversed = [...teams(5)].reverse()
    expect(teamSlots(trainer('registered'), reversed).map((s) => s.writable))
      .toEqual([true, true, true, false, false])
  })

  it('**降级不删数据**：窗口外的队伍仍然在列表里，只是 writable=false', () => {
    const slots = teamSlots(trainer('registered'), teams(5))
    expect(slots).toHaveLength(5)
    expect(slots[4].team.name).toBe('队伍 5')
  })
})

describe('teamNameError() —— 队伍名校验（新建与重命名共用）', () => {
  it('空串 / 纯空白 → 报错', () => {
    expect(teamNameError('')).not.toBeNull()
    expect(teamNameError('   ')).not.toBeNull()
  })

  it('超过 30 字 → 报错', () => {
    expect(teamNameError('x'.repeat(31))).not.toBeNull()
  })

  it('合法名 → null', () => {
    expect(teamNameError('我的队伍')).toBeNull()
    expect(teamNameError('x'.repeat(30))).toBeNull()
  })
})
