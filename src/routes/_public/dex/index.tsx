import { createFileRoute, Link } from '@tanstack/react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { TypeBadgeRow } from '@/components/type-badge'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DEX, artwork, statTotal, type DexEntry } from '@/data/dex'
import { ZH_NAMES } from '@/data/zh-names'
import { POKEMON_TYPES, TYPE_LABELS, type PokemonType } from '@/lib/type-chart'

export const Route = createFileRoute('/_public/dex/')({ component: DexPage })

const SORT_OPTIONS = [
  { value: 'id', label: '图鉴编号' },
  { value: 'total', label: '种族值总和' },
  { value: 'attack', label: '攻击' },
  { value: 'speed', label: '速度' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['value']

function DexPage() {
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<PokemonType | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('id')
  const [legendaryOnly, setLegendaryOnly] = useState(false)

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const list = DEX.filter((p) => {
      const zh = ZH_NAMES[p.id]?.zh ?? ''
      const matchKeyword =
        !kw ||
        zh.includes(kw) ||
        p.name.toLowerCase().includes(kw) ||
        String(p.id) === kw ||
        String(p.id).padStart(3, '0') === kw
      const matchType = type === 'all' || p.types.includes(type)
      return matchKeyword && matchType
    })

    const sorted = [...list]
    if (sort === 'total') sorted.sort((a, b) => statTotal(b) - statTotal(a))
    else if (sort === 'attack') sorted.sort((a, b) => b.stats[1] - a.stats[1])
    else if (sort === 'speed') sorted.sort((a, b) => b.stats[5] - a.stats[5])
    else sorted.sort((a, b) => a.id - b.id)
    return sorted
  }, [keyword, type, sort])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">宝可梦图鉴</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          共 {DEX.length} 只，覆盖第一世代全 151 只 + 每世代的御三家、人气异兽与传说宝可梦。
          数据在产品构建阶段由 <code className="bg-accent px-1">scripts/fetch-dex.mjs</code> 抓取成静态快照。
        </p>
      </header>

      {/* ---------- 筛选栏：Input / Select / Switch 三个 registry 组件 ---------- */}
      <Card className="mb-8">
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <label className="font-head text-sm" htmlFor="dex-search">
              搜索
            </label>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dex-search"
                placeholder="输入中文名 / 英文名 / 编号，如 皮卡丘、pikachu、25"
                className="pl-9"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              {keyword ? (
                <button
                  type="button"
                  aria-label="清空搜索"
                  className="absolute top-1/2 right-3 -translate-y-1/2"
                  onClick={() => setKeyword('')}
                >
                  <XIcon className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-head text-sm">属性</label>
            <Select value={type} onValueChange={(v) => setType(v as PokemonType | 'all')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">全部属性</SelectItem>
                  {POKEMON_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="font-head text-sm">排序</label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 border-2 border-border bg-muted/40 px-3 py-2">
            <Switch
              id="legendary-only"
              checked={legendaryOnly}
              onCheckedChange={setLegendaryOnly}
            />
            <label htmlFor="legendary-only" className="font-head text-sm whitespace-nowrap">
              只看传说
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center gap-3">
        <Badge variant="secondary">{filtered.length} 个结果</Badge>
        {type !== 'all' ? <Badge variant="outline">{TYPE_LABELS[type]}</Badge> : null}
        {keyword ? <Badge variant="outline">“{keyword}”</Badge> : null}
      </div>

      {/* ---------- 结果网格 ---------- */}
      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>没有匹配的宝可梦</CardTitle>
            <CardDescription>换个关键词，或者把属性筛选调回「全部属性」。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <DexCard key={p.id} entry={p} dimmed={legendaryOnly && statTotal(p) < 580} />
          ))}
        </div>
      )}
    </div>
  )
}

function DexCard({ entry, dimmed }: { entry: DexEntry; dimmed: boolean }) {
  const zh = ZH_NAMES[entry.id]?.zh ?? entry.name
  const total = statTotal(entry)

  return (
    <Link
      to="/dex/$id"
      params={{ id: String(entry.id) }}
      className="group block h-full"
      style={{ opacity: dimmed ? 0.45 : 1 }}
    >
      <Card className="h-full gap-3 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1">
        <CardContent className="flex flex-col items-center gap-2 text-center">
          <img
            src={artwork(entry.id)}
            alt={zh}
            loading="lazy"
            className="size-24 object-contain transition-transform group-hover:scale-110"
          />
          <span className="font-mono text-[11px] text-muted-foreground">
            #{String(entry.id).padStart(3, '0')}
          </span>
          <CardTitle className="text-base leading-tight">{zh}</CardTitle>
          <TypeBadgeRow types={entry.types} className="justify-center" />
          <div className="mt-1 flex w-full items-center justify-between border-t-2 border-border pt-2 text-[11px]">
            <span className="text-muted-foreground">种族值</span>
            <span className="font-head">{total}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
