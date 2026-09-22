import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { CardFace, RarityBadge } from '@/components/rarity'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CARD_BUCKETS } from '@/data/card-pool'
import { RARITY_LABEL, drawFor, percentOf, type CardRarity } from '@/lib/gacha'
import { readRates } from '@/server/gacha'

/**
 * 概率公示（PRD §12 的 P3）。
 *
 * PRD §4.4 把这一页定成**硬性合规要求**：不得隐藏、不得用小字弱化、
 * 不得做成需要多级点击才能到达的隐蔽入口。本项目不做真实支付，所以那条
 * 合规论证在这里不成立 —— 但这一页仍然**不加能力门**，理由见 server/gacha.ts。
 *
 * 做的一件额外诚实的事（PRD §P3-02）：把「设计概率」和「卡池实际构成」
 * 并列摆出来。前者决定你抽到**哪个档位**，后者决定该档位里有多少张可选。
 * 两者是两回事，分开公示。
 */
export const Route = createFileRoute('/_console/gacha/rates')({
  loader: async () => ({ rates: await readRates() }),
  component: RatesPage,
})

const RARITIES: CardRarity[] = ['N', 'R', 'SR', 'SSR', 'UR']

function RatesPage() {
  const { rates } = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black tracking-tight">概率公示</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          所有概率、规则、以及卡池的真实构成。不藏在二级页面里。
        </p>
      </header>

      {/* 一、设计概率 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">一、设计概率</CardTitle>
          <CardDescription>
            决定你抽到<strong>哪个档位</strong>。这是公开的设计值。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {RARITIES.map((tier) => {
            const w = percentOf(rates.weights[tier])
            return (
              <div key={tier} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <RarityBadge tier={tier} label={RARITY_LABEL[tier]} />
                  <span className="font-head tabular-nums">
                    {w}%
                    <span className="ml-2 text-muted-foreground">
                      {intervalLabel(rates.weights[tier])}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full border-2 border-border bg-card">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.max(w, 0.6)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 二、卡池构成 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">二、卡池构成</CardTitle>
          <CardDescription>
            决定该档位里<strong>有多少张备选</strong>。本应用卡池为**采样池**，
            共 {rates.poolSize} 张，不是 TCGdex 全量（约 23,736 张）——
            如实标注，不冒充全量。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>档位</TableHead>
                <TableHead className="text-right">池内卡数</TableHead>
                <TableHead className="text-right">占卡池</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.pool.map((s) => (
                <TableRow key={s.tier}>
                  <TableCell>
                    <RarityBadge tier={s.tier} label={RARITY_LABEL[s.tier]} />
                  </TableCell>
                  <TableCell className="text-right font-head tabular-nums">
                    {s.count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(s.share * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 三、保底 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">三、保底机制</CardTitle>
          <CardDescription>
            纯概率抽卡存在长尾不幸 —— 连续 50 天全抽到普通卡的概率虽小但真实存在。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row
            k={`SR 保底`}
            v={`连续 ${rates.srPity} 天未获得 SR 及以上，第 ${rates.srPity + 1} 天必定 SR+`}
          />
          <Row
            k={`SSR 保底`}
            v={`连续 ${rates.ssrPity} 天未获得 SSR 及以上，第 ${rates.ssrPity + 1} 天必定 SSR+`}
          />
          <Row k="计数重置" v="抽到满足条件的稀有度时，对应计数器归零" />
          <Row
            k="保底不影响 UR"
            v="UR 只能靠运气 —— 保底永远不送 UR，它是唯一纯粹的档位"
          />
          <div className="border-2 border-border bg-muted/40 p-3">
            <p className="text-xs">
              当前全局保底进度（
              <strong>所有训练家完全一致</strong>
              ，因为计数只由日期决定）：
            </p>
            <p className="mt-1 font-head text-sm tabular-nums">
              SR {rates.pity.sinceSR} / {rates.srPity} · SSR{' '}
              {rates.pity.sinceSSR} / {rates.ssrPity}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ 保底会把 SR 的<strong>有效</strong>获得率抬高到高于上面公示的
            设计值 —— 这是保底存在的目的。上面那张表是「基础权重」，
            不含保底加成。
          </p>
        </CardContent>
      </Card>

      {/* 四、确定性 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">四、确定性说明</CardTitle>
          <CardDescription>
            为什么全球抽到的是同一张卡：结果 = 日期种子 + 可复现随机数，
            不含任何用户信息。所以改本地代码也改不了今天抽什么。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row k="时区" v={`${rates.timeZone}（固定，不随用户所在地区变化）`} />
          <Row k="刷新时刻" v="东八区 00:00" />
          <Row k="保底推算基准日" v={rates.epoch} />
          <Row k="规则版本" v={rates.seedVersion} />
          <VerifyBox />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 确定性验证入口（PRD §P3-04）：输入任意日期，展示那天的结果。
 *
 * 这个组件在客户端跑 `drawFor` —— 和**服务端抽卡用的是同一个函数**。
 * 所以「输入昨天、看到昨天抽到的那张」这件事本身就是可复现性的证明。
 */
function VerifyBox() {
  const [date, setDate] = useState('')
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))

  return (
    <div className="space-y-3 border-2 border-border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="verify-date">输入任意日期，验证那天的结果</Label>
        <Input
          id="verify-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-48"
        />
      </div>
      {valid ? (
        <VerifyResult date={date} />
      ) : (
        <p className="text-xs text-muted-foreground">
          选一个日期，看看那天全世界抽到的是什么。
        </p>
      )}
    </div>
  )
}

function VerifyResult({ date }: { date: string }) {
  const result = drawFor(date, CARD_BUCKETS)
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">
        <CardFace
          image={result.card.image}
          name={result.card.name}
          tier={result.tier}
        />
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-head">{result.card.name}</p>
        <RarityBadge tier={result.tier} label={RARITY_LABEL[result.tier]} />
        {result.pity && (
          <p className="text-xs text-muted-foreground">那天由保底触发</p>
        )}
        <p className="text-xs text-muted-foreground">
          再选一次同一天，结果一定一样 —— 这就是确定性。
        </p>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b-2 border-border pb-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  )
}

/** 「约 N 天一张」—— 期望间隔 = 1 / 权重（PRD §4.2 的表）。 */
function intervalLabel(weight: number): string {
  const days = 1 / weight
  if (days < 2) return '约 1.7 天'
  return `约 ${Math.round(days)} 天`
}
