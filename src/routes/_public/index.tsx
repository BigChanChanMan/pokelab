import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRightIcon, SparklesIcon, SwordsIcon, TerminalIcon } from 'lucide-react'

import { TypeBadgeRow } from '@/components/type-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { DEX, artwork } from '@/data/dex'
import { ZH_NAMES } from '@/data/zh-names'

export const Route = createFileRoute('/_public/')({ component: Home })

const FEATURED = [25, 6, 448, 143, 133, 150]

const HIGHLIGHTS = [
  {
    icon: TerminalIcon,
    title: 'Registry 协议',
    body: '21 个 neobrutalism 组件不是 npm 依赖，而是通过 shadcn Registry 协议一条命令拷进 src/components/ui/。代码归你所有，随便改。',
    to: '/guide' as const,
    cta: '看搭建手册',
  },
  {
    icon: SwordsIcon,
    title: '双属性克制计算器',
    body: '18 × 18 的属性克制表纯静态内置，双属性 4 倍 / ¼ 倍一次算清。这是本项目最「非组件」的自研部分。',
    to: '/matchup' as const,
    cta: '去算一发',
  },
  {
    icon: SparklesIcon,
    title: '组件实验室',
    body: '把装进来的 neobrutalism 组件逐个摆出来，附上它对应的 registry 安装命令，边看边抄。',
    to: '/lab' as const,
    cta: '逛实验室',
  },
]

function Home() {
  const featured = FEATURED.map((id) => DEX.find((p) => p.id === id)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p)
  )

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* ---------- Hero ---------- */}
      <section className="grid gap-8 py-12 md:grid-cols-[1.4fr_1fr] md:py-20">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="secondary" className="h-7 px-3 font-head">
            TanStack Start · shadcn Registry · Neo-brutalism
          </Badge>

          <h1 className="text-5xl leading-[0.95] font-black tracking-tight sm:text-6xl md:text-7xl">
            新粗野主义
            <br />
            宝可梦图鉴
            <span className="mt-3 block w-fit bg-primary px-2 py-1 shadow-md">
              POKÉBRUTAL
            </span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed">
            粗黑边框、硬偏移阴影、零圆角。这个项目把{' '}
            <strong className="bg-accent px-1">neobrutalism.com</strong>{' '}
            的现成组件当作乐高积木，再叠上 PokeAPI 的真实数据，拼出一个能跑、能学、能抄的小站。
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/dex"
              className="inline-flex h-11 items-center gap-2 border-2 border-border bg-primary px-6 font-head shadow-md transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              进入图鉴 <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              to="/guide"
              className="inline-flex h-11 items-center gap-2 border-2 border-border bg-transparent px-6 font-head shadow-md transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              从零搭建手册
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Stat label="收录宝可梦" value={String(DEX.length)} />
            <Stat label="已接入组件" value="21" />
            <Stat label="属性克制表" value="18 × 18" />
          </div>
        </div>

        {/* Hero 右侧：一张「组件解剖」卡片 */}
        <Card className="h-fit rotate-1 bg-card transition-transform hover:rotate-0">
          <CardHeader>
            <CardTitle className="text-2xl">这张卡片本身就是组件</CardTitle>
            <CardDescription>
              Card + CardHeader + CardContent + CardFooter，全部来自 registry。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              它之所以看起来「粗野」，靠的不是图片素材，而是 styles.css 里的一组变量：
            </p>
            <pre className="overflow-x-auto border-2 border-border bg-secondary p-3 text-xs text-secondary-foreground shadow-sm">
              <code>{`--radius: 0;
--shadow-md: 4px 4px 0 0 var(--border);
--border: #000;`}</code>
            </pre>
            <Progress value={100} />
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              改这三行，全站 21 个组件的观感一起变。
            </p>
          </CardFooter>
        </Card>
      </section>

      <Separator />

      {/* ---------- 三大看点 ---------- */}
      <section className="grid gap-6 py-14 md:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <Card key={item.title} className="flex flex-col">
            <CardHeader>
              <span className="mb-2 grid size-11 place-items-center border-2 border-border bg-primary shadow-sm">
                <item.icon className="size-5" />
              </span>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </CardContent>
            <CardFooter>
              <Link
                to={item.to}
                className="inline-flex items-center gap-2 border-2 border-border bg-transparent px-3 py-1.5 font-head text-sm shadow-sm transition-transform hover:-translate-y-0.5"
              >
                {item.cta} <ArrowRightIcon className="size-4" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </section>

      {/* ---------- 精选宝可梦 ---------- */}
      <section className="pb-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">精选六只</h2>
            <p className="mt-1 text-muted-foreground">
              数据实时取自 PokeAPI，中文名来自官方多语言表。
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link to="/dex" />}
            nativeButton={false}
          >
            全部 {DEX.length} 只 <ArrowRightIcon />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
          {featured.map((p, i) => (
            <Link key={p.id} to="/dex/$id" params={{ id: String(p.id) }} className="group">
              <Card
                className="h-full transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1"
                style={{ rotate: `${(i % 3) - 1}deg` }}
              >
                <CardContent className="flex flex-col items-center gap-3 pt-5 text-center">
                  <img
                    src={artwork(p.id)}
                    alt={ZH_NAMES[p.id]?.zh ?? p.name}
                    loading="lazy"
                    className="size-28 object-contain drop-shadow-[4px_4px_0_rgba(0,0,0,0.25)] transition-transform group-hover:scale-110"
                  />
                  <span className="font-mono text-xs text-muted-foreground">
                    #{String(p.id).padStart(3, '0')}
                  </span>
                  <CardTitle className="text-lg">{ZH_NAMES[p.id]?.zh ?? p.name}</CardTitle>
                  <TypeBadgeRow types={p.types} className="justify-center" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-border bg-card px-4 py-2 shadow-sm">
      <div className="font-head text-2xl leading-none">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
