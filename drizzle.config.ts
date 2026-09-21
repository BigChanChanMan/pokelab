import { defineConfig } from 'drizzle-kit'

/**
 * drizzle-kit 的配置。`url` 是**文件路径**而不是 `file:` URL ——
 * better-sqlite3 要路径，`file:` 前缀是 libsql 的写法。
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? './local.db' },
})
