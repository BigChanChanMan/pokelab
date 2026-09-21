import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { can } from '@/lib/capabilities'
import { ASSIGNABLE_TIERS, TIER_LABEL, type Tier } from '@/lib/tiers'
import {
  listTrainers,
  readUpgradeCode,
  setTrainerTier,
  writeUpgradeCode,
  type TrainerSummary,
} from '@/server/admin'

/**
 * 管理后台。**这是项目里第一个按能力守的页面。**
 *
 * ⚠️ 这个 beforeLoad 是**导航守卫**，不是访问控制 —— 它保护的只是页面。
 * 每个能力仍然必须在自己的 createServerFn 上挂 requireCapability
 * （`server/admin.ts` 就是这么做的）。和 `_console.tsx` 的访客守卫同一个道理。
 *
 * 守卫内调的是**同一个 `can()`**，所以它和侧边栏的可见性、服务端的强制
 * 不可能不一致（CLAUDE.md 硬约束 1）。
 */
export const Route = createFileRoute('/_console/admin')({
  beforeLoad: async ({ context }) => {
    if (!can(context.trainer, 'user.manage').allowed) {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: async () => ({
    trainers: await listTrainers(),
    code: await readUpgradeCode(),
  }),
  component: AdminPage,
})

function AdminPage() {
  const { trainer: viewer } = Route.useRouteContext()
  const { trainers: initial, code: initialCode } = Route.useLoaderData()

  const [rows, setRows] = useState<TrainerSummary[]>(initial)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState(initialCode ?? '')
  const [codeDraft, setCodeDraft] = useState(initialCode ?? '')
  const [codeSaved, setCodeSaved] = useState(false)

  async function changeTier(row: TrainerSummary, tier: Tier) {
    setError(null)
    try {
      const updated = await setTrainerTier({
        data: { trainerId: row.id, tier },
      })
      setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">管理</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          训练家列表和升级码。等级改了**立即生效**，对方不用重新登录。
        </p>
      </div>

      {error && (
        <Alert status="error">
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">训练家（{rows.length}）</CardTitle>
          <CardDescription>
            只能设为注册训练家或 VIP。「谁能成为管理员」只有 seed 一条路径 ——
            界面不可授予，服务端也会拒绝。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>训练家名</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>注册时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                // 自己那一行不能改 —— 免得一次误操作把自己锁在系统外面。
                // 服务端也拒绝（见 server/admin.ts）。
                const isSelf = row.id === viewer.id
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-head">
                      {row.handle}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          （你）
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isSelf || row.tier === 'admin' ? (
                        <span className="text-sm">{TIER_LABEL[row.tier]}</span>
                      ) : (
                        <Select
                          value={row.tier}
                          onValueChange={(v) => changeTier(row, v as Tier)}
                        >
                          <SelectTrigger size="sm" className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_TIERS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {TIER_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString('zh-CN')}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">升级码</CardTitle>
          <CardDescription>
            当前值：<code className="bg-accent px-1">{code || '（未设置）'}</code>
            。用户拿它自助升级到 VIP，线下转达。可重复使用。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">新升级码</Label>
            <Input
              id="code"
              value={codeDraft}
              onChange={(e) => {
                setCodeDraft(e.target.value)
                setCodeSaved(false)
              }}
            />
          </div>
          {codeSaved && (
            <Alert status="success">
              <AlertDescription>升级码已更新。</AlertDescription>
            </Alert>
          )}
          <Button
            disabled={!codeDraft.trim()}
            onClick={async () => {
              setError(null)
              try {
                await writeUpgradeCode({ data: codeDraft })
                setCode(codeDraft.trim())
                setCodeSaved(true)
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e))
              }
            }}
          >
            保存
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
