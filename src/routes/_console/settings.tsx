import { createFileRoute } from '@tanstack/react-router'

import { PasswordChangeForm } from '@/components/credential-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CAPABILITIES, type CapabilitySpec } from '@/lib/capabilities'
import { TIER_LABEL } from '@/lib/tiers'
import { changePassword } from '@/server/auth'
import { listTeams } from '@/server/teams'

/**
 * 设置页 —— 自助账户管理。
 *
 * 这里曾经是「切换身份」的开发用桩：点一下按钮就换等级。那是假登录的
 * 最后残留，已经删掉。现在只放真实账号该有的东西：我是谁、我用了多少配额、
 * 改密码。
 *
 * 管理**别人**在 `/admin`，那个页面按能力守门。
 */
export const Route = createFileRoute('/_console/settings')({
  loader: async () => {
    const teams = await listTeams()
    return { teamCount: teams.length }
  },
  component: Settings,
})

function Settings() {
  const { trainer } = Route.useRouteContext()
  const { teamCount } = Route.useLoaderData()

  const spec: CapabilitySpec = CAPABILITIES['team.create']
  const limit = spec.quota?.[trainer.tier]
  const quota = limit === undefined ? '不限量' : `${teamCount} / ${limit}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">设置</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          你的账号信息。等级由系统判定，改不了 —— 要升级看
          <a href="/pricing" className="underline underline-offset-4">
            升级页
          </a>
          。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">账号</CardTitle>
          <CardDescription>训练家名是登录凭据，也是展示名。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="训练家名" value={trainer.handle} />
          <Row label="等级" value={TIER_LABEL[trainer.tier]} />
          <Row label="队伍配额" value={quota} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">修改密码</CardTitle>
          <CardDescription>
            改完之后，其他设备上的登录会立即失效。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm
            onSubmit={async (current, next) => {
              await changePassword({ data: { current, next } })
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-head">{value}</span>
    </div>
  )
}
