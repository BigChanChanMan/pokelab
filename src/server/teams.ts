import { createServerFn } from '@tanstack/react-start'

import { can } from '@/lib/capabilities'
import { teamSlots, teamNameError, type EVs, type Team } from '@/lib/team'
import { diagnose, type Diagnosis } from '@/lib/diagnose'
import { requireCapability } from './middleware'
import * as store from './team-store'
import type { Trainer } from '@/lib/tiers'

/**
 * 队伍的服务端函数。**这里是真正的防线。**
 *
 * 三条规则（DESIGN.md §7、CLAUDE.md 硬约束）：
 *   1. 每个函数的第一个中间件必须是 requireCapability —— 等级门
 *   2. 带配额的能力，处理函数里再用**同一个** `can()` 加 `usage` 判一次配额门
 *   3. 写操作还要过「可写窗口」—— 降级后落在窗口外的队伍是只读的，不是被删的
 *
 * 规则 1 和 2 看起来是两次检查，其实是同一个函数的两次调用：
 * 第一次不带 usage（只判等级），第二次带 usage（判配额）。这正是 §6.4 说的
 * 「配额的两层含义」—— 而配额的另一层，就是下面 `writable` 那条。
 */

/** 取当前训练家，顺带断言它是个真实账号（guest 没有 id，存不了东西）。 */
function trainerId(trainer: Trainer): string {
  if (!trainer.id) throw new Error('FORBIDDEN:no-identity')
  return trainer.id
}

/**
 * 「可写窗口」守卫 —— 降级场景的唯一落点。
 *
 * 用一个 `index`（= 已消耗的配额数）喂给 `can()`，和创建时的判断同源。
 */
function requireWritable(trainer: Trainer, teamId: string): Team {
  const id = trainerId(trainer)
  const slot = teamSlots(trainer, store.listTeams(id)).find(
    (s) => s.team.id === teamId,
  )
  if (!slot) throw new Error(`TEAM_NOT_FOUND:${teamId}`)
  if (!slot.writable) throw new Error('FORBIDDEN:team.create:quota-readonly')
  return slot.team
}

/** 写完再读一次作为返回值 —— 前端一次往返拿到新状态 */
function reload(trainer: Trainer, teamId: string): Team {
  const team = store.getTeam(trainerId(trainer), teamId)
  if (!team) throw new Error(`TEAM_NOT_FOUND:${teamId}`)
  return team
}

export const listTeams = createServerFn({ method: 'GET' })
  .middleware([requireCapability('team.create')])
  .handler(async ({ context }): Promise<Team[]> => {
    return store.listTeams(trainerId(context.trainer))
  })

export const createTeam = createServerFn({ method: 'POST' })
  .middleware([requireCapability('team.create')])
  .validator((input: { name: string; speciesIds: number[] }) => input)
  .handler(async ({ context, data }): Promise<Team> => {
    const id = trainerId(context.trainer)
    const used = store.listTeams(id).length

    // 配额门。和中间件里那次调用是同一个 `can()`，只是这次带上 usage。
    const verdict = can(context.trainer, 'team.create', { used })
    if (!verdict.allowed) throw new Error('FORBIDDEN:team.create:quota')

    // 名字校验 —— 和前端 TanStack Form 用的是同一个 teamNameError()。
    const nameError = teamNameError(data.name)
    if (nameError) throw new Error(`INVALID_NAME:${nameError}`)

    return store.createTeam(id, data.name.trim(), data.speciesIds)
  })

export const renameTeam = createServerFn({ method: 'POST' })
  .middleware([requireCapability('team.create')])
  .validator((input: { teamId: string; name: string }) => input)
  .handler(async ({ context, data }): Promise<Team> => {
    requireWritable(context.trainer, data.teamId)
    const nameError = teamNameError(data.name)
    if (nameError) throw new Error(`INVALID_NAME:${nameError}`)
    return store.renameTeam(
      trainerId(context.trainer),
      data.teamId,
      data.name.trim(),
    )
  })

export const deleteTeam = createServerFn({ method: 'POST' })
  .middleware([requireCapability('team.create')])
  .validator((teamId: string) => teamId)
  .handler(async ({ context, data: teamId }): Promise<{ ok: true }> => {
    requireWritable(context.trainer, teamId)
    store.deleteTeam(trainerId(context.trainer), teamId)
    return { ok: true }
  })

export const addMember = createServerFn({ method: 'POST' })
  .middleware([requireCapability('team.create')])
  .validator(
    (input: { teamId: string; speciesId: number; evs?: EVs | null }) => input,
  )
  .handler(async ({ context, data }): Promise<Team> => {
    requireWritable(context.trainer, data.teamId)
    const member = store.addMember(trainerId(context.trainer), data.teamId, {
      speciesId: data.speciesId,
      evs: data.evs ?? null,
    })
    if (!member) throw new Error('TEAM_FULL')
    return reload(context.trainer, data.teamId)
  })

export const removeMember = createServerFn({ method: 'POST' })
  .middleware([requireCapability('team.create')])
  .validator((input: { teamId: string; memberId: string }) => input)
  .handler(async ({ context, data }): Promise<Team> => {
    requireWritable(context.trainer, data.teamId)
    store.removeMember(trainerId(context.trainer), data.teamId, data.memberId)
    return reload(context.trainer, data.teamId)
  })

/**
 * 第一个 VIP 功能。
 *
 * 这个函数的**全部意义**在于中间件那一行：没有它，侧边栏里的锁图标就是
 * 纯装饰 —— 谁都能用 devtools 直接调它。
 */
export const diagnoseTeam = createServerFn({ method: 'POST' })
  .middleware([requireCapability('team.diagnose')])
  .validator((teamId: string) => teamId)
  .handler(async ({ context, data: teamId }): Promise<Diagnosis> => {
    const team = store.getTeam(trainerId(context.trainer), teamId)
    if (!team) throw new Error(`TEAM_NOT_FOUND:${teamId}`)
    return diagnose(team)
  })
