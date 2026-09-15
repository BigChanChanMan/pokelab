import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TIER_LABEL, type Tier } from '@/lib/tiers'
import { getTrainer, setTier } from '@/server/trainer'

/**
 * 登录页。**两套壳都不套** —— 它要独占整屏。
 *
 * 这里不做密码、不做 OAuth。它是「身份接缝」的开发用桩：
 * 选一个等级，写进 cookie，`getTrainer()` 就会返回对应的 Trainer。
 *
 * 接真实账号时，这个页面被换成真登录表单，`getTrainer()` 的实现被换成
 * 查库 + 验签 —— 其余代码一行不改。
 */
export const Route = createFileRoute('/login')({
  loader: async () => ({ trainer: await getTrainer() }),
  component: LoginPage,
})

const OPTIONS: { tier: Tier; blurb: string }[] = [
  { tier: 'guest', blurb: '只能看图鉴和克制表，进不了工作台' },
  { tier: 'registered', blurb: '能建队伍、记对战，限 3 支队伍' },
  { tier: 'vip', blurb: '解锁队伍诊断、环境报告、导出分享' },
]

function LoginPage() {
  const { trainer } = Route.useLoaderData()

  async function pick(tier: Tier) {
    await setTier({ data: tier })
    // 桩身份写在 cookie 里，整页刷新让 loader 重新取值最省事
    window.location.href = tier === 'guest' ? '/' : '/dashboard'
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center border-2 border-border bg-primary font-head text-2xl shadow-md">
          🔬
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          POKÉ<span className="bg-primary px-1">LAB</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          选一个身份进入。这是权限系统的开发用桩，不是真的登录。
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((o) => (
          <Card key={o.tier}>
            <CardHeader>
              <CardTitle className="text-base">{TIER_LABEL[o.tier]}</CardTitle>
              <CardDescription>{o.blurb}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={o.tier === trainer.tier ? 'default' : 'outline'}
                className="w-full"
                onClick={() => pick(o.tier)}
              >
                {o.tier === trainer.tier ? '当前身份' : `以${TIER_LABEL[o.tier]}进入`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <a href="/" className="text-center text-sm underline underline-offset-4">
        先随便逛逛 →
      </a>
    </div>
  )
}
