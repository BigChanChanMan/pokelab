import { Link } from '@tanstack/react-router'
import { MoonIcon, SunIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { TIER_LABEL, type Trainer } from '@/lib/tiers'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/dex', label: '图鉴' },
  { to: '/matchup', label: '属性克制' },
  { to: '/lab', label: '组件实验室' },
  { to: '/guide', label: '搭建手册' },
] as const

export function SiteHeader({ trainer }: { trainer: Trainer }) {
  const [dark, setDark] = useState(false)

  // 暗色模式：给 <html> 加 .dark 类，配合 styles.css 里的 .dark 变量块
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <header className="sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="group flex items-center gap-2">
          <span className="grid size-9 place-items-center border-2 border-border bg-primary font-head text-lg shadow-sm transition-transform group-hover:-rotate-6">
            ⚡
          </span>
          <span className="font-head text-lg leading-none tracking-tight sm:text-xl">
            POKÉ<span className="bg-primary px-1">LAB</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: 'bg-primary' }}
              className={cn(
                'border-2 border-transparent px-3 py-1.5 font-head text-sm transition-colors',
                'hover:border-border hover:bg-accent'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          {/* 公开页之前点不到 /login —— 这是一条断头路，现在补上入口 */}
          {trainer.id ? (
            <Button
              variant="outline"
              render={<Link to="/dashboard" />}
              nativeButton={false}
            >
              <span className="max-w-24 truncate">{trainer.handle}</span>
              <span className="text-muted-foreground">
                {TIER_LABEL[trainer.tier]}
              </span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                render={<Link to="/login" />}
                nativeButton={false}
              >
                登录
              </Button>
              <Button render={<Link to="/register" />} nativeButton={false}>
                注册
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="icon"
            aria-label={dark ? '切换到浅色模式' : '切换到深色模式'}
            onClick={() => setDark((v) => !v)}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </Button>
        </div>
      </div>

      {/* 移动端导航 */}
      <nav className="flex gap-1 overflow-x-auto border-t-2 border-border px-4 py-2 md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: 'bg-primary' }}
            className="shrink-0 border-2 border-border px-3 py-1 font-head text-xs whitespace-nowrap"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-head">
          POKÉBRUTAL — 用 shadcn Registry 协议拼出来的新粗野主义宝可梦图鉴
        </p>
        <p className="text-muted-foreground">
          数据来自{' '}
          <a
            className="underline decoration-2 underline-offset-2"
            href="https://pokeapi.co"
            target="_blank"
            rel="noreferrer"
          >
            PokeAPI
          </a>
          ，卡牌数据来自{' '}
          <a
            className="underline decoration-2 underline-offset-2"
            href="https://tcgdex.dev"
            target="_blank"
            rel="noreferrer"
          >
            TCGdex
          </a>
          ，组件来自{' '}
          <a
            className="underline decoration-2 underline-offset-2"
            href="https://neobrutalism.com"
            target="_blank"
            rel="noreferrer"
          >
            neobrutalism.com
          </a>
        </p>
      </div>
    </footer>
  )
}
