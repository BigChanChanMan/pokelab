import { DEX, type DexEntry } from '@/data/dex'
import { cnName } from '@/data/zh-names'
import { POKEMON_TYPES, effectivenessAgainst, type PokemonType } from './type-chart'
import { orderedMembers, type Team } from './team'

/**
 * 队伍诊断。
 *
 * 为什么这是第一个 VIP 功能：它的输出**不可由人一眼算出**。
 * 6 只双属性宝可梦 × 18 个攻击属性 = 216 次倍率乘法，人脑算不动。
 * 一个「VIP 才能看」但内容平淡的功能，演示不出任何东西。
 *
 * 这是个**纯函数**：不碰网络、不碰库、不碰权限。权限在外面的服务端函数上。
 */

const BY_ID = new Map<number, DexEntry>(DEX.map((e) => [e.id, e]))

export type Role = 'wall' | 'sweeper' | 'breaker' | 'balanced'

export const ROLE_LABEL: Record<Role, string> = {
  wall: '耐久',
  sweeper: '速攻',
  breaker: '破盾',
  balanced: '均衡',
}

/**
 * 职能判定。
 *
 * 阈值是**刻意的启发式**，不是什么权威标准 —— 它只需要稳定、可解释、
 * 并在明显失衡的队伍上给出明显结论。真要做细，得引入特性、道具和招式池，
 * 那是另一个量级的工作。
 */
function roleOf(entry: DexEntry): Role {
  const [hp, atk, def, spa, spd, spe] = entry.stats
  const offense = Math.max(atk, spa)
  // 弱侧决定能不能扛住 —— 特防 105 但物防 5 的宝可梦不是墙
  const bulk = hp + Math.min(def, spd)

  if (offense < 100 && bulk >= 200) return 'wall'
  if (spe >= 100 && offense >= 100) return 'sweeper'
  if (spe < 100 && offense >= 110) return 'breaker'
  return 'balanced'
}

export interface MemberView {
  position: number
  speciesId: number
  name: string
  types: PokemonType[]
  role: Role
  speed: number
}

/** 队伍成员的只读投影。诊断、展示、测试共用同一份取数逻辑。 */
export function viewMembers(team: Team): MemberView[] {
  return orderedMembers(team)
    .map((m) => {
      const entry = BY_ID.get(m.speciesId)
      if (!entry) return null
      return {
        position: m.position,
        speciesId: m.speciesId,
        name: cnName(entry.id, entry.name),
        types: entry.types,
        role: roleOf(entry),
        speed: entry.stats[5],
      }
    })
    .filter((v): v is MemberView => v !== null)
}

export interface WeakSpot {
  type: PokemonType
  /** 弱于这个属性的成员数 */
  count: number
  /** 其中被 4 倍克制的成员数 —— 「叠加」的部分 */
  fatal: number
  members: string[]
}

export interface SpeedGap {
  from: number
  to: number
  size: number
}

export interface RoleClump {
  role: Role
  members: string[]
}

export interface Diagnosis {
  weakSpots: WeakSpot[]
  /** 队伍里还有成员免疫或抵抗的属性 */
  cover: PokemonType[]
  speed: { members: { name: string; speed: number }[]; gaps: SpeedGap[] }
  clumps: RoleClump[]
  /** 成员不足，结论不可信 */
  insufficient: boolean
}

/** 3 个及以上成员共同弱点 = 结构性漏洞，2 个是正常配置 */
const WEAK_SPOT_MIN = 3
/** 相邻成员之间 25 点速度差 = 实战场上跨了一个出手层级 */
const SPEED_GAP_MIN = 25
/** 4 个及以上同职能才是失衡。3 个在 6 人队里仍然常见 */
const CLUMP_MIN = 4

export function diagnose(team: Team): Diagnosis {
  const members = viewMembers(team)

  const weakSpots: WeakSpot[] = []
  const cover: PokemonType[] = []

  for (const type of POKEMON_TYPES) {
    const hits = members.map((m) => ({
      m,
      mult: effectivenessAgainst(type, m.types),
    }))
    const weak = hits.filter((h) => h.mult >= 2)
    const resists = hits.filter((h) => h.mult < 1)

    if (weak.length >= WEAK_SPOT_MIN) {
      weakSpots.push({
        type,
        count: weak.length,
        fatal: weak.filter((h) => h.mult >= 4).length,
        members: weak.map((h) => h.m.name),
      })
    }
    if (resists.length >= 2) cover.push(type)
  }

  weakSpots.sort((a, b) => b.fatal - a.fatal || b.count - a.count)

  const speeds = [...members].sort((a, b) => b.speed - a.speed)
  const gaps: SpeedGap[] = []
  for (let i = 1; i < speeds.length; i++) {
    const size = speeds[i - 1].speed - speeds[i].speed
    if (size >= SPEED_GAP_MIN) {
      gaps.push({ from: speeds[i - 1].speed, to: speeds[i].speed, size })
    }
  }

  const clumps: RoleClump[] = []
  for (const role of Object.keys(ROLE_LABEL) as Role[]) {
    const names = members.filter((m) => m.role === role).map((m) => m.name)
    if (names.length >= CLUMP_MIN) clumps.push({ role, members: names })
  }

  return {
    weakSpots,
    cover,
    speed: {
      members: speeds.map((s) => ({ name: s.name, speed: s.speed })),
      gaps,
    },
    clumps,
    // 一支队伍 3 只以下时，任何「结构性」结论都是噪音
    insufficient: members.length < 3,
  }
}
