/**
 * 从 PRD 原型里提取卡池，生成 `src/data/card-pool.ts`。
 *
 *   node scripts/build-card-pool.mjs
 *
 * 为什么是「从原型提取」而不是「打 TCGdex 建池」：
 * PRD §8.1 的采样脚本要发 ~700 次请求、跑几分钟，是一次性的建池动作。
 * 那个池子已经建好并内联在原型里了（599 张），直接提取即可。
 * 真要扩池（比如把 UR 从 6 张补到 40 张）时，再照 §8.1 写采集脚本。
 *
 * 只保留三个页面真正用到的字段。原型的 illustrator / category / hp /
 * types / localId / dexId 只服务 PRD §13 的卡片详情弹层（M5），本次不做。
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = 'docs/nami/dailydraw prototype.html'
const OUT = 'src/data/card-pool.ts'

const html = readFileSync(SRC, 'utf8')
const match = /const POOL = (\[.*?\]);\n/s.exec(html)
if (!match) throw new Error(`在 ${SRC} 里找不到 POOL 常量`)

const pool = JSON.parse(match[1])
if (!pool.length) throw new Error('POOL 是空的')

// 未知档位不该静默通过 —— 空桶会让抽卡时静默退化成 N 桶，很难查。
const TIERS = new Set(['N', 'R', 'SR', 'SSR', 'UR'])
const bad = pool.filter((c) => !TIERS.has(c.tier))
if (bad.length) throw new Error(`有 ${bad.length} 张卡的 tier 不认识：${bad[0].id}`)
if (pool.some((c) => !c.id || !c.name)) throw new Error('有卡缺 id 或 name')

const slim = pool.map((c) => ({
  id: c.id,
  name: c.name,
  image: c.image || null,
  rarity: c.rarity || '',
  tier: c.tier,
  setName: c.setName || '',
}))

const counts = {}
for (const c of slim) counts[c.tier] = (counts[c.tier] ?? 0) + 1

const body = slim.map((c) => `  ${JSON.stringify(c)},`).join('\n')

writeFileSync(
  OUT,
  `/**
 * 卡池 —— 构建期产物，运行时零请求（PRD §8.3）。
 *
 * 由 \`scripts/build-card-pool.mjs\` 生成，**请勿手改**。
 * 来源：${SRC} 里内联的 POOL 常量，${slim.length} 张
 * 各档卡数：${Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(' / ')}
 *
 * ⚠️ 这张表是**快照**。卡池一旦变化，历史抽卡记录的重算结果会跟着变 ——
 * 见 \`lib/gacha.ts\` 的 SEED_VERSION 注释。
 */
import type { CardRarity } from '@/lib/gacha'

export interface PoolCard {
  id: string
  name: string
  /** 不带扩展名的基址，拼 /low.webp 或 /high.png */
  image: string | null
  /** TCGdex 的原始自由文本，如 "Secret Rare" */
  rarity: string
  tier: CardRarity
  setName: string
}

export const CARD_POOL: PoolCard[] = [
${body}
]

/** 按稀有度分桶。抽卡只在桶内取样，所以这个索引建一次就够。 */
export const CARD_BUCKETS: Record<CardRarity, PoolCard[]> = {
  N: [],
  R: [],
  SR: [],
  SSR: [],
  UR: [],
}
for (const card of CARD_POOL) CARD_BUCKETS[card.tier].push(card)
`,
)

console.log(`已写出 ${OUT}：${slim.length} 张`, counts)
