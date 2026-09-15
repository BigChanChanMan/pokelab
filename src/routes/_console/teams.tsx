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
import { MAX_MEMBERS, teamSlots, type Team } from '@/lib/team'
import { TIER_LABEL } from '@/lib/tiers'
import {
  addMember,
  createTeam,
  deleteTeam,
  listTeams,
  removeMember,
  renameTeam,
} from '@/server/teams'

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

  const [name, setName] = useState('')
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

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            run(async () => {
              await createTeam({ data: name.trim() })
              setName('')
            })
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="新队伍名称"
            className="w-44"
          />
          <Button type="submit" disabled={busy || !quota.allowed}>
            <PlusIcon /> 新建
          </Button>
        </form>
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
            <CardDescription>在上面输个名字，点「新建」。</CardDescription>
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
  const [draft, setDraft] = useState(team.name)

  return (
    <Card className={writable ? undefined : 'opacity-70'}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          {editing ? (
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!draft.trim()) return
                setEditing(false)
                onRun(() => renameTeam({ data: { teamId: team.id, name: draft.trim() } }))
              }}
            >
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="h-8"
              />
              <Button type="submit" size="sm">
                保存
              </Button>
            </form>
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
                  onClick={() => {
                    setDraft(team.name)
                    setEditing((v) => !v)
                  }}
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
            <AddMember teamId={team.id} busy={busy} onRun={onRun} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function AddMember({
  teamId,
  busy,
  onRun,
}: {
  teamId: string
  busy: boolean
  onRun: (fn: () => Promise<unknown>) => void
}) {
  const [speciesId, setSpeciesId] = useState<string>('')

  return (
    <div className="flex gap-2">
      <Select value={speciesId} onValueChange={(v) => setSpeciesId(String(v))}>
        <SelectTrigger className="flex-1" size="sm">
          <SelectValue placeholder="选择宝可梦" />
        </SelectTrigger>
        <SelectContent>
          {DEX.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              #{String(d.id).padStart(3, '0')} {cnName(d.id, d.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={busy || !speciesId}
        onClick={() =>
          onRun(() =>
            addMember({ data: { teamId, speciesId: Number(speciesId) } }),
          )
        }
      >
        <PlusIcon /> 加入
      </Button>
    </div>
  )
}
