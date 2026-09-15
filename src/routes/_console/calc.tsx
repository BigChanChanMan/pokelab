import { createFileRoute } from '@tanstack/react-router'

import { FeaturePage } from '@/components/feature-page'

export const Route = createFileRoute('/_console/calc')({
  component: Calc,
})

function Calc() {
  const { trainer } = Route.useRouteContext()
  return (
    <FeaturePage
      trainer={trainer}
      cap="matchup.view"
      title="伤害计算"
      desc="按攻击方/防御方、招式威力、属性克制算出伤害区间。"
    />
  )
}
