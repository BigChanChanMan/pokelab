import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import * as schema from './schema'

/**
 * 数据库连接。
 *
 * ⚠️ 必须缓存在 `globalThis` 上：Vite 的 HMR 会**重新求值服务端模块**，
 * 不缓存就每次泄漏一个连接句柄，并且锁住库文件。
 *
 * ⚠️ 也绝不要每请求 `new Database(':memory:')` —— 那样数据每次请求都没了。
 */
function connect() {
  const url = process.env.DATABASE_URL ?? './local.db'
  return drizzle(new Database(url), { schema })
}

const g = globalThis as typeof globalThis & {
  __pokelabDb?: ReturnType<typeof connect>
}

export const db = (g.__pokelabDb ??= connect())

export { schema }
