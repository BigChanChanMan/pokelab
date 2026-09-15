import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'

import { GUEST, isTier, type Tier, type Trainer } from '@/lib/tiers'

/**
 * 全项目**唯一的身份接缝**。
 *
 * 现在读的是一个签名 cookie 里的桩数据；将来换成真实 session（查库、OAuth、
 * 多设备）时，**所有调用方一行不改**。
 *
 * 阶段 6 的验收标准：换掉本文件的实现后，其余代码零改动仍能编译。
 * 如果需要改别的文件，说明接缝设计失败了 —— 修接缝，别打补丁。
 */

const SESSION_COOKIE = 'pokelab_session'

/**
 * 桩身份。真实实现里这里会是查库的结果。
 *
 * ⚠️ 这里**不验签**，因为桩数据不值得签名。接真实账号时，把这一行换成
 * `verify(secret, getCookie(SESSION_COOKIE))`，并让失败分支返回 GUEST。
 */
function parseSession(raw: string | undefined): Trainer {
  if (!raw) return GUEST
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null && 'tier' in parsed) {
      const { tier } = parsed as { tier: unknown }
      if (!isTier(tier)) return GUEST
      const { id = null, handle = '训练家' } = parsed as Partial<Trainer>
      return { id: id ?? null, handle: handle ?? '训练家', tier }
    }
  } catch {
    // 坏 cookie 直接当访客，不抛错 —— 这是这个函数最重要的性质
  }
  return GUEST
}

/** 读当前训练家。任何异常都降级为 GUEST，绝不抛错。 */
export const getTrainer = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Trainer> => {
    return parseSession(getCookie(SESSION_COOKIE))
  },
)

/**
 * 开发用的等级切换器。写 cookie 而不是查库 —— 这就是「桩」的全部含义。
 *
 * 接真实账号时删掉这个函数，`getTrainer` 不动。
 */
export const setTier = createServerFn({ method: 'POST' })
  .validator((tier: Tier) => tier)
  .handler(async ({ data: tier }): Promise<Trainer> => {
    const trainer: Trainer =
      tier === 'guest'
        ? GUEST
        : { id: `dev-${tier}`, handle: tier === 'vip' ? '小茂' : '小智', tier }

    setCookie(SESSION_COOKIE, JSON.stringify(trainer), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    return trainer
  })
