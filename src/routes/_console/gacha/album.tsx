import { createFileRoute } from '@tanstack/react-router'

import { CardFace, RarityBadge } from '@/components/rarity'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  RARITY_LABEL,
  RARITY_WEIGHTS,
  percentOf,
  type CardRarity,
} from '@/lib/gacha'
import { readAlbum } from '@/server/gacha'

/**
 * 抽卡册（PRD §11 的 P2）。
 *
 * 走 `gacha.album`（registered）—— **降级之后册子还看得见**。
 * 里面的东西是训练家的资产，等级只影响「能不能再抽」，不影响「能不能看」。
 * DESIGN.md §6.4：降级不删数据。
 *
 * 库里只存日期，卡片全部按日期重算（db/schema.ts 的注释解释了为什么）。
 * 好处之一：用户清空缓存也不会丢册子 —— 它本来就不在浏览器里。
 */
export const Route = createFileRoute('/_console/gacha/album')({
  loader: async () => ({ album: await readAlbum() }),
  component: AlbumPage,
})

const RARITIES: CardRarity[] = ['N', 'R', 'SR', 'SSR', 'UR']

function AlbumPage() {
  const { album } = Route.useLoaderData()
  const { stats, timeline } = album

  if (timeline.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">还没有抽过卡</CardTitle>
            <CardDescription>去抽今天的第一张，它会出现在这里。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* 统计面板 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="总抽取" value={stats.total} />
        <Stat label="当前连续" value={stats.streak} unit="天" />
        <Stat label="最长连续" value={stats.longestStreak} unit="天" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">档位分布 · 实际 vs 理论</CardTitle>
          <CardDescription>
            抽到的次数占比，和公示的设计权重并列。样本小时会明显偏 —— 那是正常的。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {RARITIES.map((tier) => (
            <DistributionRow
              key={tier}
              tier={tier}
              count={stats.drawn[tier]}
              total={stats.total}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">收集完成度</CardTitle>
          <CardDescription>
            各档位已收集的<strong>去重</strong>卡数 / 该档位池内总数。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {RARITIES.map((tier) => (
            <div key={tier} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <RarityBadge tier={tier} label={RARITY_LABEL[tier]} />
                <span className="font-head tabular-nums">
                  {stats.collected[tier]} / {album.poolCounts[tier]}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 时间线 */}
      <div>
        <h3 className="mb-3 font-head text-lg">历史记录</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {timeline.map((d) => (
            <div key={d.date} className="space-y-1.5">
              <CardFace image={d.card.image} name={d.card.name} tier={d.tier} />
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="font-head tabular-nums text-muted-foreground">
                  {d.date.slice(5)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-head font-bold">{d.tier}</span>
                  {!d.isNew && (
                    <span className="text-muted-foreground">×{d.owned}</span>
                  )}
                </span>
              </div>
              <p className="truncate text-xs" title={d.card.name}>
                {d.card.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header>
      <h2 className="text-2xl font-black tracking-tight">抽卡册</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        你的每一次抽取都会记录在这里。卡片按日期重算，所以清缓存也丢不了。
      </p>
    </header>
  )
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string
  value: number
  unit?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-head text-3xl tabular-nums">
          {value}
          {unit && <span className="ml-1 text-sm font-normal">{unit}</span>}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function DistributionRow({
  tier,
  count,
  total,
}: {
  tier: CardRarity
  count: number
  total: number
}) {
  const actual = total ? (count / total) * 100 : 0
  const expected = percentOf(RARITY_WEIGHTS[tier])
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <RarityBadge tier={tier} label={RARITY_LABEL[tier]} />
        <span className="tabular-nums">
          {count} 次 · {actual.toFixed(1)}%
          <span className="ml-2 text-muted-foreground">
            理论 {expected}%
          </span>
        </span>
      </div>
      {/* 实际值用实心条，理论值用一条细线标在它上面 */}
      <div className="relative">
        <Progress value={actual} />
        <span
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-foreground/60"
          style={{ left: `${Math.min(100, expected)}%` }}
          aria-hidden
        />
      </div>
    </div>
  )
}
