import { describe, expect, it } from 'vitest'

import { can } from './capabilities'
import { GUEST, type Tier, type Trainer } from './tiers'

const trainer = (tier: Tier): Trainer =>
  tier === 'guest' ? GUEST : { id: `t-${tier}`, handle: tier, tier }

describe('can()', () => {
  // 第 4 条是关键用例：它固定了一条产品规则 ——
  // 等级是阶梯，不是集合。VIP 拥有注册用户的全部能力，外加自己的。
  it.each<[Tier, Parameters<typeof can>[1], boolean]>([
    ['guest', 'dex.browse', true],
    ['guest', 'team.create', false],
    ['registered', 'team.create', true],
    ['registered', 'team.diagnose', false],
    ['vip', 'team.diagnose', true],
  ])('%s 使用 %s → %s', (tier, cap, expected) => {
    expect(can(trainer(tier), cap).allowed).toBe(expected)
  })

  it('拒绝时给出等级缺口，UI 才能引导升级', () => {
    const v = can(trainer('registered'), 'team.diagnose')
    expect(v).toEqual({ allowed: false, reason: 'tier', need: 'vip' })
  })

  it('配额：注册训练家第 4 支队伍被拒', () => {
    expect(can(trainer('registered'), 'team.create', { used: 3 })).toEqual({
      allowed: false,
      reason: 'quota',
      limit: 3,
      used: 3,
    })
  })

  it('配额：VIP 不限量', () => {
    expect(can(trainer('vip'), 'team.create', { used: 999 }).allowed).toBe(true)
  })

  it('不带 usage 时只判等级，不判配额', () => {
    expect(can(trainer('registered'), 'team.create').allowed).toBe(true)
  })
})
