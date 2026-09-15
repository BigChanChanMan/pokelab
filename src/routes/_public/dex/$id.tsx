import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  FlameIcon,
  RulerIcon,
  SparklesIcon,
  WeightIcon,
} from 'lucide-react'

import { TypeBadge, TypeBadgeRow } from '@/components/type-badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ZH_NAMES } from '@/data/zh-names'
import {
  fetchEvolutionChain,
  fetchPokemon,
  fetchSpecies,
  flattenEvolution,
  pickFlavorText,
} from '@/lib/pokeapi'
import {
  matchupTable,
  multiplierLabel,
  multiplierTone,
  type PokemonType,
} from '@/lib/type-chart'
import { cn } from '@/lib/utils'

/**
 * 这是一个「真正的」TanStack Start 路由：
 * loader 在服务端执行，所以首屏 HTML 里就已经带着宝可梦数据（SSR），
 * 之后客户端路由跳转时，同一个 loader 会在浏览器里再跑一次，直接命中 PokeAPI。
 */
export const Route = createFileRoute('/_public/dex/$id')({
  loader: async ({ params }) => {
    const id = params.id

    const [pokemon, species] = await Promise.all([
      fetchPokemon(id),
      fetchSpecies(id),
    ])

    // 进化链要多跳一次请求，失败也不该让整页 500 —— 降级成空数组
    let evolution: ReturnType<typeof flattenEvolution> = []
    if (species.evolution_chain?.url) {
      try {
        const chain = await fetchEvolutionChain(species.evolution_chain.url)
        evolution = flattenEvolution(chain.chain)
      } catch {
        evolution = []
      }
    }

    return { pokemon, species, evolution }
  },
  head: ({ loaderData }) => {
    const name = loaderData
      ? ZH_NAMES[loaderData.pokemon.id]?.zh ?? loaderData.pokemon.name
      : '宝可梦'
    return {
      meta: [
        { title: `${name} — POKÉBRUTAL 图鉴` },
        {
          name: 'description',
          content: loaderData
            ? pickFlavorText(loaderData.species).slice(0, 120)
            : '宝可梦详情',
        },
      ],
    }
  },
  component: PokemonDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-4xl font-black">这只宝可梦还没被收录</h1>
      <Link
        to="/dex"
        className="mt-6 inline-block border-2 border-border bg-primary px-5 py-2 font-head shadow-md"
      >
        返回图鉴
      </Link>
    </div>
  ),
})

function PokemonDetail() {
  const { pokemon, species, evolution } = Route.useLoaderData()
  const zh = ZH_NAMES[pokemon.id]?.zh ?? pokemon.name
  const artwork =
    pokemon.sprites.other?.['official-artwork']?.front_default ??
    pokemon.sprites.front_default
  const shiny = pokemon.sprites.other?.['official-artwork']?.front_shiny
  const defenders = pokemon.types.map((t) => t.type.name) as PokemonType[]
  const matchups = matchupTable(defenders)
  const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        to="/dex"
        className="mb-6 inline-flex items-center gap-2 border-2 border-transparent px-2.5 py-1 font-head text-sm hover:border-border hover:bg-accent"
      >
        <ArrowLeftIcon className="size-4" /> 返回图鉴
      </Link>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        {/* ---------------- 左侧：形象卡 ---------------- */}
        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <span className="font-mono text-sm text-muted-foreground">
              #{String(pokemon.id).padStart(3, '0')}
            </span>
            <img
              src={artwork ?? ''}
              alt={zh}
              className="size-52 object-contain drop-shadow-[6px_6px_0_rgba(0,0,0,0.2)]"
            />
            <h1 className="text-center font-head text-3xl leading-tight">{zh}</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {pokemon.name}
              {ZH_NAMES[pokemon.id]?.ja ? ` · ${ZH_NAMES[pokemon.id].ja}` : ''}
            </p>
            <TypeBadgeRow types={defenders} className="justify-center" />

            <div className="grid w-full grid-cols-2 gap-3 pt-2">
              <Metric
                icon={<RulerIcon className="size-4" />}
                label="身高"
                value={`${(pokemon.height / 10).toFixed(1)} m`}
              />
              <Metric
                icon={<WeightIcon className="size-4" />}
                label="体重"
                value={`${(pokemon.weight / 10).toFixed(1)} kg`}
              />
              <Metric
                icon={<FlameIcon className="size-4" />}
                label="基础经验"
                value={String(pokemon.base_experience ?? '—')}
              />
              <Metric
                icon={<SparklesIcon className="size-4" />}
                label="捕获率"
                value={String(species.capture_rate)}
              />
            </div>

            {species.cries?.latest ? (
              <audio controls src={species.cries.latest} className="mt-2 w-full">
                <track kind="captions" />
              </audio>
            ) : null}

            {shiny ? (
              <details className="w-full">
                <summary className="cursor-pointer font-head text-sm">
                  看看异色（闪光）形态
                </summary>
                <img src={shiny} alt={`${zh} 异色`} className="mx-auto mt-3 size-32 object-contain" />
              </details>
            ) : null}
          </CardContent>
        </Card>

        {/* ---------------- 右侧：Tab 面板 ---------------- */}
        <div className="min-w-0">
          <Alert variant="default" className="mb-6">
            <AlertTitle>图鉴描述</AlertTitle>
            <AlertDescription>{pickFlavorText(species)}</AlertDescription>
          </Alert>

          <Tabs defaultValue="stats">
            <TabsList>
              <TabsTrigger value="stats">种族值</TabsTrigger>
              <TabsTrigger value="matchup">属性克制</TabsTrigger>
              <TabsTrigger value="evolution">进化链</TabsTrigger>
              <TabsTrigger value="raw">原始数据</TabsTrigger>
            </TabsList>

            {/* ---- 种族值 ---- */}
            <TabsContent value="stats" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>种族值（总和 {total}）</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">能力</TableHead>
                        <TableHead className="w-[80px] text-right">数值</TableHead>
                        <TableHead>相对强度</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pokemon.stats.map((s) => (
                        <TableRow key={s.stat.name}>
                          <TableCell className="font-head">{STAT_ZH[s.stat.name] ?? s.stat.name}</TableCell>
                          <TableCell className="text-right font-mono">{s.base_stat}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-4 flex-1 border-2 border-border bg-muted">
                                <div
                                  className="h-full bg-primary"
                                  style={{
                                    width: `${Math.min(100, (s.base_stat / 180) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground">
                                {Math.round((s.base_stat / 180) * 100)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-6">
                    <h3 className="mb-3 font-head text-lg">特性</h3>
                    <div className="flex flex-wrap gap-2">
                      {pokemon.abilities.map((a) => (
                        <Tooltip key={a.ability.name}>
                          <TooltipTrigger
                            render={
                              <Badge variant={a.is_hidden ? 'secondary' : 'default'}>
                                {a.ability.name}
                                {a.is_hidden ? ' (隐藏)' : ''}
                              </Badge>
                            }
                          />
                          <TooltipContent>
                            <p>{a.is_hidden ? '隐藏特性' : `特性槽 ${a.slot}`}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- 属性克制 ---- */}
            <TabsContent value="matchup" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    受到 18 种属性的伤害倍率
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      （双属性会相乘，所以能看到 4 倍和 ¼ 倍）
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {matchups.map((m) => (
                      <div
                        key={m.type}
                        className="flex items-center justify-between gap-2 border-2 border-border bg-card px-3 py-2 shadow-sm"
                      >
                        <TypeBadge type={m.type} />
                        <Badge
                          variant="outline"
                          className="h-6 font-mono"
                          style={{ backgroundColor: toneBg(m.multiplier) }}
                        >
                          {multiplierLabel(m.multiplier)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    计算逻辑位于 <code className="bg-accent px-1">src/lib/type-chart.ts</code>，
                    数据是纯静态的第六世代及以后版本克制表。
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- 进化链 ---- */}
            <TabsContent value="evolution" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>进化家族</CardTitle>
                </CardHeader>
                <CardContent>
                  {evolution.length <= 1 ? (
                    <p className="text-muted-foreground">这只宝可梦没有进化形态。</p>
                  ) : (
                    <Accordion defaultValue={[`stage-${evolution.find((e) => e.id === pokemon.id)?.stage ?? 0}`]}>
                      {groupByStage(evolution).map(([stage, nodes]) => (
                        <AccordionItem key={stage} value={`stage-${stage}`}>
                          <AccordionTrigger>
                            第 {stage + 1} 阶段 · {nodes.map((n) => ZH_NAMES[n.id]?.zh ?? n.name).join(' / ')}
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-wrap gap-4">
                              {nodes.map((n) => (
                                <Link
                                  key={`${stage}-${n.id}`}
                                  to="/dex/$id"
                                  params={{ id: String(n.id) }}
                                  className={cn(
                                    'flex w-32 flex-col items-center gap-1 border-2 border-border bg-card p-3 shadow-sm transition-transform hover:-translate-y-1',
                                    n.id === pokemon.id && 'bg-primary'
                                  )}
                                >
                                  <img
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${n.id}.png`}
                                    alt={ZH_NAMES[n.id]?.zh ?? n.name}
                                    className="size-16 object-contain"
                                    loading="lazy"
                                  />
                                  <span className="font-head text-sm">
                                    {ZH_NAMES[n.id]?.zh ?? n.name}
                                  </span>
                                  <span className="text-center text-[10px] text-muted-foreground">
                                    {n.detail}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- 原始数据 ---- */}
            <TabsContent value="raw" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>loader 返回的原始数据（截断）</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-96 overflow-auto border-2 border-border bg-secondary p-4 text-xs text-secondary-foreground">
                    <code>
                      {JSON.stringify(
                        {
                          id: pokemon.id,
                          name: pokemon.name,
                          height: pokemon.height,
                          weight: pokemon.weight,
                          types: defenders,
                          stats: Object.fromEntries(
                            pokemon.stats.map((s) => [s.stat.name, s.base_stat])
                          ),
                          genus: species.genera.find((g) => g.language.name === 'en')?.genus,
                          generation: species.generation?.name,
                          habitat: species.habitat?.name,
                          color: species.color?.name,
                        },
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

const STAT_ZH: Record<string, string> = {
  hp: 'HP',
  attack: '攻击',
  defense: '防御',
  'special-attack': '特攻',
  'special-defense': '特防',
  speed: '速度',
}

function toneBg(multiplier: number): string {
  const tone = multiplierTone(multiplier)
  if (tone === 'error') return 'var(--destructive)'
  if (tone === 'success') return '#bbf7d0'
  if (tone === 'info') return 'var(--muted)'
  return 'var(--accent)'
}

function groupByStage(
  list: { stage: number; id: number; name: string; detail: string }[]
) {
  const map = new Map<number, typeof list>()
  for (const item of list) {
    const bucket = map.get(item.stage) ?? []
    bucket.push(item)
    map.set(item.stage, bucket)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 border-2 border-border bg-muted/40 px-2 py-1.5">
      {icon}
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="font-head text-sm leading-tight">{value}</div>
      </div>
    </div>
  )
}
