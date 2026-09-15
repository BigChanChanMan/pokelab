/**
 * 宝可梦属性体系：中文名、色板、克制关系表（第六世代及以后）
 *
 * 这套数据完全静态，不走网络请求 —— 属性克制计算器因此可以纯前端毫秒级响应。
 * 色板不直接写 hex，而是引用 styles.css 里定义的 --type-* CSS 变量，
 * 这样暗色模式 / 主题定制时只改一处。
 */

export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const

export type PokemonType = (typeof POKEMON_TYPES)[number]

export const TYPE_LABELS: Record<PokemonType, string> = {
  normal: '一般',
  fire: '火',
  water: '水',
  electric: '电',
  grass: '草',
  ice: '冰',
  fighting: '格斗',
  poison: '毒',
  ground: '地面',
  flying: '飞行',
  psychic: '超能力',
  bug: '虫',
  rock: '岩石',
  ghost: '幽灵',
  dragon: '龙',
  dark: '恶',
  steel: '钢',
  fairy: '妖精',
}

/** 每个属性对应的 CSS 变量名，写在 styles.css 的 :root 里 */
export const TYPE_VARS: Record<PokemonType, string> = Object.fromEntries(
  POKEMON_TYPES.map((t) => [t, `var(--type-${t})`])
) as Record<PokemonType, string>

interface Effectiveness {
  /** 2 倍伤害 */
  super: PokemonType[]
  /** 0.5 倍伤害 */
  notVery: PokemonType[]
  /** 0 倍伤害 */
  immune: PokemonType[]
}

/** 攻击方 -> 防御方 的伤害倍率关系 */
export const TYPE_CHART: Record<PokemonType, Effectiveness> = {
  normal: { super: [], notVery: ['rock', 'steel'], immune: ['ghost'] },
  fire: {
    super: ['grass', 'ice', 'bug', 'steel'],
    notVery: ['fire', 'water', 'rock', 'dragon'],
    immune: [],
  },
  water: { super: ['fire', 'ground', 'rock'], notVery: ['water', 'grass', 'dragon'], immune: [] },
  electric: {
    super: ['water', 'flying'],
    notVery: ['electric', 'grass', 'dragon'],
    immune: ['ground'],
  },
  grass: {
    super: ['water', 'ground', 'rock'],
    notVery: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
    immune: [],
  },
  ice: {
    super: ['grass', 'ground', 'flying', 'dragon'],
    notVery: ['fire', 'water', 'ice', 'steel'],
    immune: [],
  },
  fighting: {
    super: ['normal', 'ice', 'rock', 'dark', 'steel'],
    notVery: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
    immune: ['ghost'],
  },
  poison: {
    super: ['grass', 'fairy'],
    notVery: ['poison', 'ground', 'rock', 'ghost'],
    immune: ['steel'],
  },
  ground: {
    super: ['fire', 'electric', 'poison', 'rock', 'steel'],
    notVery: ['grass', 'bug'],
    immune: ['flying'],
  },
  flying: { super: ['grass', 'fighting', 'bug'], notVery: ['electric', 'rock', 'steel'], immune: [] },
  psychic: { super: ['fighting', 'poison'], notVery: ['psychic', 'steel'], immune: ['dark'] },
  bug: {
    super: ['grass', 'psychic', 'dark'],
    notVery: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
    immune: [],
  },
  rock: { super: ['fire', 'ice', 'flying', 'bug'], notVery: ['fighting', 'ground', 'steel'], immune: [] },
  ghost: { super: ['psychic', 'ghost'], notVery: ['dark'], immune: ['normal'] },
  dragon: { super: ['dragon'], notVery: ['steel'], immune: ['fairy'] },
  dark: { super: ['psychic', 'ghost'], notVery: ['fighting', 'dark', 'fairy'], immune: [] },
  steel: {
    super: ['ice', 'rock', 'fairy'],
    notVery: ['fire', 'water', 'electric', 'steel'],
    immune: [],
  },
  fairy: { super: ['fighting', 'dragon', 'dark'], notVery: ['fire', 'poison', 'steel'], immune: [] },
}

/**
 * 计算「某个攻击属性」打「单/双属性防御方」的伤害倍率。
 * 双属性时两个倍率相乘（这是宝可梦的官方规则，例如 4 倍 / 0.25 倍）。
 */
export function effectivenessAgainst(
  attack: PokemonType,
  defenders: PokemonType[]
): number {
  const rel = TYPE_CHART[attack]
  return defenders.reduce((multiplier, def) => {
    if (rel.immune.includes(def)) return multiplier * 0
    if (rel.super.includes(def)) return multiplier * 2
    if (rel.notVery.includes(def)) return multiplier * 0.5
    return multiplier
  }, 1)
}

export interface TypeMatchup {
  type: PokemonType
  multiplier: number
}

/** 给定防御方属性组合，列出全部 18 个攻击属性的倍率（用于属性克制计算器） */
export function matchupTable(defenders: PokemonType[]): TypeMatchup[] {
  return POKEMON_TYPES.map((type) => ({
    type,
    multiplier: effectivenessAgainst(type, defenders),
  }))
}

/** 倍率 -> 中文说明，用于 Badge 展示 */
export function multiplierLabel(multiplier: number): string {
  if (multiplier === 0) return '免疫'
  if (multiplier === 0.25) return '¼ 倍'
  if (multiplier === 0.5) return '½ 倍'
  if (multiplier === 1) return '1 倍'
  if (multiplier === 2) return '2 倍'
  if (multiplier === 4) return '4 倍'
  return `${multiplier} 倍`
}

/** 倍率 -> 语义色，映射到 neobrutalism 的 status 色轴 */
export function multiplierTone(multiplier: number): 'success' | 'warning' | 'error' | 'info' {
  if (multiplier === 0) return 'info'
  if (multiplier < 1) return 'success' // 打得少 = 防守方赚
  if (multiplier === 1) return 'warning'
  return 'error'
}
