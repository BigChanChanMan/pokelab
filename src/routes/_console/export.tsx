import { createFileRoute } from '@tanstack/react-router'

import { FeaturePage } from '@/components/feature-page'

export const Route = createFileRoute('/_console/export')({
  component: Export,
})

function Export() {
  const { trainer } = Route.useRouteContext()
  return (
    <FeaturePage
      trainer={trainer}
      cap="export.share"
      title="导出分享"
      desc="把队伍导出成图片或可分享的链接。"
    />
  )
}
