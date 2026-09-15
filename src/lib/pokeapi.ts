/**
 * PokeAPI 访问层。
 *
 * 这些函数既会在服务端（TanStack Start 的 loader / SSR）执行，
 * 也会在客户端导航时执行 —— TanStack Start 的 loader 是同构的，
 * 所以这里只用全局 fetch，不依赖任何浏览器专有 API。
 */

const API = 'https://pokeapi.co/api/v2'

export interface ApiPokemon {
  id: number
  name: string
  height: number
  weight: number
  base_experience: number
  types: { slot: number; type: { name: string } }[]
  stats: { base_stat: number; stat: { name: string } }[]
  abilities: { ability: { name: string }; is_hidden: boolean; slot: number }[]
  cries?: { latest?: string | null; legacy?: string | null }
  sprites: {
    front_default: string | null
    front_shiny: string | null
    other?: {
      'official-artwork'?: { front_default: string | null; front_shiny: string | null }
      home?: { front_default: string | null }
      showdown?: { front_default: string | null }
    }
  }
}

export interface ApiSpecies {
  id: number
  name: string
  capture_rate: number
  base_happiness: number | null
  is_legendary: boolean
  is_mythical: boolean
  color: { name: string } | null
  habitat: { name: string } | null
  generation: { name: string } | null
  growth_rate: { name: string } | null
  egg_groups: { name: string }[]
  genera: { genus: string; language: { name: string } }[]
  flavor_text_entries: { flavor_text: string; language: { name: string } }[]
  evolution_chain: { url: string } | null
  /** 叫声音频。注意它在 species 上，不在 pokemon 上 */
  cries?: { latest?: string | null; legacy?: string | null }
}

export interface EvolutionNode {
  species: { name: string; url: string }
  evolves_to: EvolutionNode[]
  evolution_details: {
    min_level: number | null
    trigger: { name: string } | null
    item: { name: string } | null
  }[]
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`PokeAPI 请求失败：${res.status} ${res.statusText} — ${url}`)
  }
  return (await res.json()) as T
}

export function fetchPokemon(idOrName: string | number, signal?: AbortSignal) {
  return getJson<ApiPokemon>(`${API}/pokemon/${idOrName}`, signal)
}

export function fetchSpecies(idOrName: string | number, signal?: AbortSignal) {
  return getJson<ApiSpecies>(`${API}/pokemon-species/${idOrName}`, signal)
}

export function fetchEvolutionChain(url: string, signal?: AbortSignal) {
  return getJson<{ id: number; chain: EvolutionNode }>(url, signal)
}

/** 从 PokeAPI 的资源 URL 中抠出数字 id，例如 .../pokemon-species/6/ -> 6 */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/)
  return match ? Number(match[1]) : 0
}

/** 把树状的进化链拍平成「阶段 -> 节点」的数组，方便渲染成分组列表 */
export function flattenEvolution(
  node: EvolutionNode,
  stage = 0,
  acc: { stage: number; id: number; name: string; detail: string }[] = []
) {
  acc.push({
    stage,
    id: idFromUrl(node.species.url),
    name: node.species.name,
    detail: describeEvolution(node.evolution_details[0]),
  })
  for (const child of node.evolves_to) {
    flattenEvolution(child, stage + 1, acc)
  }
  return acc
}

const TRIGGER_LABELS: Record<string, string> = {
  'level-up': '升级',
  trade: '通信交换',
  'use-item': '使用道具',
  shed: '蜕皮',
  spin: '原地旋转',
  'tower-of-darkness': '恶之塔',
  'tower-of-waters': '水之塔',
  'three-critical-hits': '三次会心一击',
  'take-damage': '承受伤害',
  agile: '迅疾',
  strong: '刚猛',
  'other': '其他',
}

function describeEvolution(detail: EvolutionNode['evolution_details'][0]): string {
  if (!detail) return '初始形态'
  const parts: string[] = []
  const trigger = detail.trigger?.name ? TRIGGER_LABELS[detail.trigger.name] ?? detail.trigger.name : ''
  if (trigger) parts.push(trigger)
  if (detail.min_level) parts.push(`Lv.${detail.min_level}`)
  if (detail.item) parts.push(detail.item.name.replace(/-/g, ' '))
  return parts.length ? parts.join(' · ') : '特殊条件'
}

/** 取一条中文（没有则英文）图鉴描述，并把换行符清洗掉 */
export function pickFlavorText(species: ApiSpecies): string {
  const entry =
    species.flavor_text_entries.find((f) => f.language.name === 'zh-Hans') ??
    species.flavor_text_entries.find((f) => f.language.name === 'en')
  return entry ? entry.flavor_text.replace(/[\n\f\r]/g, ' ') : '暂无图鉴描述。'
}

export const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'special-attack',
  'special-defense',
  'speed',
] as const
