import { describe, expect, it } from 'vitest'

import { GUEST, type Tier, type Trainer } from '@/lib/tiers'
import { enforceCapability } from './middleware'

const trainer = (tier: Tier): Trainer =>
  tier === 'guest' ? GUEST : { id: `t-${tier}`, handle: tier, tier }

/**
 * 整个 VIP 系统的真实性，就压在这几条断言上。
 *
 * `enforceCapability` 是 `requireCapability(cap)` 中间件 `.server()` 里的
 * **全部**逻辑 —— 测它等于测中间件，但不用起一个 HTTP 请求。
 * 所以下面这条「注册训练家调诊断 → 抛错」就是 issue #6 那条验收标准：
 * **免费用户直接调 diagnoseTeam 被服务端封掉。**
 */
describe('enforceCapability() —— UI 之外的那道防线', () => {
  it('注册训练家直接调诊断能力 → 抛 FORBIDDEN', () => {
    expect(() => enforceCapability(trainer('registered'), 'team.diagnose')).toThrow(
      'FORBIDDEN:team.diagnose:tier',
    )
  })

  it('访客调任何写能力都被封', () => {
    expect(() => enforceCapability(GUEST, 'team.create')).toThrow(
      'FORBIDDEN:team.create:tier',
    )
  })

  it('VIP 调诊断放行', () => {
    expect(() => enforceCapability(trainer('vip'), 'team.diagnose')).not.toThrow()
  })

  it('等级是阶梯：VIP 同时拥有注册用户的全部能力', () => {
    for (const cap of ['dex.browse', 'team.create', 'battle.record', 'team.diagnose'] as const) {
      expect(() => enforceCapability(trainer('vip'), cap)).not.toThrow()
    }
  })

  it('注册训练家直接调 user.manage → 抛 FORBIDDEN', () => {
    expect(() => enforceCapability(trainer('registered'), 'user.manage')).toThrow(
      'FORBIDDEN:user.manage:tier',
    )
  })

  it('VIP 也拿不到管理能力', () => {
    expect(() => enforceCapability(trainer('vip'), 'user.manage')).toThrow(
      'FORBIDDEN:user.manage:tier',
    )
  })

  it('管理员拿到管理能力，且仍有 VIP 的全部能力', () => {
    for (const cap of [
      'user.manage',
      'code.manage',
      'team.diagnose',
      'team.create',
    ] as const) {
      expect(() => enforceCapability(trainer('admin'), cap)).not.toThrow()
    }
  })
})
