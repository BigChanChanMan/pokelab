import { createFileRoute } from '@tanstack/react-router'

import { FeaturePage } from '@/components/feature-page'

export const Route = createFileRoute('/_console/battles')({
  component: Battles,
})

function Battles() {
  const { trainer } = Route.useRouteContext()
  return (
    <FeaturePage
      trainer={trainer}
      cap="battle.record"
      title="对战记录"
      desc="记录每次对局的结果。对手队伍存快照，不存引用 —— 对手改了队伍，历史记录不能跟着变。"
    />
  )
}
