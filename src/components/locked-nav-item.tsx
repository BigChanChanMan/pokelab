import { LockIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { TIER_LABEL, type Tier } from '@/lib/tiers'

/**
 * 锁定态的菜单项。
 *
 * 关键判断（DESIGN.md §8.2）：**VIP 的锁定项必须显示，不能隐藏。**
 * 对 VIP 产品来说，锁定的菜单项就是产品本身 —— 全藏起来，用户无从知道
 * 升级能得到什么，升级率归零。
 *
 * 点击**不导航**，而是走升级引导（这里是跳到 /pricing）。
 */
export function LockedNavItem({
  label,
  need = 'vip',
  className,
}: {
  label: string
  need?: Tier
  className?: string
}) {
  return (
    <a
      href="/pricing"
      aria-disabled="true"
      title={`${label}是 ${TIER_LABEL[need]} 能力`}
      className={cn(
        'flex w-full items-center gap-2 rounded border-2 border-transparent p-2 text-left font-head text-sm opacity-55 transition-colors hover:bg-accent hover:opacity-80',
        className,
      )}
    >
      <LockIcon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      <span className="ml-auto rounded border-2 border-border px-1 text-[10px] leading-4 font-bold tracking-wider">
        {TIER_LABEL[need]}
      </span>
    </a>
  )
}

/** 等级徽章，用在侧边栏页脚和顶栏。 */
export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={cn(
        'rounded border-2 border-border px-1.5 py-0.5 font-head text-[10px] leading-none tracking-wider',
        tier === 'vip' && 'bg-primary',
        tier === 'registered' && 'bg-accent',
        tier === 'guest' && 'bg-muted',
      )}
    >
      {TIER_LABEL[tier]}
    </span>
  )
}
