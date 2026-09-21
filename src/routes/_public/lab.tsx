import { createFileRoute, Link } from '@tanstack/react-router'
import { CheckIcon, CopyIcon, ExternalLinkIcon, InfoIcon } from 'lucide-react'
import { useState } from 'react'

import { TypeBadgeRow } from '@/components/type-badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DEX, artwork, statTotal } from '@/data/dex'
import { ZH_NAMES } from '@/data/zh-names'
import { TYPE_LABELS, type PokemonType } from '@/lib/type-chart'

export const Route = createFileRoute('/_public/lab')({
  head: () => ({
    meta: [
      { title: '组件实验室 — POKÉBRUTAL' },
      { name: 'description', content: '21 个 neobrutalism 组件的实况演示与安装命令。' },
    ],
  }),
  component: LabPage,
})

/** 实验室里展示的组件清单：名称 -> 安装命令 */
const SPECIMENS = [
  { name: 'accordion', label: '折叠面板' },
  { name: 'alert', label: '警告条' },
  { name: 'avatar', label: '头像' },
  { name: 'badge', label: '徽章' },
  { name: 'button', label: '按钮' },
  { name: 'card', label: '卡片' },
  { name: 'checkbox', label: '复选框' },
  { name: 'dialog', label: '对话框' },
  { name: 'dropdown-menu', label: '下拉菜单' },
  { name: 'input', label: '输入框' },
  { name: 'label', label: '表单标签' },
  { name: 'popover', label: '弹出层' },
  { name: 'progress', label: '进度条' },
  { name: 'select', label: '选择器' },
  { name: 'separator', label: '分隔线' },
  { name: 'skeleton', label: '骨架屏' },
  { name: 'switch', label: '开关' },
  { name: 'table', label: '表格' },
  { name: 'tabs', label: '选项卡' },
  { name: 'textarea', label: '多行输入' },
  { name: 'tooltip', label: '工具提示' },
] as const

function installCmd(name: string): string {
  return `npx shadcn@latest add @neobrutalism-base/${name}`
}

function LabPage() {
  const [checked, setChecked] = useState(true)
  const [switched, setSwitched] = useState(true)
  const [progress, setProgress] = useState(35)
  const [theme, setTheme] = useState('fire')
  const [note, setNote] = useState('这只卡比兽今天心情不错。')

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">组件实验室</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          下面这 {SPECIMENS.length}{' '}
          个组件全部来自 neobrutalism.com 的 registry，没有一个是手写的 UI 基元。
          每个展台都附带它对应的安装命令 —— 这就是「registry 协议」的威力：
          一条命令把源码搬进你的仓库，之后它就是你的代码。
        </p>
      </header>

      <Specimen id="button" label="按钮 Button" hint="variant × size 双轴，共 6 × 8 = 48 种组合">
        <div className="flex flex-wrap items-center gap-3">
          <Button>默认</Button>
          <Button variant="secondary">次要</Button>
          <Button variant="outline">描边</Button>
          <Button variant="destructive">危险</Button>
          <Button variant="ghost">幽灵</Button>
          <Button variant="link">链接</Button>
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button size="lg">lg</Button>
          <Button size="icon" aria-label="图标按钮">
            ⚡
          </Button>
        </div>
      </Specimen>

      <Specimen id="badge" label="徽章 Badge" hint="本项目用它渲染 18 种宝可梦属性">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>默认</Badge>
          <Badge variant="secondary">次要</Badge>
          <Badge variant="outline">描边</Badge>
          <Badge variant="destructive">危险</Badge>
          <Badge variant="ghost">幽灵</Badge>
          <Badge variant="link">链接</Badge>
        </div>
        <Separator className="my-4" />
        <TypeBadgeRow types={['fire', 'flying', 'dragon', 'bug', 'ice', 'ghost']} />
      </Specimen>

      <Specimen id="alert" label="警告条 Alert" hint="status 轴是 neobrutalism 的扩展：error / success / warning / info">
        <div className="grid gap-3">
          <Alert status="info">
            <InfoIcon />
            <AlertTitle>信息</AlertTitle>
            <AlertDescription>PokeAPI 是免费公开接口，不需要 API Key。</AlertDescription>
          </Alert>
          <Alert status="success">
            <CheckIcon />
            <AlertTitle>成功</AlertTitle>
            <AlertDescription>21 个组件已写入 src/components/ui/。</AlertDescription>
          </Alert>
          <Alert status="warning">
            <InfoIcon />
            <AlertTitle>注意</AlertTitle>
            <AlertDescription>
              Tailwind v4 把按钮的 cursor 改成了 default，neobrutalism 建议手动加回 pointer。
            </AlertDescription>
          </Alert>
          <Alert status="error">
            <InfoIcon />
            <AlertTitle>出错</AlertTitle>
            <AlertDescription>PokeAPI 偶发 429，生产环境建议加一层缓存。</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm">
                重试
              </Button>
            </AlertAction>
          </Alert>
        </div>
      </Specimen>

      <Specimen id="card" label="卡片 Card" hint="7 个子组件：Header / Title / Description / Action / Content / Footer">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>皮卡丘</CardTitle>
              <CardDescription>鼠宝可梦</CardDescription>
              <CardAction>
                <Badge variant="outline">#025</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <img src={artwork(25)} alt="皮卡丘" className="mx-auto size-28 object-contain" />
            </CardContent>
            <CardFooter>
              <Button size="sm" className="w-full">
                查看详情
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>加载中</CardTitle>
              <CardDescription>骨架屏 + 进度条的组合</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="size-24" />
              <Progress value={progress} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.max(0, p - 20))}>
                  -20
                </Button>
                <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.min(100, p + 20))}>
                  +20
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Specimen>

      <Specimen id="input" label="表单控件群 Input / Label / Textarea / Checkbox / Switch / Select">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lab-trainer">训练家名字</Label>
              <Input id="lab-trainer" placeholder="小智" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab-note">备注</Label>
              <Textarea
                id="lab-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="写点什么…"
              />
              <p className="text-xs text-muted-foreground">已输入 {note.length} 个字符</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>初始伙伴</Label>
              <Select value={theme} onValueChange={(v) => setTheme(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(['fire', 'water', 'grass', 'electric'] as PokemonType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}属性
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="lab-check"
                checked={checked}
                onCheckedChange={(v) => setChecked(Boolean(v))}
              />
              <Label htmlFor="lab-check">我同意捕捉这只宝可梦</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch id="lab-switch" checked={switched} onCheckedChange={setSwitched} />
              <Label htmlFor="lab-switch">开启双属性克制计算</Label>
            </div>
          </div>
        </div>
      </Specimen>

      <Specimen id="table" label="表格 Table" hint="图鉴详情页的种族值就是用它渲染的">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">编号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>属性</TableHead>
              <TableHead className="text-right">种族值总和</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[25, 6, 143, 150].map((id) => {
              const p = DEX.find((x) => x.id === id)
              if (!p) return null
              return (
                <TableRow key={id}>
                  <TableCell className="font-mono">
                    #{String(id).padStart(3, '0')}
                  </TableCell>
                  <TableCell className="font-head">{ZH_NAMES[id]?.zh ?? p.name}</TableCell>
                  <TableCell>
                    <TypeBadgeRow types={p.types} />
                  </TableCell>
                  <TableCell className="text-right font-mono">{statTotal(p)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Specimen>

      <Specimen id="tabs" label="选项卡 Tabs">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">草属性</TabsTrigger>
            <TabsTrigger value="b">火属性</TabsTrigger>
            <TabsTrigger value="c">水属性</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="pt-3">
            <p className="text-sm">草属性弱火、冰、毒、飞行、虫。妙蛙种子就属于这一类。</p>
          </TabsContent>
          <TabsContent value="b" className="pt-3">
            <p className="text-sm">火属性弱水、地面、岩石。小火龙的开局通常比较难。</p>
          </TabsContent>
          <TabsContent value="c" className="pt-3">
            <p className="text-sm">水属性只弱草和电。杰尼龟是三者里最稳的开局。</p>
          </TabsContent>
        </Tabs>
      </Specimen>

      <Specimen id="accordion" label="折叠面板 Accordion">
        <Accordion defaultValue={['q1']}>
          <AccordionItem value="q1">
            <AccordionTrigger>为什么选择 neobrutalism？</AccordionTrigger>
            <AccordionContent>
              因为它把「设计系统」压缩成了一组 CSS 变量。硬阴影、零圆角、粗黑边框，
              改三个变量全站生效 —— 对学习项目来说，改造成本极低。
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>组件是 npm 依赖吗？</AccordionTrigger>
            <AccordionContent>
              不是。shadcn CLI 通过 registry 协议把 .tsx 源码直接写进你的仓库，
              所以你可以为所欲为地改它们，而不用担心上游升级冲突。
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="q3">
            <AccordionTrigger>Base UI 和 Radix 版本有什么区别？</AccordionTrigger>
            <AccordionContent>
              底层无头组件库不同，对外 API 略有差异（例如 Base UI 用 render prop，
              Radix 用 asChild）。本项目统一选用 Base UI 变体。
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Specimen>

      <Specimen id="overlays" label="浮层三件套 Dialog / DropdownMenu / Popover / Tooltip">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>打开对话框</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>要放生这只宝可梦吗？</DialogTitle>
                <DialogDescription>
                  这个操作不可撤销。它会永远离开你的队伍，回到野外。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button variant="destructive">确认放生</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              打开下拉菜单
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {/* Label 是 MenuPrimitive.GroupLabel，必须包在 Group 里 */}
              <DropdownMenuGroup>
                <DropdownMenuLabel>队伍操作</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem>查看详情</DropdownMenuItem>
              <DropdownMenuItem>加入队伍</DropdownMenuItem>
              <DropdownMenuItem>设为队长</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">放生</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>打开弹出层</PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>关于这只宝可梦</PopoverTitle>
                <PopoverDescription>
                  弹出层适合放表单或富内容；Tooltip 只适合放一句提示。
                </PopoverDescription>
              </PopoverHeader>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" />}>悬停看提示</TooltipTrigger>
            <TooltipContent>
              <p>这是 Tooltip，只能放纯文本</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </Specimen>

      <Specimen id="avatar" label="头像 Avatar">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar>
            <AvatarImage src={artwork(25)} alt="皮卡丘" />
            <AvatarFallback>皮</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src={artwork(6)} alt="喷火龙" />
            <AvatarFallback>喷</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>？</AvatarFallback>
          </Avatar>
        </div>
      </Specimen>

      <Specimen id="separator" label="分隔线 Separator">
        <p className="text-sm">上面一段内容</p>
        <Separator className="my-4" />
        <p className="text-sm">下面一段内容</p>
        <div className="mt-4 flex h-10 items-center gap-4">
          <span className="text-sm">左</span>
          <Separator orientation="vertical" />
          <span className="text-sm">右</span>
        </div>
      </Specimen>

      {/* ---------- 安装命令总表 ---------- */}
      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="text-2xl">全部安装命令</CardTitle>
          <CardDescription>
            一条都不能少 —— 本项目用到的 {SPECIMENS.length} 个组件，逐行复制即可复现。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {SPECIMENS.map((s) => (
            <InstallRow key={s.name} name={s.name} label={s.label} />
          ))}
        </CardContent>
        <CardFooter>
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 border-2 border-border bg-transparent px-3 py-1.5 font-head text-sm shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <ExternalLinkIcon className="size-4" /> 去搭建手册看完整流程
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

function Specimen({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8 border-2 border-border bg-card shadow-md">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-border bg-muted/50 px-4 py-3">
        <h2 className="font-head text-lg">{label}</h2>
        <code className="font-mono text-xs text-muted-foreground">
          @neobrutalism-base/{id}
        </code>
        {hint ? (
          <span className="ml-auto text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function InstallRow({ name, label }: { name: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const cmd = installCmd(name)

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex items-center gap-3 border-2 border-border bg-muted/30 px-3 py-2">
      <span className="w-28 shrink-0 font-head text-sm">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{cmd}</code>
      <Button
        variant={copied ? 'default' : 'outline'}
        size="icon-sm"
        onClick={copy}
        aria-label="复制命令"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  )
}
