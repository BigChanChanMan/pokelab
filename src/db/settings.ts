import { eq } from 'drizzle-orm'

import { db } from './client'
import { settings, UPGRADE_CODE_KEY } from './schema'

/** settings 表的读写。升级码是它目前唯一的用途，将来别的开关也能走这里。 */

export function getSetting(key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get()
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run()
}

/**
 * 当前的升级码。**没设置过就是 null** —— 此时不接受任何输入，
 * 而不是拿一个空字符串当默认值（那会让「输入空串」意外升级成功）。
 */
export const getUpgradeCode = () => getSetting(UPGRADE_CODE_KEY)

export const setUpgradeCode = (code: string) => setSetting(UPGRADE_CODE_KEY, code)
