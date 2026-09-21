import { LockIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { can, type Capability } from '@/lib/capabilities'
import { TIER_LABEL, type Trainer } from '@/lib/tiers'

/**
 * 能力门。演示 DESIGN.md §7 的「同一个能力，两处使用」：
 *
 *   - 这里决定「看不看得见」（UX）
 *   - 服务端函数的 requireCapability 决定「能不能执行」（安全）
 *
 * 两处调的是同一个 `can()`，所以它们不可能不一致。
 *
 * ⚠️ 这个组件**不是**访问控制。把它的判断删掉也不影响安全 ——
 * 真正的防线在服务端。它存在的意义只是别让用户白点。
 */
export function FeaturePage({
  trainer,
  cap,
  title,
  desc,
  children,
}: {
  trainer: Trainer
  cap: Capability
  title: string
  desc: string
  children?: React.ReactNode
}) {
  const verdict = can(trainer, cap)

  if (!verdict.allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LockIcon className="size-5" /> {title}
          </CardTitle>
          <CardDescription>
            {verdict.reason === 'tier'
              ? `这是 ${TIER_LABEL[verdict.need]} 能力。当前身份：${TIER_LABEL[trainer.tier]}。`
              : `配额已用尽（${verdict.used}/${verdict.limit}）。`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<a href="/pricing" />} nativeButton={false}>
            去升级
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  )
}
