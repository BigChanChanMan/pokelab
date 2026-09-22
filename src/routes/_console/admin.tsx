import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { TrashIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  deleteTrainer,
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

/**
 * 删除确认。**二次确认是这里唯一的安全性** —— 服务端只挡管理员，
 * 挡不住「点错了行」。
 *
 * 如实报出会连带毁掉多少条抽卡记录，而不是给一句抽象的「不可恢复」：
 * 这个仓库在别处已经建立了这个习惯（概率公示连保底的偏差都写出来）。
 * 删除是把这件事说清楚的**最后一次**机会。
 *
 * 只报抽卡数，**不报队伍数** —— 队伍还在内存桩里，那个数字会随 dev server
 * 重启变化，是个会骗人的数字。宁可不说。
 */
function DeleteDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: TrainerSummary | null
  onCancel: () => void
  onConfirm: (row: TrainerSummary) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>删除训练家？</DialogTitle>
          <DialogDescription>
            <strong>{target?.handle}</strong> 的账号会被<strong>永久删除</strong>
            ，不可恢复。训练家名随之释放，别人可以注册同名。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          {target && target.gachaDraws > 0 ? (
            <p>
              该训练家的{' '}
              <strong className="font-head tabular-nums">
                {target.gachaDraws}
              </strong>{' '}
              条抽卡记录会一并消失。
            </p>
          ) : (
            <p className="text-muted-foreground">
              该训练家还没有抽卡记录。
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            队伍数据不在数据库里（仍是内存桩），会留到下次重启。
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={busy || !target}
            onClick={async () => {
              if (!target) return
              setBusy(true)
              try {
                await onConfirm(target)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? '删除中…' : '永久删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AdminPage() {
  const { trainer: viewer } = Route.useRouteContext()
  const { trainers: initial, code: initialCode } = Route.useLoaderData()

  const [rows, setRows] = useState<TrainerSummary[]>(initial)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState(initialCode ?? '')
  const [codeDraft, setCodeDraft] = useState(initialCode ?? '')
  const [codeSaved, setCodeSaved] = useState(false)
  /** 待确认删除的那一行。null = 弹层关着。 */
  const [pendingDelete, setPendingDelete] = useState<TrainerSummary | null>(null)

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

  async function confirmDelete(row: TrainerSummary) {
    setError(null)
    try {
      await deleteTrainer({ data: row.id })
      setRows((rs) => rs.filter((r) => r.id !== row.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPendingDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">管理</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          训练家列表和升级码。等级改了<strong>立即生效</strong>，对方不用重新登录。
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
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                // 自己那一行不能改 —— 免得一次误操作把自己锁在系统外面。
                // 服务端也拒绝（见 server/admin.ts）。
                const isSelf = row.id === viewer.id
                // 管理员一律不可删 —— 与「管理员只能由 seed 产生」同源，
                // 界面既然造不出管理员，也不该能销毁它。服务端也拒绝。
                const undeletable = row.tier === 'admin'
                return (
                  <TableRow key={row.id} className="even:bg-muted/50">
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`删除 ${row.handle}`}
                        title={
                          undeletable ? '管理员不可删除' : `删除 ${row.handle}`
                        }
                        disabled={undeletable}
                        onClick={() => setPendingDelete(row)}
                      >
                        <TrashIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteDialog
        target={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

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
