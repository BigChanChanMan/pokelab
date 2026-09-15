import { can } from './capabilities'
import type { Trainer } from './tiers'
import type { PokemonType } from './type-chart'

/**
 * 队伍领域模型。
 *
 * 和 DESIGN.md §9 的 Drizzle schema 一一对应 —— 换成真库时，
 * 这些接口的形状不变，只是 `src/server/team-store.ts` 的实现被换掉。
 * 和身份接缝（`server/trainer.ts`）是同一个套路。
 */

export interface EVs {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

export interface Member {
  id: string
  speciesId: number
  ability: string | null
  item: string | null
  nature: string | null
  teraType: PokemonType | null
  evs: EVs | null
  moves: string[]
  /** 槽位 1–6。刻意不是数组下标 —— 槽位是领域概念，见 DESIGN.md §9 */
  position: number
}

export interface Team {
  id: string
  trainerId: string
  name: string
  /** 单调递增的创建序号。可写窗口依赖它的严格有序性。 */
  createdAt: number
  members: Member[]
}

export const MAX_MEMBERS = 6

/**
 * 队伍名的一条领域规则：非空 + 长度上限。
 *
 * 新建和重命名共用同一条规则（服务端强制，前端用同一函数做校验）。
 * 长度上限唯一的作用是不让「本就被截断展示」的名字无边界膨胀；
 * 没有做唯一性 —— 重名是允许的，那是另一个还没被要求的约束。
 */
export const TEAM_NAME_MAX = 30

/** 返回错误信息，合法返回 null —— 前端校验和服务端强制都用它。 */
export function teamNameError(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length === 0) return '队伍名不能为空'
  if (trimmed.length > TEAM_NAME_MAX) return `队伍名最多 ${TEAM_NAME_MAX} 字`
  return null
}

export interface TeamSlot {
  team: Team
  /**
   * 在创建序里的下标 —— 同时**就是**它已经消耗掉的配额数。
   * 这个巧合是刻意的，它是「可写窗口」能复用同一个 `can()` 的原因。
   */
  index: number
  /** 降级后落在窗口外的队伍是只读的，不是被删掉的 */
  writable: boolean
}

/**
 * 把队伍列表变成「带可写窗口的槽位列表」。
 *
 * **降级不删数据** 的落点就在这三行：按创建序排好后，第 `index` 支队伍
 * 消耗了 `index` 份配额，把它喂给**同一个** `can()`（`used: index`），
 * 得到的就是「前 N 支可写、后 M 支只读」。
 *
 * 所以这里没有第二套权限判断 —— 创建时判满没满、读取时判能不能改，
 * 走的是同一个函数、同一张表。DESIGN.md §6.4 说的两层含义就是这个意思。
 */
export function teamSlots(trainer: Trainer, teams: Team[]): TeamSlot[] {
  return [...teams]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((team, index) => ({
      team,
      index,
      writable: can(trainer, 'team.create', { used: index }).allowed,
    }))
}

/** 按槽位排序的成员，供展示与诊断共用 */
export function orderedMembers(team: Team): Member[] {
  return [...team.members].sort((a, b) => a.position - b.position)
}
