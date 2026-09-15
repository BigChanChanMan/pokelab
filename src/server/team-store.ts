import type { EVs, Member, Team } from '@/lib/team'
import { MAX_MEMBERS } from '@/lib/team'
import { DEX } from '@/data/dex'

/**
 * 队伍存储 —— 阶段 3/4 的**内存桩**。
 *
 * 和 `server/trainer.ts` 是同一个套路：换真实实现（Drizzle + SQLite，
 * DESIGN.md §9）时，**所有调用方一行不改**。阶段 5 的验收标准就是这一条。
 *
 * 所以这里刻意不做任何权限判断 —— 存储只回答「有什么」，不回答「能不能」。
 * 权限全部在 `server/teams.ts` 的服务端函数里，走 `can()`。
 *
 * ponytail: 模块级 Map + 进程内自增。dev server 重启即清空，够用；
 * 真持久化就是阶段 5 的 `src/db/`。
 */

const teams = new Map<string, Team[]>()
let seq = 0

const nextId = (prefix: string) => `${prefix}_${(++seq).toString(36)}`

/** 创建序 —— 也**就是**已消耗的配额数，见 `lib/team.ts` 的 `teamSlots()`。 */
const createdAt = () => Date.now() + seq

export function listTeams(trainerId: string): Team[] {
  return teams.get(trainerId) ?? []
}

export function getTeam(trainerId: string, teamId: string): Team | undefined {
  return listTeams(trainerId).find((t) => t.id === teamId)
}

export function createTeam(
  trainerId: string,
  name: string,
  speciesIds: number[],
): Team {
  // 先做完全部校验、再写入。内存桩里没有事务，这样保证「要么整队建好，要么一步不写」，
  // 不会留下「队建了但成员没加全」的半成品。
  if (speciesIds.length > MAX_MEMBERS) throw new Error('TEAM_FULL')
  const seen = new Set<number>()
  for (const id of speciesIds) {
    if (!DEX.some((d) => d.id === id)) throw new Error(`UNKNOWN_SPECIES:${id}`)
    // 领域规则：一支队伍里同一物种最多一只（DESIGN §2）。初始成员内部也去重。
    if (seen.has(id)) throw new Error(`DUPLICATE_SPECIES:${id}`)
    seen.add(id)
  }

  const team: Team = {
    id: nextId('team'),
    trainerId,
    name,
    createdAt: createdAt(),
    // 初始成员按传入顺序占据 1..N 号槽位 —— 和 addMember 的自动找空位一致
    members: speciesIds.map((speciesId, i) => ({
      id: nextId('mem'),
      speciesId,
      ability: null,
      item: null,
      nature: null,
      teraType: null,
      evs: null,
      moves: [],
      position: i + 1,
    })),
  }
  teams.set(trainerId, [...listTeams(trainerId), team])
  return team
}

export function renameTeam(trainerId: string, teamId: string, name: string): Team {
  const team = requireTeam(trainerId, teamId)
  team.name = name
  return team
}

export function deleteTeam(trainerId: string, teamId: string): void {
  teams.set(
    trainerId,
    listTeams(trainerId).filter((t) => t.id !== teamId),
  )
}

export interface MemberInput {
  speciesId: number
  ability?: string | null
  item?: string | null
  nature?: string | null
  evs?: EVs | null
  moves?: string[]
}

/** 追加成员到下一个空槽位。队伍满了返回 undefined。 */
export function addMember(
  trainerId: string,
  teamId: string,
  input: MemberInput,
): Member | undefined {
  const team = requireTeam(trainerId, teamId)
  if (team.members.length >= MAX_MEMBERS) return undefined
  // 图鉴里没有的编号直接拒 —— 存储层不校验「合不合理」，但要挡住脏数据
  if (!DEX.some((d) => d.id === input.speciesId)) {
    throw new Error(`UNKNOWN_SPECIES:${input.speciesId}`)
  }
  // 领域规则：一支队伍里同一物种最多一只（DESIGN §2）。
  if (team.members.some((m) => m.speciesId === input.speciesId)) {
    throw new Error(`DUPLICATE_SPECIES:${input.speciesId}`)
  }

  const used = new Set(team.members.map((m) => m.position))
  const position = [1, 2, 3, 4, 5, 6].find((p) => !used.has(p))
  if (position === undefined) return undefined

  const member: Member = {
    id: nextId('mem'),
    speciesId: input.speciesId,
    ability: input.ability ?? null,
    item: input.item ?? null,
    nature: input.nature ?? null,
    teraType: null,
    evs: input.evs ?? null,
    moves: input.moves ?? [],
    position,
  }
  team.members.push(member)
  return member
}

export function removeMember(
  trainerId: string,
  teamId: string,
  memberId: string,
): void {
  const team = requireTeam(trainerId, teamId)
  team.members = team.members.filter((m) => m.id !== memberId)
}

function requireTeam(trainerId: string, teamId: string): Team {
  const team = getTeam(trainerId, teamId)
  // 注意：这里抛的是「不存在」，不是「没权限」。权限在服务端函数里判，
  // 存储层不该知道等级这回事。
  if (!team) throw new Error(`TEAM_NOT_FOUND:${teamId}`)
  return team
}

/** 仅供测试：清空所有数据 */
export function __reset(): void {
  teams.clear()
  seq = 0
}
