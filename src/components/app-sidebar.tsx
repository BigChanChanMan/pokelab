import { Link, useRouterState } from '@tanstack/react-router'
import {
  ActivityIcon,
  BookOpenIcon,
  CalculatorIcon,
  ChartBarIcon,
  FlaskConicalIcon,
  LayoutDashboardIcon,
  LockIcon,
  ShareIcon,
  SwordsIcon,
  UsersIcon,
} from 'lucide-react'

import { TierBadge } from '@/components/locked-nav-item'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { allowed, type Capability } from '@/lib/capabilities'
import { TIER_LABEL, type Trainer } from '@/lib/tiers'
import { cn } from '@/lib/utils'

/**
 * 侧边栏结构完全按 neobrutalism 官方文档的组成方式：
 * Sidebar > SidebarHeader / SidebarContent(SidebarGroup x N) / SidebarFooter。
 *
 * 唯一和文档不同的地方：这里的菜单项**按能力过滤**。这是本项目的主题。
 */

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  cap: Capability
}

/**
 * 导航项永远只在一处出现（DESIGN.md §4.5）。
 * 顶栏放的是「不属于导航的东西」：搜索、主题、账号。
 */
const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: '工作台',
    items: [
      {
        label: '总览',
        to: '/dashboard',
        icon: LayoutDashboardIcon,
        cap: 'dex.browse',
      },
      { label: '我的队伍', to: '/teams', icon: UsersIcon, cap: 'team.create' },
      {
        label: '对战记录',
        to: '/battles',
        icon: SwordsIcon,
        cap: 'battle.record',
      },
    ],
  },
  {
    label: '分析',
    items: [
      {
        label: '伤害计算',
        to: '/calc',
        icon: CalculatorIcon,
        cap: 'matchup.view',
      },
      {
        label: '属性克制',
        to: '/matchup',
        icon: ActivityIcon,
        cap: 'matchup.view',
      },
    ],
  },
  {
    label: '图鉴',
    items: [
      { label: '宝可梦', to: '/dex', icon: BookOpenIcon, cap: 'dex.browse' },
    ],
  },
]

/**
 * ADVANCED 分组**永远显示**，无论当前等级是什么。
 *
 * 锁定的菜单项就是 VIP 产品的广告位 —— 藏起来等于放弃转化。
 * 这和上面普通分组的处理正好相反：普通分组里没权限的项才隐藏，
 * 因为那是「能力对用户不存在」，显示了只是噪音。
 */
const ADVANCED: NavItem[] = [
  { label: '队伍诊断', to: '/diagnose', icon: FlaskConicalIcon, cap: 'team.diagnose' },
  { label: '环境报告', to: '/meta', icon: ChartBarIcon, cap: 'meta.report' },
  { label: '导出分享', to: '/export', icon: ShareIcon, cap: 'export.share' },
]

export function AppSidebar({ trainer }: { trainer: Trainer }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/dashboard" />}>
              <span className="grid size-8 shrink-0 place-items-center border-2 border-border bg-primary font-head">
                🔬
              </span>
              <span className="font-head text-base leading-none">
                POKÉ
                <span className="bg-primary px-1">LAB</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => {
          // 普通分组：能力对用户不存在就隐藏。
          const visible = group.items.filter((i) => allowed(trainer, i.cap))
          if (visible.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => (
                    <NavMenuItem key={item.to} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}

        {/* VIP 分区：永远显示，锁图标常驻 */}
        <SidebarGroup>
          <SidebarGroupLabel>Advanced</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADVANCED.map((item) => {
                const ok = allowed(trainer, item.cap)
                return ok ? (
                  <NavMenuItem key={item.to} item={item} />
                ) : (
                  <LockedMenuItem key={item.to} item={item} />
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/settings" />}>
              <span className="grid size-8 shrink-0 place-items-center border-2 border-border bg-accent font-head text-sm">
                {trainer.handle.slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span className="truncate text-sm">{trainer.handle}</span>
                <TierBadge tier={trainer.tier} />
              </span>
            </SidebarMenuButton>
            {trainer.tier !== 'vip' && (
              <SidebarMenuBadge className="border-primary bg-primary">
                升级
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function NavMenuItem({ item }: { item: NavItem }) {
  const Icon = item.icon
  // neobrutalism 的活跃态是 isActive → data-active（边框 + 主色 + 阴影），
  // 但它不认识 TanStack Router 的 Link，得自己喂。
  const { location } = useRouterState()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.label}
        isActive={location.pathname === item.to}
        render={<Link to={item.to} />}
      >
        <Icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function LockedMenuItem({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <SidebarMenuItem>
      {/* 点击不导航，去升级引导 */}
      <SidebarMenuButton
        tooltip={`${item.label}是 VIP 专属`}
        className="opacity-55"
        render={<Link to="/pricing" />}
      >
        <Icon />
        <span>{item.label}</span>
        <LockIcon className={cn('ml-auto size-3.5')} />
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export { TIER_LABEL }
