import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckIcon, CopyIcon, TerminalIcon } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const Route = createFileRoute('/_public/guide')({
  head: () => ({
    meta: [
      { title: '从零搭建手册 — POKÉBRUTAL' },
      {
        name: 'description',
        content:
          '把 POKÉBRUTAL 复现一遍的完整操作步骤：脚手架、shadcn 初始化、registry 接入、主题变量、数据层、页面。',
      },
    ],
  }),
  component: GuidePage,
})

interface Step {
  n: number
  title: string
  why: string
  cmds?: string[]
  files?: { path: string; note: string }[]
  tip?: string
}

const STEPS: Step[] = [
  {
    n: 1,
    title: '创建 TanStack Start 脚手架',
    why: 'TanStack Start 是 TanStack Router 的全栈版本，自带 Vite、SSR、文件式路由和同构 loader。用官方 CLI 一条命令起项目，避免手写配置。',
    cmds: [
      'npx @tanstack/cli@latest create pokebrutal \\',
      '  --framework React \\',
      '  --package-manager pnpm \\',
      '  --no-examples \\',
      '  --no-git \\',
      '  --deployment nitro \\',
      '  --non-interactive --yes',
      'cd pokebrutal && pnpm install',
    ],
    files: [
      { path: 'vite.config.ts', note: 'tailwindcss() + tanstackStart() + viteReact() 三个插件已就位' },
      { path: 'src/router.tsx', note: '路由器实例，声明了 Register 类型供全站类型推导' },
      { path: 'src/routes/__root.tsx', note: '根路由，承载 <html> 骨架和全站 layout' },
      { path: 'tsconfig.json', note: '已内置 #/* 和 @/* 两个路径别名' },
    ],
    tip: '注意 tsconfig.json 默认已经有 "@/*": ["./src/*"]，这正是 shadcn 需要的别名 —— 很多人卡在这一步，TanStack 模板帮你省了。',
  },
  {
    n: 2,
    title: '补上 cn() 工具函数',
    why: 'shadcn / neobrutalism 的每一个组件都 import { cn } from "@/lib/utils"，用于合并 Tailwind 类名。init 之前必须先有它。',
    cmds: ['pnpm add clsx tailwind-merge'],
    files: [
      {
        path: 'src/lib/utils.ts',
        note: 'cn = twMerge(clsx(...))，负责「后写的类覆盖先写的」',
      },
    ],
    tip: 'clsx 负责条件拼接，tailwind-merge 负责消解冲突（例如同时出现 p-2 和 p-4 时保留后者）。两者缺一不可。',
  },
  {
    n: 3,
    title: '手写 components.json（等价于 shadcn init）',
    why: 'components.json 是 shadcn CLI 的「项目说明书」：它告诉 CLI 你的别名在哪、CSS 文件在哪、有哪些第三方 registry 可装。沙盒环境里 init 是交互式的，这里手写一份，顺便把每个字段讲清楚。',
    files: [
      { path: 'components.json', note: '见下方逐字段讲解' },
    ],
    tip: '如果你在本地有 TTY，直接跑 npx shadcn@latest init --template start --base radix --css-variables 也能得到同样的文件。',
  },
  {
    n: 4,
    title: '把 neobrutalism 注册为命名空间',
    why: 'neobrutalism.com 不是一个 npm 包，而是一个符合 shadcn registry 协议的 JSON 端点。在 components.json 的 registries 字段里登记别名后，就能用 @neobrutalism-base/button 这样的简写安装。',
    files: [
      {
        path: 'components.json → registries',
        note: '"@neobrutalism": "https://neobrutalism.com/r/radix/{name}.json"',
      },
    ],
    tip: 'radix 变体和 base 变体只是底层无头库不同。本项目统一用 base（@base-ui/react），因为 neobrutalism 2.x 的新组件优先适配它。',
  },
  {
    n: 5,
    title: '写入主题 CSS 变量',
    why: 'neobrutalism 的全部「粗野感」来自一组 CSS 变量：--radius: 0 干掉圆角，--shadow-* 定义硬偏移阴影，--border: #000 定死黑边框。',
    files: [
      { path: 'src/styles.css', note: '@theme inline 映射 + :root/.dark 变量 + @utility bg-grid' },
    ],
    tip: '本站在官方变量基础上扩展了 --type-* 系列，给 18 种宝可梦属性各配一个颜色。这就是「可复制、可修改」的体现。',
  },
  {
    n: 6,
    title: '批量安装组件',
    why: '一条命令装 21 个组件。shadcn CLI 会自动解析每个 registry item 的 dependencies 与 registryDependencies（例如 dialog 会自动带上 button），并把 .tsx 源码写进 src/components/ui/。',
    cmds: [
      'npx shadcn@latest add \\',
      '  @neobrutalism-base/button @neobrutalism-base/card \\',
      '  @neobrutalism-base/input @neobrutalism-base/label \\',
      '  @neobrutalism-base/badge @neobrutalism-base/alert \\',
      '  @neobrutalism-base/select @neobrutalism-base/dialog \\',
      '  @neobrutalism-base/table @neobrutalism-base/tabs \\',
      '  @neobrutalism-base/switch @neobrutalism-base/progress \\',
      '  @neobrutalism-base/accordion @neobrutalism-base/avatar \\',
      '  @neobrutalism-base/tooltip @neobrutalism-base/checkbox \\',
      '  @neobrutalism-base/separator @neobrutalism-base/skeleton \\',
      '  @neobrutalism-base/textarea @neobrutalism-base/popover \\',
      '  @neobrutalism-base/dropdown-menu \\',
      '  --yes',
    ],
    tip: '先跑 --dry-run 看会动哪些文件，心里有底再真跑。',
  },
  {
    n: 7,
    title: '准备宝可梦数据',
    why: 'PokeAPI 提供中文名，但不在主接口里 —— 要走 pokemon-species 的 names 数组。为了首屏不抖，用一次性脚本把这 168 只的中文名抓成静态 TS 模块。',
    cmds: ['node scripts/fetch-zh-names.mjs', 'node scripts/fetch-dex.mjs'],
    files: [
      { path: 'scripts/fetch-zh-names.mjs', note: '抓 pokemon-species/{id} 的 zh-hans 名字' },
      { path: 'scripts/fetch-dex.mjs', note: '抓属性/种族值/身高体重，生成图鉴快照' },
      { path: 'src/data/zh-names.ts', note: '168 条 { zh, en, ja }' },
      { path: 'src/data/dex.ts', note: '168 条图鉴条目 + artwork() 等工具函数' },
    ],
    tip: '为什么不全走运行时请求？因为列表页要本地搜索和排序，静态数据才能做到零延迟。详情页再走 loader 实时抓 PokeAPI —— 两种数据策略各有各的用处。',
  },
  {
    n: 8,
    title: '写属性克制表',
    why: '这是全站唯一的「业务逻辑」，18 × 18 的克制关系。写成静态常量表后，双属性倍率相乘就能得到 4 倍 / ¼ 倍的经典结果。',
    files: [
      { path: 'src/lib/type-chart.ts', note: 'TYPE_CHART + effectivenessAgainst() + matchupTable()' },
    ],
  },
  {
    n: 9,
    title: '封装 PokeAPI 访问层',
    why: '详情页的 loader 是服务端执行、客户端导航时也会执行的同构函数，所以这一层只能用全局 fetch，不能碰 window。',
    files: [
      { path: 'src/lib/pokeapi.ts', note: 'fetchPokemon / fetchSpecies / fetchEvolutionChain + 类型定义' },
    ],
    tip: 'loader 里对进化链的请求做了 try/catch 降级 —— 不能让一个可选接口拖垮整页 SSR。',
  },
  {
    n: 10,
    title: '搭页面',
    why: '把组件和数据拼起来。注意文件式路由的目录约定：dex/index.tsx 是 /dex，dex/$id.tsx 是 /dex/:id，两者通过目录形成父子嵌套。',
    files: [
      { path: 'src/routes/__root.tsx', note: '全站 Layout + 字体 + TooltipProvider' },
      { path: 'src/routes/index.tsx', note: '首页：Hero + 三大看点 + 精选六只' },
      { path: 'src/routes/dex/index.tsx', note: '图鉴列表：搜索 / 属性筛选 / 排序' },
      { path: 'src/routes/dex/$id.tsx', note: '详情页：loader + 四个 Tab' },
      { path: 'src/routes/matchup.tsx', note: '属性克制计算器' },
      { path: 'src/routes/lab.tsx', note: '组件实验室：21 个组件实况' },
    ],
  },
  {
    n: 11,
    title: '构建与验证',
    why: 'TypeScript 严格模式 + vite build，一次性把类型和打包问题都暴露出来。',
    cmds: ['pnpm build', 'pnpm dev'],
    tip: 'TanStack Start 的 loader 返回类型会自动推导到 useLoaderData()，写错字段名编译期就报错。',
  },
]

const COMPONENTS_JSON_FIELDS: { field: string; desc: string }[] = [
  { field: '$schema', desc: 'JSON Schema 地址，编辑器靠它做补全和校验' },
  { field: 'style', desc: '组件风格。new-york 或 default，影响生成组件的默认样式取向' },
  { field: 'rsc', desc: '是否 React Server Components 项目。TanStack Start 不是 RSC，填 false' },
  { field: 'tsx', desc: '是否用 TSX。false 会生成 .jsx' },
  { field: 'tailwind.config', desc: 'Tailwind v4 不需要配置文件，留空字符串' },
  { field: 'tailwind.css', desc: '你的全局 CSS 入口，本例是 src/styles.css。CSS 变量会被写进这里' },
  { field: 'tailwind.baseColor', desc: '新建项目时的基础色板名' },
  { field: 'tailwind.cssVariables', desc: '是否用 CSS 变量做主题。neobrutalism 必须为 true' },
  { field: 'tailwind.prefix', desc: 'Tailwind 类名前缀，一般留空' },
  { field: 'aliases.components', desc: '组件目录别名，@/components' },
  { field: 'aliases.utils', desc: '工具函数别名，@/lib/utils —— cn() 就从这里导入' },
  { field: 'aliases.ui', desc: 'UI 基元目录别名，@/components/ui' },
  { field: 'aliases.lib', desc: 'lib 目录别名' },
  { field: 'aliases.hooks', desc: 'hooks 目录别名' },
  { field: 'iconLibrary', desc: '图标库。neobrutalism 的组件依赖 lucide-react' },
  { field: 'registries', desc: '第三方 registry 命名空间映射，本项目登记了 @neobrutalism 和 @neobrutalism-base' },
]

const REGISTRY_TYPES: { type: string; desc: string }[] = [
  { type: 'registry:ui', desc: 'UI 基元组件，写到 components/ui/。本项目装的 21 个全是这个类型' },
  { type: 'registry:component', desc: '业务组件，写到 components/' },
  { type: 'registry:block', desc: '由多个组件拼成的完整区块，可含页面级布局' },
  { type: 'registry:lib', desc: '工具函数/库代码，例如 utils.ts' },
  { type: 'registry:hook', desc: 'React Hook' },
  { type: 'registry:theme', desc: '整套主题（CSS 变量）' },
  { type: 'registry:page', desc: '完整页面' },
  { type: 'registry:file', desc: '任意文件，靠 target 指定落点' },
  { type: 'registry:style', desc: '样式预设' },
  { type: 'registry:example', desc: '示例代码，通常只用于文档展示' },
]

function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <Badge variant="secondary" className="mb-3 h-7 px-3 font-head">
          共 {STEPS.length} 步 · 预计 30 分钟
        </Badge>
        <h1 className="text-4xl leading-tight font-black tracking-tight sm:text-5xl">
          从零搭建手册
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          下面每一步都是这个项目真实走过的操作。按顺序复制命令 + 建文件，你就能得到一份几乎一样的工程。
          每一步都写了「为什么这么做」—— 这比命令本身更重要。
        </p>
      </header>

      <ol className="space-y-6">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center border-2 border-border bg-primary font-head text-lg shadow-sm">
                    {step.n}
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    <CardDescription className="mt-1 leading-relaxed">
                      {step.why}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              {(step.cmds || step.files) && (
                <CardContent className="space-y-4">
                  {step.cmds ? <CodeBlock lines={step.cmds} /> : null}

                  {step.files ? (
                    <ul className="space-y-2">
                      {step.files.map((f) => (
                        <li key={f.path} className="flex items-start gap-2 text-sm">
                          <CheckIcon className="mt-0.5 size-4 shrink-0" />
                          <span>
                            <code className="border-2 border-border bg-accent px-1.5 py-0.5 font-mono text-xs">
                              {f.path}
                            </code>
                            <span className="ml-2 text-muted-foreground">{f.note}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {step.tip ? (
                    <div className="border-2 border-border bg-muted/50 px-3 py-2 text-sm">
                      <span className="font-head">提示：</span>
                      {step.tip}
                    </div>
                  ) : null}
                </CardContent>
              )}
            </Card>
          </li>
        ))}
      </ol>

      <Separator className="my-10" />

      {/* ---------- 参考：components.json 逐字段 ---------- */}
      <section className="space-y-6">
        <h2 className="text-3xl font-black">参考资料 A：components.json 逐字段</h2>
        <Card>
          <CardContent className="pt-6">
            <dl className="divide-y-2 divide-border">
              {COMPONENTS_JSON_FIELDS.map((f) => (
                <div key={f.field} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
                  <dt>
                    <code className="font-mono text-sm font-bold">{f.field}</code>
                  </dt>
                  <dd className="text-sm text-muted-foreground">{f.desc}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-10" />

      {/* ---------- 参考：registry 协议 ---------- */}
      <section className="space-y-6">
        <h2 className="text-3xl font-black">参考资料 B：Registry 协议</h2>
        <p className="text-muted-foreground">
          shadcn 的 registry 协议本质上就是「约定好格式的 JSON 文件 + 一个 HTTP 端点」。
          官方组件、第三方组件（比如 neobrutalism）都遵循同一套格式，所以 CLI 能用同一套逻辑安装它们。
        </p>

        <Tabs defaultValue="item">
          <TabsList>
            <TabsTrigger value="item">registry-item.json</TabsTrigger>
            <TabsTrigger value="types">item type 取值</TabsTrigger>
            <TabsTrigger value="host">自己托管一个 registry</TabsTrigger>
          </TabsList>

          <TabsContent value="item" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">一个 registry item 长什么样</CardTitle>
                <CardDescription>
                  这是 neobrutalism 的 button.json 去掉 content 后的骨架。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  lines={[
                    '{',
                    '  "name": "button",',
                    '  "type": "registry:ui",',
                    '  "dependencies": ["@base-ui/react", "class-variance-authority"],',
                    '  "registryDependencies": ["button"],',
                    '  "files": [',
                    '    {',
                    '      "path": "button.tsx",',
                    '      "type": "registry:ui",',
                    '      "target": "components/ui/button.tsx",',
                    '      "content": "import { Button as ButtonPrimitive } from \\"@base-ui/react/button\\"..."',
                    '    }',
                    '  ]',
                    '}',
                  ]}
                />
                <dl className="mt-5 divide-y-2 divide-border">
                  {[
                    ['name', '组件标识，也是 CLI 里 @namespace/ 后面那一段'],
                    ['type', '决定目标目录与语义，见下一个 Tab'],
                    ['dependencies', 'npm 包依赖，CLI 会自动装。这里是 Base UI 和 cva'],
                    ['registryDependencies', '依赖的其他 registry 组件。dialog 依赖 button，CLI 会连带装上'],
                    ['files[].path', 'registry 内部的源文件名'],
                    ['files[].target', '写到你项目里的目标路径，相对 components.json 的别名解析'],
                    ['files[].content', '源码正文。这就是「拷贝源码」模式的物理实现'],
                    ['cssVars', '（可选）该组件需要的 CSS 变量，会合并进你的 styles.css'],
                    ['css', '（可选）该组件需要的额外 CSS 规则'],
                    ['envVars', '（可选）需要的环境变量声明'],
                  ].map(([k, v]) => (
                    <div key={k} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
                      <dt>
                        <code className="font-mono text-sm font-bold">{k}</code>
                      </dt>
                      <dd className="text-sm text-muted-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="types" className="pt-4">
            <Card>
              <CardContent className="pt-6">
                <dl className="divide-y-2 divide-border">
                  {REGISTRY_TYPES.map((t) => (
                    <div key={t.type} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
                      <dt>
                        <code className="font-mono text-sm font-bold">{t.type}</code>
                      </dt>
                      <dd className="text-sm text-muted-foreground">{t.desc}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="host" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">托管自己的 registry</CardTitle>
                <CardDescription>
                  协议只要求「一个能返回 JSON 的 URL」，所以任何静态托管都能当 registry。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CodeBlock
                  lines={[
                    '# 1. 写 registry.json，声明这个 registry 里有哪些 item',
                    '{',
                    '  "$schema": "https://ui.shadcn.com/schema/registry.json",',
                    '  "name": "my-design-system",',
                    '  "homepage": "https://example.com",',
                    '  "items": [ { "name": "my-button", "type": "registry:ui", "files": [...] } ]',
                    '}',
                    '',
                    '# 2. 构建成 CLI 能消费的静态 JSON',
                    'npx shadcn@latest build',
                    '',
                    '# 3. 部署 public/r/ 目录，然后别人就能这样装你的组件',
                    'npx shadcn@latest add https://example.com/r/my-button.json',
                  ]}
                />
                <p className="text-sm text-muted-foreground">
                  neobrutalism.com 就是这么做的：它的{' '}
                  <code className="bg-accent px-1">/r/registry.json</code> 列出了全部 54 个
                  item，每个 item 又有自己的{' '}
                  <code className="bg-accent px-1">/r/base/&#123;name&#125;.json</code>。
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Separator className="my-10" />

      {/* ---------- 参考：shadcn CLI 命令 ---------- */}
      <section className="space-y-6">
        <h2 className="text-3xl font-black">参考资料 C：shadcn CLI 速查</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TerminalIcon className="size-5" /> 常用命令
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <CliRow
              cmd="npx shadcn@latest init --template start --base radix --css-variables"
              desc="初始化项目：生成 components.json、写入 CSS 变量、安装基础依赖。--template 指定框架，--base 指定底层无头库。"
            />
            <CliRow
              cmd="npx shadcn@latest add @neobrutalism-base/button"
              desc="安装组件。接受命名空间简写，也接受完整 URL。"
            />
            <CliRow
              cmd="npx shadcn@latest add https://neobrutalism.com/r/base/button.json"
              desc="用完整 URL 安装（不配置 registries 别名时用这个）。"
            />
            <CliRow
              cmd="npx shadcn@latest add button --dry-run"
              desc="预演：只打印会创建/修改哪些文件和依赖，不落盘。"
            />
            <CliRow
              cmd="npx shadcn@latest add card --overwrite"
              desc="覆盖已存在的文件。上游组件更新后想同步时用。"
            />
            <CliRow
              cmd="npx shadcn@latest add card --diff"
              desc="对比本地已有组件与 registry 最新版本的差异。"
            />
            <CliRow
              cmd="npx shadcn@latest view @neobrutalism-base/dialog"
              desc="在终端直接查看组件源码，不安装。"
            />
            <CliRow
              cmd="npx shadcn@latest search @neobrutalism"
              desc="在某个 registry 内搜索组件。"
            />
            <CliRow
              cmd="npx shadcn@latest build"
              desc="把你的 registry.json 构建成可托管的静态 JSON（自建 design system 时用）。"
            />
            <CliRow
              cmd="npx shadcn@latest mcp init"
              desc="把 shadcn 注册为 MCP 服务器，让 AI 编辑器能直接查组件源码。"
            />
          </CardContent>
        </Card>
      </section>

      <Separator className="my-10" />

      <div className="flex flex-wrap gap-3">
        <Link
          to="/lab"
          className="inline-flex items-center border-2 border-border bg-primary px-5 py-2 font-head shadow-md transition-transform hover:-translate-y-0.5"
        >
          去组件实验室看效果
        </Link>
        <Link
          to="/dex"
          className="inline-flex items-center border-2 border-border bg-transparent px-5 py-2 font-head shadow-md transition-transform hover:-translate-y-0.5"
        >
          去图鉴实际用一用
        </Link>
      </div>
    </div>
  )
}

function CliRow({ cmd, desc }: { cmd: string; desc: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="grid gap-2 border-b-2 border-border pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[1fr_1.1fr] sm:gap-6">
      <div className="group relative">
        <code className="block overflow-x-auto border-2 border-border bg-secondary px-3 py-2 font-mono text-xs whitespace-pre text-secondary-foreground">
          {cmd}
        </code>
        <button
          type="button"
          aria-label="复制"
          className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={async () => {
            await navigator.clipboard.writeText(cmd)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? (
            <CheckIcon className="size-4 text-secondary-foreground" />
          ) : (
            <CopyIcon className="size-4 text-secondary-foreground" />
          )}
        </button>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

function CodeBlock({ lines }: { lines: string[] }) {
  const [copied, setCopied] = useState(false)
  const text = lines.join('\n')
  return (
    <div className="group relative">
      <pre className="overflow-x-auto border-2 border-border bg-secondary p-3 font-mono text-xs leading-relaxed text-secondary-foreground">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        aria-label="复制代码"
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={async () => {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
      >
        {copied ? (
          <CheckIcon className="size-4 text-secondary-foreground" />
        ) : (
          <CopyIcon className="size-4 text-secondary-foreground" />
        )}
      </button>
    </div>
  )
}
