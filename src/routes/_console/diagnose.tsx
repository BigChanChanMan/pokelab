import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  GaugeIcon,
  LayersIcon,
  ShieldAlertIcon,
} from 'lucide-react'
import { useState } from 'react'

import { FeaturePage } from '@/components/feature-page'
import { TypeBadge } from '@/components/type-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { can } from '@/lib/capabilities'
import { ROLE_LABEL, type Diagnosis } from '@/lib/diagnose'
import { MAX_MEMBERS, type Team } from '@/lib/team'
import { diagnoseTeam, listTeams } from '@/server/teams'

/**
 * 队伍诊断 —— 第一个 VIP 功能。
 *
 * 为什么是它：输出**不可由人一眼算出**。6 只双属性宝可梦 × 18 个攻击属性
 * = 216 次倍率乘法，人脑算不动。一个「VIP 才能看」但内容平淡的功能，
 * 演示不出任何东西。
 *
 * ⚠️ 这个页面的门禁**不是访问控制**。它只是别让免费用户白点 ——
 * 真正的防线是 `diagnoseTeam` 上挂的 `requireCapability('team.diagnose')`。
 * 把下面的判断删掉，接口依然调不通（`src/server/teams.test.ts` 里有一条断言守着）。
 */
export const Route = createFileRoute('/_console/diagnose')({
  loader: async () => ({ teams: await listTeams() }),
  component: Diagnose,
})

function Diagnose() {
  const { trainer } = Route.useRouteContext()
  const { teams } = Route.useLoaderData()

  // 拿不到队伍就说明等级不够（中间件拦的），直接走锁定态
  if (!can(trainer, 'team.diagnose').allowed) {
    return (
      <FeaturePage
        trainer={trainer}
        cap="team.diagnose"
        title="队伍诊断"
        desc="自动找出属性弱点叠加、速度线缺口、重复职能。"
      />
    )
  }

  return <Console teams={teams} />
}

function Console({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [result, setResult] = useState<Diagnosis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">还没有队伍可诊断</CardTitle>
          <CardDescription>
            先去「我的队伍」建一支，回来再诊断。
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  async function run() {
    setBusy(true)
    setError(null)
    try {
      setResult(await diagnoseTeam({ data: teamId }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">队伍诊断</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          选一支队伍，跑完整倍率表。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={teamId} onValueChange={(v) => setTeamId(String(v))}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="选择队伍" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}（{t.members.length}/{MAX_MEMBERS}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={run} disabled={busy || !teamId}>
          {busy ? '计算中…' : '开始诊断'}
        </Button>
      </div>

      {error && (
        <Alert status="error">
          <AlertTriangleIcon />
          <AlertTitle>服务端拒绝了这次调用</AlertTitle>
          <AlertDescription className="font-mono text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {result && <Report d={result} />}
    </div>
  )
}

function Report({ d }: { d: Diagnosis }) {
  if (d.insufficient) {
    return (
      <Alert status="warning">
        <AlertTriangleIcon />
        <AlertTitle>样本不足</AlertTitle>
        <AlertDescription>
          少于 3 名成员时，任何「结构性」结论都是噪音。先补到 3 只以上再看。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Tabs defaultValue="weak">
      <TabsList>
        <TabsTrigger value="weak">
          <ShieldAlertIcon /> 属性弱点
        </TabsTrigger>
        <TabsTrigger value="speed">
          <GaugeIcon /> 速度线
        </TabsTrigger>
        <TabsTrigger value="role">
          <LayersIcon /> 职能
        </TabsTrigger>
      </TabsList>

      <TabsContent value="weak" className="space-y-4">
        {d.weakSpots.length === 0 ? (
          <Empty text="没有任何属性被 3 名以上成员共同克制，属性面是干净的。" />
        ) : (
          d.weakSpots.map((w) => (
            <Card key={w.type}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <TypeBadge type={w.type} />
                  <span>{w.count} 名成员弱于它</span>
                  {w.fatal > 0 && (
                    <Badge variant="destructive">{w.fatal} 名被 4 倍克制</Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex flex-wrap gap-1 pt-1">
                  {w.members.map((m) => (
                    <span
                      key={m}
                      className="border-2 border-border px-1.5 py-0.5 text-xs"
                    >
                      {m}
                    </span>
                  ))}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}

        {d.cover.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">还有抵抗面的属性</CardTitle>
              <CardDescription className="flex flex-wrap gap-1 pt-1">
                {d.cover.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="speed">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">速度排序</CardTitle>
            <CardDescription>
              相邻两名之间差 25 点以上，实战里就跨了一个出手层级 —— 速度线断在那里。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1">
              {d.speed.members.map((m, i) => {
                const gap = d.speed.gaps.find((g) => g.to === m.speed)
                return (
                  <li key={`${m.name}-${i}`}>
                    {gap && (
                      <div className="my-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Separator className="flex-1" />
                        <span className="shrink-0">
                          缺口 {gap.size}（{gap.from} → {gap.to}）
                        </span>
                        <Separator className="flex-1" />
                      </div>
                    )}
                    <div className="flex items-center justify-between border-2 border-border px-2 py-1 text-sm">
                      <span>{m.name}</span>
                      <span className="font-head tabular-nums">{m.speed}</span>
                    </div>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="role" className="space-y-4">
        {d.clumps.length === 0 ? (
          <Empty text="没有 4 只以上同职能的堆积，队伍分工是铺开的。" />
        ) : (
          d.clumps.map((c) => (
            <Alert key={c.role} status="warning">
              <AlertTriangleIcon />
              <AlertTitle>
                {c.members.length} 只都是「{ROLE_LABEL[c.role]}」职能
              </AlertTitle>
              <AlertDescription>
                {c.members.join('、')} —— 面对单一战术时容易一起卡住。
              </AlertDescription>
            </Alert>
          ))
        )}
      </TabsContent>
    </Tabs>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">没查出问题</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  )
}
