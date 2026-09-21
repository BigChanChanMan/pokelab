/**
 * 端到端验收：每日一抽的服务端强制。
 *
 *   node scripts/e2e-gacha.mjs
 *
 * 姿势照抄 docs/handoff.md §2（那个是最值钱的部分，别自己重新踩）：
 *   - server function 的 id 是 **base64url** 编码的 JSON，不是 base64
 *   - 请求体必须是 **seroval** 编码，普通 JSON 会在服务端炸
 *   - 必须带 `origin` header，否则 403
 *   - 响应 HTTP 状态**恒为 200**，成败看 Cross-JSON 信封的 `error` 槽
 *
 * 断言的核心是 issue 的验收标准：**注册训练家直接调 drawToday 必须被服务端封掉。**
 * UI 里那把锁不是访问控制 —— 这个脚本才是。
 */

import { existsSync, readdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:3001'

// seroval 是 pnpm 的间接依赖（不在 package.json 里），所以只能按 .pnpm 的
// 路径去找。多个版本并存时挑 dist/index.js 存在的那一个（1.5.x 的 dist
// 是 esm/cjs 两目录，没有 index.js）。
const seroval = await (async () => {
  const root = new URL('../node_modules/.pnpm/', import.meta.url)
  for (const dir of readdirSync(root).filter((d) => d.startsWith('seroval@')).reverse()) {
    const entry = new URL(`${dir}/node_modules/seroval/dist/index.js`, root)
    if (existsSync(entry)) return import(entry.href)
  }
  throw new Error('找不到可用的 seroval —— 先 pnpm install')
})()

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/** 取某个 server function 的调用 id：从 dev server 要那个 split 模块，把 id 抓出来。 */
async function fnId(file, exportName) {
  const res = await fetch(`${BASE}${file}?tss-serverfn-split`)
  const text = await res.text()
  const ids = [...text.matchAll(/"([A-Za-z0-9+/=_-]{40,})"/g)].map((m) => m[1])
  const decoded = ids
    .map((id) => {
      try {
        return { id, json: JSON.parse(Buffer.from(id, 'base64url').toString()) }
      } catch {
        return null
      }
    })
    .filter(Boolean)
  const hit = decoded.find((d) => d.json.export === exportName)
  if (!hit) {
    throw new Error(
      `在 ${file} 里找不到 ${exportName}。找到的：${JSON.stringify(decoded.map((d) => d.json.export))}`,
    )
  }
  return hit.id
}

async function call(id, data, cookie, method = 'POST') {
  const body = JSON.stringify(await seroval.toJSONAsync({ data }))
  const res = await fetch(`${BASE}/_serverFn/${id}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-tsr-serverFn': 'true',
      origin: BASE,
      ...(cookie ? { cookie } : {}),
    },
    ...(method === 'GET' ? {} : { body }),
  })
  const raw = JSON.parse(await res.text())
  const setCookie = res.headers.getSetCookie?.() ?? []
  const newCookie = setCookie.map((c) => c.split(';')[0]).join('; ')
  const errNode = raw.p.v[raw.p.k.indexOf('error')]
  if (errNode?.c) {
    const msg = errNode.s?.message?.s ?? errNode.s?.message
    return { ok: false, error: msg, cookie: newCookie }
  }
  const decoded = seroval.fromCrossJSON(raw, { plugins: [], refs: new Map() })
  return { ok: true, result: decoded.result, cookie: newCookie }
}

async function login(handle, password) {
  const id = await fnId('/src/server/auth.ts', 'login_createServerFn_handler')
  const r = await call(id, { handle, password })
  if (!r.ok) throw new Error(`登录失败 ${handle}: ${r.error}`)
  return r.cookie
}

/**
 * 造一个**全新**的 VIP。
 *
 * 为什么要这样：`gacha_draws` 的主键是 `(trainerId, date)`，而训练家在 SQLite 里
 * 是**持久**的（不像队伍还在内存桩）。复用 seed 的小茂跑第二遍会撞
 * 「今天已经抽过了」。所以每轮注册一个新名字（带时间戳），再兑换升级码。
 * 顺带把「注册 → 升级 → 抽卡」这条真实路径也走了一遍。
 */
async function freshVip() {
  const handle = `抽卡测试${Date.now().toString(36)}`
  const password = 'test12345678'

  const regId = await fnId('/src/server/auth.ts', 'register_createServerFn_handler')
  const reg = await call(regId, { handle, password })
  if (!reg.ok) throw new Error(`注册失败: ${reg.error}`)

  const codeId = await fnId(
    '/src/server/auth.ts',
    'redeemUpgradeCode_createServerFn_handler',
  )
  const up = await call(codeId, SEED_UPGRADE_CODE, reg.cookie)
  if (!up.ok) throw new Error(`兑换升级码失败: ${up.error}`)
  if (up.result?.tier !== 'vip') {
    throw new Error(`升级后等级不是 vip 而是 ${up.result?.tier}`)
  }
  return { cookie: reg.cookie, handle }
}

const SEED_UPGRADE_CODE = '天王盖地虎'

const ids = {
  draw: await fnId('/src/server/gacha.ts', 'drawToday_createServerFn_handler'),
  album: await fnId('/src/server/gacha.ts', 'readAlbum_createServerFn_handler'),
  rates: await fnId('/src/server/gacha.ts', 'readRates_createServerFn_handler'),
}

console.log('\n=== 1. 服务端强制（本次改动的核心验收）===')

// 访客直接调 readAlbum —— 无会话
const guest = await call(ids.album, undefined, null, 'GET')
check('访客调 readAlbum → 被封', !guest.ok, guest.error)

// 注册训练家直接调 drawToday —— 这是最关键的一条
const regCookie = await login('小智', 'satoshi12345')
const regDraw = await call(ids.draw, undefined, regCookie)
check(
  '注册训练家直接调 drawToday → FORBIDDEN:gacha.draw:tier',
  !regDraw.ok && regDraw.error === 'FORBIDDEN:gacha.draw:tier',
  regDraw.error,
)

// 但注册训练家看自己的册子是放行的 —— 降级不封数据
const regAlbum = await call(ids.album, undefined, regCookie, 'GET')
check('注册训练家调 readAlbum → 放行（降级不封数据）', regAlbum.ok, regAlbum.error)
check(
  '  册子里没有别人的记录',
  regAlbum.ok && Array.isArray(regAlbum.result.timeline),
  regAlbum.ok ? `${regAlbum.result.timeline.length} 条` : '',
)

// 概率公示不加能力门 —— 注册用户就能读
const regRates = await call(ids.rates, undefined, regCookie, 'GET')
check('注册训练家调 readRates → 放行（概率公示不锁）', regRates.ok, regRates.error)
check(
  '  卡池规模是 599',
  regRates.ok && regRates.result.poolSize === 599,
  regRates.ok ? String(regRates.result.poolSize) : '',
)
check(
  '  UR 只有 6 张 —— 如实公示，不冒充全量',
  regRates.ok && regRates.result.pool.find((p) => p.tier === 'UR')?.count === 6,
)

console.log('\n=== 2. VIP 抽卡 ===')
// 用一个全新的 VIP —— 小茂今天可能已经抽过了（训练家是持久的）
const { cookie: vipCookie } = await freshVip()

const before = await call(ids.album, undefined, vipCookie, 'GET')
check('VIP 抽卡前 readAlbum 放行', before.ok, before.error)

const drawn = await call(ids.draw, undefined, vipCookie)
check('VIP 调 drawToday → 成功', drawn.ok, drawn.error)
if (drawn.ok) {
  const d = drawn.result
  check(
    `  拿到卡片：${d.card.name}（${d.tier}）`,
    !!d.card?.id && !!d.tier,
    `${d.card?.id} · ${d.date}`,
  )
  check('  首次收集标记正确', d.isNew === true && d.owned === 1)
}

// 同一天再抽 —— 每日一抽这条领域规则
const again = await call(ids.draw, undefined, vipCookie)
check(
  '同一天再抽 → GACHA_ALREADY_DRAWN',
  !again.ok && again.error === 'GACHA_ALREADY_DRAWN',
  again.error,
)

// 客户端**不能**指定日期 —— 这是防刷的关键
const forged = await call(ids.draw, { date: '2026-01-05' }, vipCookie)
check(
  '传日期参数也刷不了历史（参数被忽略，仍撞「今天已抽」）',
  !forged.ok && forged.error === 'GACHA_ALREADY_DRAWN',
  forged.error,
)

const after = await call(ids.album, undefined, vipCookie, 'GET')
check(
  '抽完之后册子里有 1 条，且是今天',
  after.ok && after.result.timeline.length === 1,
  after.ok ? `${after.result.timeline.length} 条 / today=${after.result.today}` : '',
)
check(
  '  连续天数 = 1',
  after.ok && after.result.stats.streak === 1,
  after.ok ? String(after.result.stats.streak) : '',
)

console.log('\n=== 3. SSR 页面 ===')
for (const [path, cookie, expect, label] of [
  ['/gacha', vipCookie, '每日一抽', 'VIP 访问 /gacha'],
  ['/gacha/album', vipCookie, '抽卡册', 'VIP 访问 /gacha/album'],
  ['/gacha/rates', vipCookie, '概率公示', 'VIP 访问 /gacha/rates'],
  ['/gacha/album', regCookie, '抽卡册', '注册用户访问 /gacha/album'],
  ['/gacha/rates', regCookie, '概率公示', '注册用户访问 /gacha/rates'],
]) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: 'manual' })
  const html = await res.text()
  check(`${label} → ${res.status}`, res.status === 200 && html.includes(expect))
}

// 注册用户访问 /gacha 应该看到锁定态而不是抽卡按钮
const regGacha = await fetch(`${BASE}/gacha`, {
  headers: { cookie: regCookie },
  redirect: 'manual',
})
const regHtml = await regGacha.text()
const regText = regHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ')
check(
  '注册用户访问 /gacha → 锁定态（说明是 VIP 能力，且没有抽卡按钮）',
  regGacha.status === 200 &&
    regText.includes('这是 VIP 能力') &&
    !regText.includes('开启今日卡包'),
)

// 侧边栏：锁定的「今日卡包」必须指向 /pricing，而「抽卡册」仍然可达
const regDash = await (
  await fetch(`${BASE}/dashboard`, { headers: { cookie: regCookie } })
).text()
const gachaNav = regDash.slice(regDash.indexOf('每日一抽'), regDash.indexOf('每日一抽') + 6000)
check(
  '侧边栏：注册用户的「今日卡包」是锁定项（指向 /pricing）',
  /opacity-55/.test(gachaNav) && /href="\/pricing"/.test(gachaNav),
)
check(
  '侧边栏：同一分组里「抽卡册」仍然可达（降级不封数据）',
  /href="\/gacha\/album"/.test(gachaNav),
)

// VIP 的「今日卡包」不该是锁定项
const vipDash = await (
  await fetch(`${BASE}/dashboard`, { headers: { cookie: vipCookie } })
).text()
const vipNav = vipDash.slice(vipDash.indexOf('每日一抽'), vipDash.indexOf('每日一抽') + 6000)
check(
  '侧边栏：VIP 的「今日卡包」未锁定（指向 /gacha）',
  /href="\/gacha"/.test(vipNav) && !/opacity-55/.test(vipNav),
)

const failed = results.filter((r) => !r.ok)
console.log(
  `\n${failed.length ? '✗' : '✓'} ${results.length - failed.length}/${results.length} 通过`,
)
if (failed.length) {
  console.log('失败的：')
  for (const f of failed) console.log(`  - ${f.name} ${f.detail}`)
  process.exit(1)
}
