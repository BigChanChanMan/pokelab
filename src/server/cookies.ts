import { deleteCookie, setCookie } from '@tanstack/react-start/server'

import { sign } from './session'

/**
 * 会话 cookie 的**写入**侧。
 *
 * 单独一个文件的原因：`server/trainer.ts` 被客户端路由 import，所以它
 * 只能导出 `createServerFn` —— 导出任何直接 import `react-start/server`
 * 的普通函数，构建期的 import-protection 就会拒绝整个客户端图。
 *
 * 读侧留在 `trainer.ts`（在 createServerFn 的 handler 里），写侧在这里。
 */

const SESSION_COOKIE = 'pokelab_session'

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
}

/** 签发会话并写 cookie。注册 / 登录 / 改密码共用这一处。 */
export function issueSession(uid: string, pv: number): void {
  setCookie(SESSION_COOKIE, sign({ uid, pv }), COOKIE_OPTIONS)
}

export function clearSession(): void {
  deleteCookie(SESSION_COOKIE, { path: '/' })
}
