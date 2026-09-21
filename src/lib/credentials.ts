/**
 * 训练家名与密码的校验。
 *
 * **前端和服务端共用同一个函数** —— 沿用「队伍名校验」（`lib/team.ts` 的
 * `teamNameError()`）那套做法：界面提示和服务端强制不可能不一致。
 */

export const HANDLE_MIN = 2
export const HANDLE_MAX = 20
export const PASSWORD_MIN = 8

/** 按**码点**数长度，不是 UTF-16 长度 —— 「小智」是 2 个字，不是 4 个。 */
const chars = (s: string) => [...s].length

/** 返回中文错误说明，或 null 表示合法。 */
export function handleError(raw: string): string | null {
  const handle = raw.trim()
  if (chars(handle) < HANDLE_MIN) return `训练家名至少 ${HANDLE_MIN} 个字`
  if (chars(handle) > HANDLE_MAX) return `训练家名最多 ${HANDLE_MAX} 个字`
  if (/\s/.test(handle)) return '训练家名不能包含空格'
  return null
}

/** 返回中文错误说明，或 null 表示合法。 */
export function passwordError(raw: string): string | null {
  if (raw.length < PASSWORD_MIN) return `密码至少 ${PASSWORD_MIN} 位`
  return null
}

export const normalizeHandle = (raw: string) => raw.trim()
