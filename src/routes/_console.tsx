import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppSidebar } from '@/components/app-sidebar'
import { ConsoleHeader } from '@/components/console-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getTrainer } from '@/server/trainer'

/**
 * 控制台外壳。
 *
 * `beforeLoad` 是「服务端 + 客户端都会跑」的同构函数，所以：
 *   1. 访客在 SSR 阶段就被重定向，不会闪一下控制台再跳走
 *   2. trainer 沿着路由树往下传，子路由不再重复取
 *
 * ⚠️ 这个 beforeLoad 是**导航守卫**，不是访问控制。它保护的只是「页面」，
 * 不保护服务端函数。每个能力仍然必须在自己的 createServerFn 上挂
 * requireCapability（DESIGN.md §7）。
 */
export const Route = createFileRoute('/_console')({
  beforeLoad: async () => {
    const trainer = await getTrainer()
    if (trainer.tier === 'guest') {
      throw redirect({ to: '/login' })
    }
    return { trainer }
  },
  component: ConsoleLayout,
})

function ConsoleLayout() {
  const { trainer } = Route.useRouteContext()

  return (
    <SidebarProvider>
      <AppSidebar trainer={trainer} />
      <SidebarInset>
        <ConsoleHeader trainer={trainer} />
        <div className="flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
