import { createFileRoute } from '@tanstack/react-router'

import { FeaturePage } from '@/components/feature-page'

/**
 * 队伍。免费能力，但带配额 —— 用来走通「等级 + 配额」的完整链路。
 *
 * 真 CRUD 在 issue #6。这一版先把门装上。
 */
export const Route = createFileRoute('/_console/teams')({
  component: Teams,
})

function Teams() {
  const { trainer } = Route.useRouteContext()

  return (
    <FeaturePage
      trainer={trainer}
      cap="team.create"
      title="我的队伍"
      desc="每支队伍最多 6 名成员。注册训练家 3 支，VIP 不限。"
    >
      <p className="text-sm text-muted-foreground">
        队伍 CRUD 与配额校验见 issue #6。注意配额有两层含义：**创建时**检查是否已满，
        **读取时**还要检查降级后的存量 —— 降级不删数据，只是变成只读。
      </p>
    </FeaturePage>
  )
}
