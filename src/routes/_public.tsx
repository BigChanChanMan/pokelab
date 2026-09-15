import { Outlet, createFileRoute } from '@tanstack/react-router'

import { SiteFooter, SiteHeader } from '@/components/site-header'

/**
 * 公开外壳。图鉴、克制表、组件实验室、搭建手册都挂在这一支上。
 *
 * 视觉与 pokebrutal 完全一致 —— 页面本身一行没改，只是从「被根壳自动包住」
 * 变成「被这一层包住」。
 */
export const Route = createFileRoute('/_public')({
  component: PublicLayout,
})

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
