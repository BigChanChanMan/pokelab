import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CAPABILITIES, type Capability } from '@/lib/capabilities'
import { messageOf } from '@/lib/errors'
import { TIER_LABEL, TIER_RANK, type Tier } from '@/lib/tiers'
import { redeemUpgradeCode } from '@/server/auth'
import { getTrainer } from '@/server/trainer'

/**
 * 定价页。**两套壳都不套** —— 它是转化页，要独占整屏。
 *
 * 没有真实支付，这是刻意的（DESIGN.md §1）。但**升级本身是真的**：
 * 输入管理员设置的升级码，服务端校验，等级真的变了。
 * 升级入口不只在这里 —— 侧边栏锁定的 VIP 菜单项也指向本页。
 */
export const Route = createFileRoute('/pricing')({
  loader: async () => ({ trainer: await getTrainer() }),
  component: Pricing,
})

const PLANS: { tier: Tier; price: string; blurb: string }[] = [
  { tier: 'guest', price: '免费', blurb: '不需要账号' },
  { tier: 'registered', price: '免费', blurb: '注册即可' },
  { tier: 'vip', price: '凭升级码', blurb: '线下获取升级码' },
  { tier: 'admin', price: '—', blurb: '由系统维护者持有' },
]

/** 每档相对上一档新增的能力 —— 用表算出来，不手写。 */
function capsFor(tier: Tier): Capability[] {
  return (Object.keys(CAPABILITIES) as Capability[]).filter(
    (cap) => CAPABILITIES[cap].minTier === tier,
  )
}

function Pricing() {
  const { trainer } = Route.useLoaderData()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  // 升级成功后就地刷新成「你已是 VIP」—— 用户刚做完一件有成就感的事，
  // 让他当场看到解锁了什么，比直接弹走更有说服力。
  const [tier, setTier] = useState<Tier>(trainer.tier)

  const isVip = TIER_RANK[tier] >= TIER_RANK.vip

  async function redeem(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const updated = await redeemUpgradeCode({ data: code })
      setTier(updated.tier)
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight">升级</h1>
        <p className="mt-3 text-muted-foreground">
          等级是阶梯，能力逐级叠加。每一档都清清楚楚告诉你多了什么 ——
          因为锁定的菜单项就是这个产品的广告位。
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const current = p.tier === tier
          return (
            <Card key={p.tier} className={current ? 'border-primary' : undefined}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {TIER_LABEL[p.tier]}
                  {current && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      当前
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{p.blurb}</CardDescription>
                <p className="font-head text-3xl">{p.price}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm">
                  {capsFor(p.tier).map((cap) => (
                    <li key={cap}>
                      <code className="font-mono text-xs font-bold">{cap}</code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {isVip ? (
        <Card className="mx-auto mt-10 max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">
              你已是{TIER_LABEL[tier]}
            </CardTitle>
            <CardDescription>
              队伍诊断、环境报告、导出分享、每日一抽都已解锁。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              render={<Link to="/diagnose" />}
              nativeButton={false}
            >
              去用队伍诊断 →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto mt-10 max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">我已有升级码</CardTitle>
            <CardDescription>
              {trainer.id
                ? '输入升级码，立即升到 VIP。'
                : '需要先登录 —— 升级总是绑定到一个账号上。'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trainer.id ? (
              <form onSubmit={redeem} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code">升级码</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="线下获取"
                    required
                  />
                </div>
                {error && (
                  <Alert status="error">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? '校验中…' : '升级'}
                </Button>
              </form>
            ) : (
              <Button
                className="w-full"
                render={<Link to="/login" />}
                nativeButton={false}
              >
                去登录 →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        这是演示项目，没有真实支付。升级码由管理员设置，线下发放。
      </p>
    </div>
  )
}
