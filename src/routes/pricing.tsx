import { createFileRoute, Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CAPABILITIES, type Capability } from '@/lib/capabilities'
import { TIER_LABEL, type Tier } from '@/lib/tiers'

/**
 * 定价页。**两套壳都不套** —— 它是转化页，要独占整屏。
 *
 * 这里没有真实支付，这是刻意的：一旦引入支付，工程量会瞬间盖过权限系统本身，
 * 而练手目标就丢了（DESIGN.md §1）。
 */
export const Route = createFileRoute('/pricing')({
  component: Pricing,
})

const PLANS: { tier: Tier; price: string; blurb: string }[] = [
  { tier: 'guest', price: '免费', blurb: '不需要账号' },
  { tier: 'registered', price: '免费', blurb: '注册即可' },
  { tier: 'vip', price: '¥0', blurb: '演示项目，不真的收钱' },
]

/** 每档相对上一档新增的能力 —— 用表算出来，不手写。 */
function capsFor(tier: Tier): Capability[] {
  const idx = { guest: 0, registered: 1, vip: 2 }[tier]
  return (Object.keys(CAPABILITIES) as Capability[]).filter((cap) => {
    const min = CAPABILITIES[cap].minTier
    return { guest: 0, registered: 1, vip: 2 }[min] === idx
  })
}

function Pricing() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight">升级</h1>
        <p className="mt-3 text-muted-foreground">
          三档等级，能力逐级叠加。每一档都清清楚楚告诉你多了什么 ——
          因为锁定的菜单项就是这个产品的广告位。
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.tier}>
            <CardHeader>
              <CardTitle className="text-lg">{TIER_LABEL[p.tier]}</CardTitle>
              <CardDescription>{p.blurb}</CardDescription>
              <p className="font-head text-3xl">{p.price}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5 text-sm">
                {capsFor(p.tier).map((cap) => (
                  <li key={cap}>
                    <code className="font-mono text-xs font-bold">{cap}</code>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={p.tier === 'vip' ? 'default' : 'outline'}
                render={<Link to="/login" />}
              >
                {p.tier === 'guest' ? '随便逛逛' : '选择'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        这是演示项目，没有真实支付。点「选择」会回到身份切换页。
      </p>
    </div>
  )
}
