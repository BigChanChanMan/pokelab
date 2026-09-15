import { createFileRoute } from '@tanstack/react-router'
import { RotateCcwIcon, SwordsIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { TypeBadge } from '@/components/type-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DEX } from '@/data/dex'
import { ZH_NAMES } from '@/data/zh-names'
import {
  POKEMON_TYPES,
  TYPE_LABELS,
  matchupTable,
  multiplierLabel,
  type PokemonType,
} from '@/lib/type-chart'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_public/matchup')({
  head: () => ({
    meta: [
      { title: '属性克制计算器 — POKÉBRUTAL' },
      {
        name: 'description',
        content: '选择 1~2 个属性，立刻算出 18 种攻击属性打过来的伤害倍率。',
      },
    ],
  }),
  component: MatchupPage,
})

const PRESETS: { label: string; types: PokemonType[] }[] = [
  { label: '喷火龙', types: ['fire', 'flying'] },
  { label: '暴鲤龙', types: ['water', 'flying'] },
  { label: '卡比兽', types: ['normal'] },
  { label: '路卡利欧', types: ['fighting', 'steel'] },
  { label: '烈咬陆鲨', types: ['dragon', 'ground'] },
  { label: '多龙巴鲁托', types: ['dragon', 'ghost'] },
]

function MatchupPage() {
  const [selected, setSelected] = useState<PokemonType[]>(['fire', 'flying'])

  const rows = useMemo(() => matchupTable(selected), [selected])
  const groups = useMemo(
    () => ({
      weak4: rows.filter((r) => r.multiplier === 4),
      weak2: rows.filter((r) => r.multiplier === 2),
      neutral: rows.filter((r) => r.multiplier === 1),
      resist: rows.filter((r) => r.multiplier > 0 && r.multiplier < 1),
      immune: rows.filter((r) => r.multiplier === 0),
    }),
    [rows]
  )

  function toggle(type: PokemonType) {
    setSelected((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type)
      if (prev.length >= 2) return [prev[1], type]
      return [...prev, type]
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">属性克制计算器</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          最多选两个属性。双属性时倍率相乘 —— 这就是宝可梦里「四倍弱点」的由来。
        </p>
      </header>

      {/* ---------- 选属性：18 个 Checkbox 都能点 ---------- */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择防守方的属性</CardTitle>
          <CardDescription>已选 {selected.length} / 2 —— 再点第三个会自动顶掉最早选的那个。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {POKEMON_TYPES.map((t) => {
              const active = selected.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  className={cn(
                    'flex items-center gap-2 border-2 border-border px-2 py-2 text-left shadow-sm transition-transform hover:-translate-y-0.5',
                    active ? 'bg-primary' : 'bg-card'
                  )}
                >
                  <Checkbox checked={active} className="pointer-events-none" />
                  <div className="min-w-0">
                    <div className="font-head text-sm leading-none">{TYPE_LABELS[t]}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{t}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-head text-sm">快速载入：</span>
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => setSelected(p.types)}
              >
                {p.label}
              </Button>
            ))}
            {selected.length ? (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                <RotateCcwIcon /> 清空
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {selected.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <SwordsIcon className="mr-2 inline size-5" />
              先选至少一个属性
            </CardTitle>
            <CardDescription>选完这里会列出全部 18 种攻击属性的伤害倍率。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* ---------- 结论速览 ---------- */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="弱点"
              tone="destructive"
              items={[...groups.weak4, ...groups.weak2]}
            />
            <SummaryCard title="抵抗" tone="success" items={groups.resist} />
            <SummaryCard
              title="免疫"
              tone="info"
              items={groups.immune}
              emptyHint="没有免疫任何属性"
            />
          </div>

          {/* ---------- 完整表格 ---------- */}
          <Card>
            <CardHeader>
              <CardTitle>完整倍率表</CardTitle>
              <CardDescription>
                防守方：{selected.map((t) => TYPE_LABELS[t]).join(' + ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">攻击属性</TableHead>
                    <TableHead className="w-[100px]">倍率</TableHead>
                    <TableHead>说明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.type}>
                      <TableCell>
                        <TypeBadge type={r.type} />
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {multiplierLabel(r.multiplier)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {explain(r.multiplier)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ---------- 数据来源 ---------- */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">用图鉴里的真实案例验证</CardTitle>
              <CardDescription>
                点任意一只，看它图鉴详情页的「属性克制」Tab 是否和这里算的一致。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {DEX.filter((p) => p.types.some((t) => selected.includes(t)))
                .slice(0, 12)
                .map((p) => (
                  <Badge key={p.id} variant="outline">
                    {ZH_NAMES[p.id]?.zh ?? p.name}
                  </Badge>
                ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  tone,
  items,
  emptyHint = '没有',
}: {
  title: string
  tone: 'destructive' | 'success' | 'info'
  items: { type: PokemonType; multiplier: number }[]
  emptyHint?: string
}) {
  const styles = {
    destructive: 'bg-red-300 border-red-900',
    success: 'bg-green-300 border-green-900',
    info: 'bg-blue-300 border-blue-900',
  }[tone]

  return (
    <Card className={cn('border-2', styles)}>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2 text-xl text-black">
          {title}
          <span className="font-mono text-sm">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-sm text-black/70">{emptyHint}</span>
        ) : (
          items.map((i) => (
            <TypeBadge key={i.type} type={i.type} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function explain(multiplier: number): string {
  if (multiplier === 4) return '双属性都弱，被打成筛子'
  if (multiplier === 2) return '弱点，注意换人'
  if (multiplier === 1) return '普通伤害'
  if (multiplier === 0.5) return '有点疼，但扛得住'
  if (multiplier === 0.25) return '双属性都抗，非常硬'
  if (multiplier === 0) return '完全免疫'
  return '—'
}
