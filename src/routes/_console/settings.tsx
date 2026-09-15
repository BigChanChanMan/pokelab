import { createFileRoute } from '@tanstack/react-router'

import { setTier } from '@/server/trainer'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TIER_LABEL, type Tier } from '@/lib/tiers'

export const Route = createFileRoute('/_console/settings')({
  component: Settings,
})

function Settings() {
  const { trainer } = Route.useRouteContext()

  async function pick(tier: Tier) {
    await setTier({ data: tier })
    window.location.href = tier === 'guest' ? '/' : '/settings'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">设置</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          当前身份：{TIER_LABEL[trainer.tier]}。切换身份看权限系统的实时反应。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">切换身份</CardTitle>
          <CardDescription>
            这是身份接缝的开发用桩（<code className="bg-accent px-1">src/server/trainer.ts</code>）。
            它写 cookie，不查库 —— 这就是「桩」的全部含义。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(['guest', 'registered', 'vip'] as Tier[]).map((t) => (
            <Button
              key={t}
              variant={t === trainer.tier ? 'default' : 'outline'}
              onClick={() => pick(t)}
            >
              {TIER_LABEL[t]}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">降级会怎样？</CardTitle>
          <CardDescription>
            试试以 VIP 建 5 支队伍，再切回注册训练家。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          原则是**降级不删数据**：数据是用户的，等级只影响「能不能改」。
          前 3 支可写，后 2 支只读。这条做错，用户会真的丢东西。
        </CardContent>
      </Card>
    </div>
  )
}
