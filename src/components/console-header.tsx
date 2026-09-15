import { MenuIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { TierBadge } from '@/components/locked-nav-item'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Trainer } from '@/lib/tiers'

/**
 * 控制台顶栏。**不放导航** —— 导航项永远只在一处出现（侧边栏）。
 *
 * 这里放的是「不属于导航的东西」：折叠按钮、搜索、主题、账号。
 */
export function ConsoleHeader({ trainer }: { trainer: Trainer }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b-2 border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />

      <Separator orientation="vertical" className="mr-1 !h-6" />

      <h1 className="font-head text-lg leading-none">
        POKÉ<span className="bg-primary px-1">LAB</span>
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <TierBadge tier={trainer.tier} />

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

        <Button variant="ghost" size="icon" aria-label="菜单" className="md:hidden">
          <MenuIcon />
        </Button>
      </div>
    </header>
  )
}
