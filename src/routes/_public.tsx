import { Outlet, createFileRoute } from '@tanstack/react-router'

import { SiteFooter, SiteHeader } from '@/components/site-header'
import { getTrainer } from '@/server/trainer'

/**
 * 公开外壳。图鉴、克制表、组件实验室、搭建手册都挂在这一支上。
 *
 * 视觉与 pokebrutal 完全一致 —— 页面本身一行没改，只是从「被根壳自动包住」
 * 变成「被这一层包住」。
 *
 * 取 trainer 只为了页头的登录/账号入口 —— 公开页**不做任何守门**，
 * 访客能看全部内容。
 */
export const Route = createFileRoute('/_public')({
  beforeLoad: async () => ({ trainer: await getTrainer() }),
  component: PublicLayout,
})

function PublicLayout() {
  const { trainer } = Route.useRouteContext()

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader trainer={trainer} />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
