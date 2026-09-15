import { useForm } from '@tanstack/react-form'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  LockIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
import { useState } from 'react'

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { DEX } from '@/data/dex'
import { cnName } from '@/data/zh-names'
import { can } from '@/lib/capabilities'
import {
  MAX_MEMBERS,
  teamNameError,
  teamSlots,
  type Team,
} from '@/lib/team'
import { TIER_LABEL } from '@/lib/tiers'
import {
  addMember,
  createTeam,
  deleteTeam,
  listTeams,
  removeMember,
  renameTeam,
} from '@/server/teams'

/**
 * 图鉴下拉的 value→label 映射。喂给 <Select items>，触发框才能显示名字而不是编号；
 * 同时作为「已选物种去重」的选项源。
 */
const SPECIES_ITEMS = DEX.map((d) => ({
  value: String(d.id),
  label: `#${String(d.id).padStart(3, '0')} ${cnName(d.id, d.name)}`,
}))

export const Route = createFileRoute('/_console/teams')({
  // loader 和组件的取数走同一个服务端函数 —— 服务端强制在这里同样生效，
  // 想绕过 UI 直接构造请求也过不去 requireCapability。
  loader: async () => ({ teams: await listTeams() }),
  component: Teams,
})

function Teams() {
  const { trainer } = Route.useRouteContext()
  const { teams } = Route.useLoaderData()
  const router = useRouter()

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slots = teamSlots(trainer, teams)
  const quota = can(trainer, 'team.create', { used: teams.length })

  async function run(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      // 让 loader 重跑 —— 服务端才是真相，前端不维护副本
      await router.invalidate()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight">我的队伍</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            每支最多 {MAX_MEMBERS} 名成员。当前身份 {TIER_LABEL[trainer.tier]}，
            已用 {teams.length} 支
            {quota.allowed
              ? '。'
              : quota.reason === 'quota'
                ? ` / 上限 ${quota.limit}。`
                : '。'}
          </p>
        </div>

        <CreateTeamDialog disabled={busy || !quota.allowed} />
      </div>

      {!quota.allowed && quota.reason === 'quota' && (
        <Alert status="warning">
          <AlertTriangleIcon />
          <AlertTitle>配额已满</AlertTitle>
          <AlertDescription>
            已用 {quota.used}/{quota.limit}。已有队伍仍然可用，但不能再新建 ——
            升级到 VIP 即可解除上限。
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert status="error">
          <AlertTriangleIcon />
          <AlertTitle>服务端拒绝了这次操作</AlertTitle>
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {slots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">还没有队伍</CardTitle>
            <CardDescription>点上面的「新建」，创建第一支队伍。</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {slots.map((slot) => (
            <TeamCard
              key={slot.team.id}
              team={slot.team}
              writable={slot.writable}
              busy={busy}
              onRun={run}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 「新建队伍」弹窗 —— 名字 + 初始成员（0–6 只）。
 *
 * 用 TanStack Form 管理两个字段：`name`（字符串）和 `speciesIds`（数组）。
 * 名字校验走 `teamNameError()`，和服务端强制是同一个函数。
 */
function CreateTeamDialog({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', speciesIds: [] as number[] },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await createTeam({
          data: {
            name: value.name,
            // 未选择的占位行是 0，过滤掉再提交
            speciesIds: value.speciesIds.filter((id) => id > 0),
          },
        })
        await router.invalidate()
        setOpen(false)
        form.reset()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disabled} />}>
        <PlusIcon /> 新建
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建队伍</DialogTitle>
          <DialogDescription>
            起个名字，可选先放进几只宝可梦 —— 之后还能再加。
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => teamNameError(value) ?? undefined,
            }}
          >
            {(field) => (
              <div className="space-y-1">
                <label className="text-sm font-medium">队伍名</label>
                <Input
                  autoFocus
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="新队伍名称"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="speciesIds">
            {(field) => (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    初始成员（{field.state.value.length}/{MAX_MEMBERS}）
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={field.state.value.length >= MAX_MEMBERS}
                    onClick={() => field.pushValue(0)}
                  >
                    <PlusIcon /> 添加
                  </Button>
                </div>

                {field.state.value.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    留空就是建一支空队，之后再逐个加。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {field.state.value.map((_, i) => {
                      // 领域规则「同一物种最多一只」：这一行的下拉排除其它行已选的物种。
                      const others = new Set(
                        field.state.value.filter((v, j) => j !== i && v > 0),
                      )
                      const items = SPECIES_ITEMS.filter(
                        (it) => !others.has(Number(it.value)),
                      )
                      return (
                        <form.Field key={i} name={`speciesIds[${i}]`}>
                          {(sub) => (
                            <div className="flex gap-2">
                              <Select
                                items={items}
                                value={sub.state.value ? String(sub.state.value) : ''}
                                onValueChange={(v) => sub.handleChange(Number(v))}
                              >
                                <SelectTrigger className="flex-1" size="sm">
                                  <SelectValue placeholder="选择宝可梦" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((it) => (
                                    <SelectItem key={it.value} value={it.value}>
                                      {it.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="移除这一位"
                                onClick={() => field.removeValue(i)}
                              >
                                <TrashIcon />
                              </Button>
                            </div>
                          )}
                        </form.Field>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </form.Field>

          {error && (
            <Alert status="error">
              <AlertTriangleIcon />
              <AlertTitle>服务端拒绝了这次操作</AlertTitle>
              <AlertDescription className="font-mono text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? '创建中…' : '创建队伍'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TeamCard({
  team,
  writable,
  busy,
  onRun,
}: {
  team: Team
  writable: boolean
  busy: boolean
  onRun: (fn: () => Promise<unknown>) => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <Card className={writable ? undefined : 'opacity-70'}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          {editing ? (
            <RenameTeamForm
              team={team}
              onDone={() => setEditing(false)}
              onRun={onRun}
            />
          ) : (
            <CardTitle className="text-lg">{team.name}</CardTitle>
          )}

          <div className="flex shrink-0 gap-1">
            {writable ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="重命名"
                  onClick={() => setEditing((v) => !v)}
                >
                  ✏️
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="删除队伍"
                  disabled={busy}
                  onClick={() => onRun(() => deleteTeam({ data: team.id }))}
                >
                  <TrashIcon />
                </Button>
              </>
            ) : (
              <Badge variant="outline">
                <LockIcon /> 只读
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {team.members.length} / {MAX_MEMBERS} 名成员
          {!writable && ' · 等级降回后超出配额的部分保留了数据，只是不能改'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <ul className="space-y-1.5">
          {team.members
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((m) => {
              const entry = DEX.find((d) => d.id === m.speciesId)
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-2 border-2 border-border px-2 py-1 text-sm"
                >
                  <span className="w-5 shrink-0 font-head text-xs text-muted-foreground tabular-nums">
                    {m.position}
                  </span>
                  <span className="truncate font-medium">
                    {entry ? cnName(entry.id, entry.name) : `#${m.speciesId}`}
                  </span>
                  {writable && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="ml-auto"
                      aria-label="移除成员"
                      disabled={busy}
                      onClick={() =>
                        onRun(() =>
                          removeMember({ data: { teamId: team.id, memberId: m.id } }),
                        )
                      }
                    >
                      <TrashIcon />
                    </Button>
                  )}
                </li>
              )
            })}
        </ul>

        {writable && team.members.length < MAX_MEMBERS && (
          <>
            <Separator />
            <AddMember team={team} busy={busy} onRun={onRun} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 重命名内联表单 —— 也迁到 TanStack Form，和新建共用同一套名字校验。
 * `onDone` 在提交时立即关闭编辑态（沿用原来的「先关再调」的乐观行为），
 * 失败由父级的 `run()` 把错误铺到顶部 Alert。
 */
function RenameTeamForm({
  team,
  onDone,
  onRun,
}: {
  team: Team
  onDone: () => void
  onRun: (fn: () => Promise<unknown>) => void
}) {
  const form = useForm({
    defaultValues: { name: team.name },
    onSubmit: async ({ value }) => {
      onDone()
      await onRun(() =>
        renameTeam({ data: { teamId: team.id, name: value.name } }),
      )
    },
  })

  return (
    <form
      className="flex flex-1 items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => teamNameError(value) ?? undefined,
        }}
      >
        {(field) => (
          <div className="flex-1">
            <Input
              autoFocus
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              className="h-8"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="mt-1 text-xs text-destructive">
                {field.state.meta.errors[0]}
              </p>
            )}
          </div>
        )}
      </form.Field>
      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
      >
        {([canSubmit, isSubmitting]) => (
          <Button type="submit" size="sm" disabled={!canSubmit || isSubmitting}>
            保存
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}

function AddMember({
  team,
  busy,
  onRun,
}: {
  team: Team
  busy: boolean
  onRun: (fn: () => Promise<unknown>) => void
}) {
  const [speciesId, setSpeciesId] = useState<string>('')

  // 领域规则「同一物种最多一只」：下拉排除已在队里的物种。
  const taken = new Set(team.members.map((m) => m.speciesId))
  const items = SPECIES_ITEMS.filter((it) => !taken.has(Number(it.value)))

  return (
    <div className="flex gap-2">
      <Select
        items={items}
        value={speciesId}
        onValueChange={(v) => setSpeciesId(String(v))}
      >
        <SelectTrigger className="flex-1" size="sm">
          <SelectValue placeholder="选择宝可梦" />
        </SelectTrigger>
        <SelectContent>
          {items.map((it) => (
            <SelectItem key={it.value} value={it.value}>
              {it.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={busy || !speciesId}
        onClick={() =>
          onRun(() =>
            addMember({ data: { teamId: team.id, speciesId: Number(speciesId) } }),
          )
        }
      >
        <PlusIcon /> 加入
      </Button>
    </div>
  )
}
