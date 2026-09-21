import { defineConfig } from 'vitest/config'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // better-sqlite3 是原生模块，不能被 Vite 打包进 SSR 产物。
  // nitro() 覆盖生产构建，dev 的 SSR 未必 —— 两边都显式声明。
  ssr: { external: ['better-sqlite3'] },
  optimizeDeps: { exclude: ['better-sqlite3'] },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

export default config
