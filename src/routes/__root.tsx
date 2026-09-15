import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { TooltipProvider } from '@/components/ui/tooltip'

import appCss from '../styles.css?url'

/**
 * 根壳只管**不是布局的东西**。
 *
 * 看得见的 Header / Footer / Sidebar 一律下沉到布局路由
 * （`_public.tsx` / `_console.tsx`）。这是 DESIGN.md §4 的核心结论 ——
 * 在 pokebrutal 里，根壳写死了 <SiteHeader /> <main> <SiteFooter />，
 * 包住所有路由、路由无法退出，想在某一支上换侧边栏布局就会打架。
 *
 * 根壳的错不在侧边栏，在于可见的 chrome 放错了层。
 */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'POKÉLAB — 训练家工作台' },
      {
        name: 'description',
        content:
          '一个用 TanStack Start + shadcn Registry + neobrutalism 搭出来的宝可梦训练家工作台，带一套真实的权限系统。',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        href: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>',
      },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body className="bg-grid min-h-screen">
        {/* Tooltip 是 Base UI 的受控浮层，需要 Provider 包在最外层。
            sidebar.tsx 内部还会再套一层，嵌套无害。 */}
        <TooltipProvider>{children}</TooltipProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
