import { LogOutIcon, MenuIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { TierBadge } from '@/components/locked-nav-item'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { logout } from '@/server/auth'
import type { Trainer } from '@/lib/tiers'

/**
 * 控制台顶栏。**不放导航** —— 导航项永远只在一处出现（侧边栏）。
 *
 * 这里放的是「不属于导航的东西」：折叠按钮、主题、账号。
 * 登出也在这里 —— 它是账号动作，不是导航项（DESIGN.md §4.5）。
 */
export function ConsoleHeader({ trainer }: { trainer: Trainer }) {
  const [dark, setDark] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  async function signOut() {
    setBusy(true)
    // 服务端真的删 cookie，不只是前端跳走
    await logout()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b-2 border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />

      <Separator orientation="vertical" className="mr-1 !h-6" />

      <h1 className="font-head text-lg leading-none">
        POKÉ<span className="bg-primary px-1">LAB</span>
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
                onClick={() => setDark((v) => !v)}
              />
            }
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </TooltipTrigger>
          <TooltipContent>{dark ? '浅色模式' : '深色模式'}</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" className="gap-2 pl-2" />}
          >
            <span className="grid size-5 place-items-center border-2 border-border bg-accent font-head text-[10px]">
              {trainer.handle.slice(0, 1)}
            </span>
            <span className="max-w-32 truncate font-head text-sm">
              {trainer.handle}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Label 在 Base UI 里是 MenuGroupLabel，必须包在 Group 里 */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2">
                <span className="truncate">{trainer.handle}</span>
                <TierBadge tier={trainer.tier} />
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<a href="/settings" />}>
              设置
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy} onClick={signOut}>
              <LogOutIcon />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" aria-label="菜单" className="md:hidden">
          <MenuIcon />
        </Button>
      </div>
    </header>
  )
}
