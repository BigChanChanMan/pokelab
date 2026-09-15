import { createFileRoute } from '@tanstack/react-router'

import { FeaturePage } from '@/components/feature-page'

/**
 * 第一个 VIP 功能。选它是因为它的输出**不可由人一眼算出**，
 * 而不是因为它技术上难做 —— 一个「VIP 才能看」但内容平淡的功能
 * 演示不出任何东西。
 */
export const Route = createFileRoute('/_console/diagnose')({
  component: Diagnose,
})

function Diagnose() {
  const { trainer } = Route.useRouteContext()
  return (
    <FeaturePage
      trainer={trainer}
      cap="team.diagnose"
      title="队伍诊断"
      desc="自动找出属性弱点叠加、速度线缺口、重复职能。"
    >
      <p className="text-sm text-muted-foreground">
        算法见 issue #6。注意这个页面**不是**访问控制 —— 真正的防线是服务端函数上
        挂的 <code className="bg-accent px-1">requireCapability(&apos;team.diagnose&apos;)</code>。
      </p>
    </FeaturePage>
  )
}
