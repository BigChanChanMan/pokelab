/**
 * 错误码 —— 服务端与界面之间的契约。
 *
 * 服务端抛码（便于测试断言、便于区分分支），界面映射成中文。
 * 放一个模块里是为了让两边不可能拼错：码只在这里定义一次。
 */
export const ERR = {
  BAD_CREDENTIALS: 'AUTH_BAD_CREDENTIALS',
  NAME_TAKEN: 'AUTH_NAME_TAKEN',
  NAME_INVALID: 'AUTH_NAME_INVALID',
  WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  WRONG_PASSWORD: 'AUTH_WRONG_PASSWORD',
  CODE_INVALID: 'CODE_INVALID',
} as const

/**
 * 码 → 中文。
 *
 * ⚠️ `AUTH_BAD_CREDENTIALS` 刻意不区分「训练家名不存在」和「密码错」——
 * 区分它们等于免费告诉攻击者哪些训练家名存在。用户枚举漏洞。
 */
const MESSAGES: Record<string, string> = {
  [ERR.BAD_CREDENTIALS]: '训练家名或密码不正确',
  [ERR.NAME_TAKEN]: '这个训练家名已经被使用了',
  [ERR.NAME_INVALID]: '训练家名不合法',
  [ERR.WEAK_PASSWORD]: '密码太短',
  [ERR.WRONG_PASSWORD]: '当前密码不正确',
  [ERR.CODE_INVALID]: '升级码不正确',
  'FORBIDDEN:no-identity': '请先登录',
}

/** 把服务端抛出的错误翻成给用户看的一句话。认不出来的一律给通用文案。 */
export function messageOf(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return MESSAGES[raw] ?? '出错了，请重试'
}

/** 服务端校验失败时用的辅助 —— 抛码，不抛中文。 */
export function fail(code: string): never {
  throw new Error(code)
}
