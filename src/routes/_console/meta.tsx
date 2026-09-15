import { createFileRoute } from '@tanstack/react-router'

import { FeaturePage } from '@/components/feature-page'

export const Route = createFileRoute('/_console/meta')({
  component: Meta,
})

function Meta() {
  const { trainer } = Route.useRouteContext()
  return (
    <FeaturePage
      trainer={trainer}
      cap="meta.report"
      title="环境报告"
      desc="当前环境里各属性的使用率、常见配置与克制关系的变化趋势。"
    />
  )
}
