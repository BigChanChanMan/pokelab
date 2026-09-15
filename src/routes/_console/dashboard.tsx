import { createFileRoute } from '@tanstack/react-router'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { can, CAPABILITIES, type Capability } from '@/lib/capabilities'
import { TIER_LABEL } from '@/lib/tiers'

export const Route = createFileRoute('/_console/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { trainer } = Route.useRouteContext()

  const rows = (Object.keys(CAPABILITIES) as Capability[]).map((cap) => ({
    cap,
    verdict: can(trainer, cap),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">
          欢迎回来，{trainer.handle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          当前身份：{TIER_LABEL[trainer.tier]}。下面这张表就是全项目的权限真相源头 ——
          侧边栏和顶栏都是从它推出来的。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">能力清单</CardTitle>
          <CardDescription>
            全项目唯一的权限判定入口是 <code className="bg-accent px-1">can()</code>。
            UI 用它、服务端用它、测试也用它 —— 所以它们不可能不一致。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y-2 divide-border">
            {rows.map(({ cap, verdict }) => (
              <div
                key={cap}
                className="grid gap-1 py-2.5 sm:grid-cols-[220px_1fr] sm:gap-4"
              >
                <dt>
                  <code className="font-mono text-sm font-bold">{cap}</code>
                </dt>
                <dd className="text-sm">
                  {verdict.allowed ? (
                    <span>✅ 可用</span>
                  ) : verdict.reason === 'tier' ? (
                    <span className="text-muted-foreground">
                      🔒 需要 {TIER_LABEL[verdict.need]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      ⚠️ 配额用尽（{verdict.used}/{verdict.limit}）
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
