# POKÉLAB — 训练家工作台 · 设计文档

> 延续 `pokebrutal` 的练手项目。同一套技术栈（TanStack Start + shadcn Registry + neobrutalism），
> 但需求复杂度上一个量级：**它需要侧边栏，也需要 VIP**。
>
> 本文档是**新项目的第一份产物**，不是对 `pokebrutal` 的改造方案。
>
> 状态：草案。第 2 节的领域模型是待确认的提案，其余章节的架构结论不依赖它。

---

## 0. 一句话定位

`pokebrutal` 演示的是「shadcn registry 协议能装出什么 UI」。

本项目演示的是「**装出来的 UI 怎么承载一套真的权限系统**」——侧边栏只是它的容器，
VIP 才是它的主题。

这是一条自然的教学梯度：上一个项目回答「组件从哪来」，这个项目回答「组件装完之后呢」。

---

## 1. 项目定位与边界

### 做什么

一个面向宝可梦对战玩家的**训练家工作台**。核心是「构筑队伍 → 分析队伍 → 记录对战」。

### 不做什么（明确划掉，避免范围失控）

- ❌ 不做实时对战 / 联机
- ❌ 不做对战模拟引擎（伤害计算可以做，完整回合模拟不做）
- ❌ 不做社区 / 好友 / 聊天
- ❌ 不对接游戏本体，不读存档
- ❌ 不做真实支付。VIP 是**权限系统演示**，付费流程用一个假的升级按钮代替

最后一条很重要：一旦引入真实支付，工程量会瞬间盖过权限系统本身，而练手目标就丢了。

### 与 `pokebrutal` 的关系

| | pokebrutal | pokelab |
|---|---|---|
| 目的 | 演示 registry 协议与组件 | 演示权限系统与真实数据流 |
| 数据 | 静态 TS 模块 + 实时 PokeAPI | 自有数据库 |
| 身份 | **无** | 三档等级 |
| 布局 | 单一外壳（Header + Footer） | **三套外壳** |
| 复用 | — | 组件层（`components/ui/*`）可整体拷过去 |

组件层几乎可以原样复用 —— neobrutalism 的 21 个组件就是这个项目的起点资产。
直接 `cp` 过去比重新 `shadcn add` 一遍更稳（原因见 §11 坑 1）。

---

## 2. 领域模型（待确认提案）

**这一节是词汇表，不是 spec。** 确认后拆成独立的 `CONTEXT.md`。
正式项目里 `CONTEXT.md` 只放术语定义，**不放任何实现细节**。

### 术语

**训练家 (Trainer)**
使用本平台的人。有身份、有等级、有配额。
_注意区分_：本文档说「训练家」时，指的是**这个平台上的账号**；
说「宝可梦」时，指的是**被构筑的对象**。两者绝不能混用 ——
「训练家的属性」和「宝可梦的属性」是两个完全不同的概念，后者是游戏机制，前者是权限。

**访客 (Guest)**
未登录的访问者。是一个**隐式的训练家**，等级最低。
_设计约束_：访客不是一个特殊的 UI 分支，而是等级轴上的一档。见 §5。

**注册训练家 (Registered)**
已登录。有基础配额（队伍数、对战记录数）。

**VIP**
高级等级。解锁诊断、环境报告、导出等能力。

**等级 (Tier)**
训练家的权限层级，只有三档：`guest` / `registered` / `vip`。
_为什么只有三档_：第 4 档（比如「教练」「战队」）在没有真实需求前是纯负担。
加第 4 档的成本在 §5 的能力模型下约为 5 行代码，所以**不需要现在预留**。

**能力 (Capability)**
一个**具体的、可执行的动作**，例如 `team.diagnose`。
等级是**人的属性**，能力是**动作的属性**。两者通过一张映射表连接。

**配额 (Quota)**
带数量的能力，例如「最多创建 3 支队伍」。配额随等级变化。

**队伍 (Team)**
最多 6 只成员的集合。有名字。

**成员 (Member)**
队伍里的一只宝可梦**加上它的配置**。一支队伍里同一物种最多一只，所以成员的身份是
它自己（名称 + 配置这个组合），不是物种。

**配置 (Loadout)**
成员的那六项设定：配招 / 道具 / 特性 / 性格 / 努力值 / 太晶属性。
_规则_：一个成员有且只有一个配置。配置不属于队伍，属于成员。

**对战记录 (Battle)**
一次对局的结果。记录对手队伍的**快照**，不是引用 —— 对手的队伍可能被删掉或修改，
历史记录不能因此变化。

**诊断 (Diagnosis)**
对一支队伍自动生成的问题清单：属性弱点叠加、速度线缺口、重复职能。
_VIP 能力_。这条是本项目里「值得付费」的第一个真功能，选它是因为它的输出
**不可由人一眼算出**，而不是因为它技术上难做。

### 一段压力测试（用来验证术语站得住）

> 访客 A 构筑了一支队伍并存到本地，然后注册。这支队伍现在算谁的？
> 它应该占用 A 的注册配额吗？如果 A 后来降级（VIP 到期），
> 第 5 支队伍该被删掉、冻结、还是只读？

文档层面**不在这里回答**——这是产品决策，属于实施阶段。
写出来是为了说明：`Trainer` / `Team` / `Tier` / `Quota` 这四个术语
必须划清楚，否则这个问题根本无法被准确提出。

---

## 3. 技术选型

沿用 `pokebrutal` 已跑通的部分，只补它缺的。

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | **TanStack Start** | 已有经验。`shellComponent` + 文件式路由正是多套壳方案的基础 |
| UI | **neobrutalism registry** | 已有资产，21 个组件直接复用 |
| 样式 | **Tailwind v4**（CSS-first） | 同上，`@theme inline` 已配好 |
| 后端 | **TanStack Start `createServerFn`** | 无需另起服务。权限强制必须在这里（§7） |
| 数据库 | **SQLite + Drizzle** | 零配置、单文件、可提交、可删。练手项目的正确选择 |
| 身份 | **签名的 HttpOnly cookie session** | 不引 auth 库。见下方说明 |
| 测试 | **Vitest**（只测 `can()` 和诊断算法） | 权限判定是这个项目唯一的「不能错」的逻辑 |

### 为什么不用 auth 库

Better Auth / Lucia 这类库解决的是「OAuth、邮箱验证、密码重置、多设备会话管理」。
本项目**不做真实支付、不做邮件、不做第三方登录**，上面每一项都用不到。

一个签名 cookie 大约 30 行：

```
session = base64(payload) + "." + HMAC(secret, base64(payload))
```

读的时候验签，验不过当访客处理。这就够了。

_何时该换_：真要做密码找回或第三方登录时，换掉 `getTrainer()` 一个函数即可（§6 的接缝设计）。

### 为什么 SQLite 而不是 Postgres

本项目的数据量是**单用户几十条记录**量级。SQLite 的优势在这个量级上是决定性的：
零部署、单文件、`git` 可见（开发和演示时极方便）、可以随手删库重来。

Drizzle 的 schema 是数据库无关的，将来真需要 Postgres 时改连接串 + 重跑迁移。
_ponytail: SQLite 起步；需要并发写或多实例部署时再换 Postgres，迁移成本已被 Drizzle 吃掉。_

---

## 4. 布局架构 ★

**这一节回答最初的问题：侧边栏怎么进来才不破坏现有布局。**

### 4.1 问题的本质

`pokebrutal` 的结构是：

```
__root.tsx  (shellComponent)
└── <SiteHeader /> <main>{children}</main> <SiteFooter />
```

`shellComponent` 包住**所有**路由，路由自身无法退出。
想在某一支路由上换成侧边栏布局，就会和根壳里的 Header/Footer 打架。

**但这个结构本身没有错，错的是「可见的 chrome 放错了层」。**

### 4.2 原则：根壳只管「不是布局的东西」

`__root.tsx` 的职责应该收窄到：

- `<html>` / `<head>` / `<Scripts>`
- 全局字体与样式
- 全局 Provider（Tooltip、主题）
- 错误边界

**任何看得见的 Header / Footer / Sidebar，一律下沉到布局路由。**
根壳里不放任何一个可见的导航元素。

### 4.3 方案：无路径布局路由

TanStack Router 的无路径布局路由（文件名以 `_` 开头）正是为此设计的。

```
src/routes/
├── __root.tsx                    ← 只管 html / provider / 错误边界。零可见 chrome
│
├── _console.tsx                  ← 控制台外壳：SidebarProvider + Sidebar + SidebarInset
├── _console/
│   ├── dashboard.tsx             →  /dashboard
│   ├── teams/
│   │   ├── index.tsx             →  /teams
│   │   └── $teamId.tsx           →  /teams/:teamId
│   ├── battles.tsx               →  /battles
│   ├── diagnose.tsx              →  /diagnose        ★ VIP
│   ├── meta.tsx                  →  /meta            ★ VIP
│   ├── calc.tsx                  →  /calc
│   └── settings.tsx              →  /settings
│
├── _public.tsx                   ← 公开外壳：SiteHeader + SiteFooter
├── _public/
│   ├── index.tsx                 →  /
│   ├── pricing.tsx               →  /pricing
│   ├── dex/
│   │   ├── index.tsx             →  /dex
│   │   └── $id.tsx               →  /dex/:id
│   └── matchup.tsx               →  /matchup
│
└── login.tsx                     →  /login     (两套壳都不套，登录页要独占整屏)
```

`_console.tsx` 和 `_public.tsx` 各自长这样：

```tsx
// src/routes/_console.tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_console')({
  beforeLoad: async () => {
    const trainer = await getTrainer()
    if (trainer.tier === 'guest') throw redirect({ to: '/login' })
    return { trainer }          // 向下传给所有子路由
  },
  component: ConsoleLayout,
})

function ConsoleLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ConsoleHeader />         {/* logo / 搜索 / 主题切换 / 头像 */}
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

```tsx
// src/routes/_public.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_public')({ component: PublicLayout })

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1"><Outlet /></main>
      <SiteFooter />
    </div>
  )
}
```

### 4.4 这个方案的收益

- **`pokebrutal` 的页面视觉一行不用改** —— 只是从「被根壳自动包住」变成「被 `_public.tsx` 包住」
- 控制台页面**完全不受** Header/Footer 影响
- 加第三套壳（比如全屏的 `/present` 演示模式）成本接近零
- 根壳里的 Provider 对所有外壳共享，不会重复实例化

_迁移成本_：把现有 `routes/*.tsx` 移进 `_public/` 目录，加两个 `_*.tsx` 文件。
纯机械操作，无逻辑改动。

### 4.5 侧边栏与 Header 的关系

三种可能，必须选一个：

| 方案 | 说明 | 判断 |
|---|---|---|
| (a) 侧边栏取代 Header | 控制台内无顶栏 | ❌ 主题切换和账号入口无处安放 |
| (b) 侧边栏 + **精简顶栏** | 顶栏只放 logo / 搜索 / 主题 / 头像，**不放导航** | ✅ **推荐** |
| (c) 侧边栏 + 完整顶栏 | 两层导航并列 | ❌ 导航项重复出现，视觉噪音最大 |

推荐 **(b)**。判据很简单：**导航项永远只在一处出现。**
顶栏存在的理由是「放那些不属于导航的东西」。

`SidebarInset` 就是给这个准备的 —— 它是内容区容器，你的顶栏放在它内部。

---

## 5. 身份与等级模型 ★★

**这是整个项目的核心，也是 `pokebrutal` 完全没有的部分。**

### 5.1 一条主线：单一接缝

整个身份系统只通过**一个函数**对外暴露：

```ts
// src/server/trainer.ts
export async function getTrainer(): Promise<Trainer> {
  // 读 cookie → 验签 → 查库 → 返回
  // 任何异常 → 返回 GUEST 常量，不抛错
}
```

**这是本项目最重要的一个设计决定。** 它的价值在于：

- 现在可以是「读一个 dev cookie 决定等级」的桩
- 将来换成真实 session 时，**所有调用方一行不改**
- 测试时可以整个替换掉

`GUEST` 是一个具名常量，不是 `null`：

```ts
const GUEST: Trainer = { id: null, handle: '访客', tier: 'guest' }
```

**访客不是「没有训练家」，而是「等级为 guest 的训练家」。**
这个区别决定了后面所有代码：不需要到处写 `if (!user)`，只需要问 `can(trainer, cap)`。

### 5.2 三档等级

```ts
type Tier = 'guest' | 'registered' | 'vip'
const TIER_RANK: Record<Tier, number> = { guest: 0, registered: 1, vip: 2 }
```

用**有序的 rank** 而不是字符串相等判断。这样「VIP 能用的东西注册用户也能用吗」
这类问题变成一次数字比较，而不是一张需要维护的真值表。

### 5.3 为什么不做成 `isVip: boolean` ★

这是本节最重要的一条，值得单独说。

`isVip` 布尔值看起来能省很多事，但它有三个致命问题：

1. **加第三档就崩**。`isVip` 表达不了 guest / registered / vip 三态，
   于是你会长出 `isLoggedIn` + `isVip` 两个布尔值 —— 四种组合里有一种非法，
   而类型系统抓不住它。
2. **能力和等级被焊死**。「必须是 VIP」和「必须是注册用户」会被硬编码进
   `if (isVip)` 里，散落在几十个组件中，无法统一审计。
3. **无法 grep**。想知道「哪些功能是 VIP 专属」，你得搜 `isVip`，
   然后逐个人肉判断每一处的语义。

**能力模型把「谁」和「能干什么」解耦成一张可枚举、可审查、可测试的表。**

---

## 6. 能力模型

### 6.1 定义

```ts
// src/lib/capabilities.ts
export const CAPABILITIES = {
  'team.create':   { minTier: 'registered', quota: { registered: 3,        vip: Infinity } },
  'team.diagnose': { minTier: 'vip' },
  'meta.report':   { minTier: 'vip' },
  'battle.record': { minTier: 'registered', quota: { registered: 30,       vip: Infinity } },
  'export.image':  { minTier: 'vip' },
  'calc.basic':    { minTier: 'guest' },      // 访客也能用 ← 引流
  'dex.browse':    { minTier: 'guest' },
} as const satisfies Record<string, CapabilitySpec>

export type Capability = keyof typeof CAPABILITIES
```

### 6.2 唯一的判定函数

```ts
// src/lib/capabilities.ts
export type Verdict =
  | { allowed: true }
  | { allowed: false; reason: 'tier';   need: Tier }
  | { allowed: false; reason: 'quota';  limit: number; used: number }

export function can(
  trainer: Trainer,
  cap: Capability,
  usage?: { used: number }        // 只有配额类能力需要
): Verdict
```

**全项目只有这一个地方判断权限。** UI 用它、服务端用它、测试也用它。

### 6.3 测试（这个小函数必须测）

这是整个项目唯一「错了会出事」的逻辑，配一个小的表驱动测试：

```ts
// src/lib/capabilities.test.ts
const cases: [Tier, Capability, boolean][] = [
  ['guest',      'deck.browse',   true ],
  ['guest',      'team.create',   false],
  ['registered', 'team.create',   true ],
  ['registered', 'team.diagnose', false],   // ← 关键：注册用户拿不到 VIP 能力
  ['vip',        'team.diagnose', true ],
]
```

第四条是关键用例。它固化了一条产品规则：**等级是阶梯，不是集合。**
VIP 拥有注册用户的全部能力，外加自己的。

### 6.4 配额的两层含义

配额不只是数量，还有**时机**：

- **创建时检查**：`team.create` 配额已满 → 拒绝创建
- **读取时检查**：降级后已有 5 支队伍 → 前 3 支可写，后 2 支**只读**

第二种情况是最容易被忽略的，也是 §2 压力测试问的问题。
处理原则：**降级不删数据**。数据是用户的，等级只影响「能不能改」。
这条如果做错，用户会真的丢东西。

---

## 7. 服务端强制 ★★★

**这一节如果做错，整个 VIP 系统就是假的。**

### 7.1 铁律

> **UI 里隐藏一个按钮，不是访问控制。**

侧边栏藏起来的 VIP 菜单项，只要服务端函数没有拦截，任何人用 devtools 或
直接构造请求都能调用。前端做的所有权限判断，**都是 UX，不是安全**。

因此：**每一个能力，必须同时在两处判定**
1. UI 处 —— 决定「看不看得见」
2. 服务端函数处 —— 决定「能不能执行」

第 2 处是必须的，第 1 处是可选的。

### 7.2 TanStack Start 的中间件

```ts
// src/server/middleware.ts
import { createMiddleware } from '@tanstack/react-start'

export const authMiddleware = createMiddleware({ type: 'function' })
  .server(async ({ next }) => {
    const trainer = await getTrainer()
    return next({ context: { trainer } })
  })

export const requireCapability = (cap: Capability) =>
  createMiddleware({ type: 'function' })
    .middleware([authMiddleware])
    .server(async ({ next, context }) => {
      const verdict = can(context.trainer, cap)
      if (!verdict.allowed) {
        throw new Error(`FORBIDDEN:${cap}:${verdict.reason}`)
      }
      return next({ context: { ...context, verdict } })
    })
```

### 7.3 同一个能力，两处使用

```ts
// 服务端：强制
export const diagnoseTeam = createServerFn({ method: 'POST' })
  .middleware([requireCapability('team.diagnose')])
  .handler(async ({ data }) => runDiagnosis(data.teamId))
```

```tsx
// UI：呈现
const verdict = can(trainer, 'team.diagnose')
{verdict.allowed
  ? <Link to="/diagnose">队伍诊断</Link>
  : <LockedNavItem need={verdict.need} />}
```

两处调的是**同一个 `can()`**，所以它们不可能不一致。
这就是能力模型最大的价值 —— 它让 UI 和服务端的权限判断**共用同一份真相**。

### 7.4 一个自检

写一条测试：用一个 `guest` 训练家直接调用 `diagnoseTeam`，
**断言它抛错**。这条测试保护的是整个 VIP 系统的真实性。

_ponytail: 一条断言，不是一套测试框架。够用。_

---

## 8. 侧边栏菜单设计

### 8.1 菜单结构

按**职能分组**，VIP 区单独成组：

```
┌────────────────────────┐
│  ⚡ POKÉLAB            │
├────────────────────────┤
│  工作台                 │
│    总览        /dashboard
│    我的队伍    /teams
│    对战记录    /battles
│                        │
│  分析                   │
│    伤害计算    /calc
│    属性克制    /matchup
│                        │
│  图鉴                   │
│    宝可梦      /dex
├────────────────────────┤
│  ADVANCED          [VIP]│   ← 分组标题带 VIP 徽章
│    🔒 队伍诊断  /diagnose
│    🔒 环境报告  /meta
│    🔒 导出分享  /export
├────────────────────────┤
│  [头像] 训练家名        │
│         注册训练家 ▸升级│   ← 升级入口常驻
└────────────────────────┘
```

### 8.2 锁定项：隐藏、禁用，还是显示？

三种处理，判据是**用户是否知道这个能力存在**：

| 情况 | 处理 | 理由 |
|---|---|---|
| 能力对用户**不存在** | 隐藏 | 显示一个用户无法理解的东西，只是噪音 |
| 能力存在但**等级不够** | **显示 + 锁 + 引导** | ← VIP 产品的全部意义 |
| 能力**限额用尽** | 显示 + 用量提示 | 用户需要知道「为什么不行」和「怎么才行」 |

**对 VIP 产品来说，锁定的菜单项就是产品本身。** 全藏起来，用户无从知道
升级能得到什么，升级率归零。

所以：`ADVANCED` 分组**永远显示**，锁图标常驻，点进去是 `/pricing`。

### 8.3 三种视觉状态

需要区分，否则用户分不清「坏了」和「要钱」：

- **可用** —— 正常样式
- **锁定** —— 降低不透明度 + 锁图标 + `cursor-not-allowed`，点击**不导航**，而是打开升级弹窗
- **限额用尽** —— 正常样式 + 角标显示 `3/3`，点击导航过去但显示空态与升级引导

`SidebarMenuBadge` 正好用来显示配额角标。

### 8.4 移动端

`sidebar.json` 的 `registryDependencies` 里带了 `sheet`，移动端会自动降级成抽屉。
这点不用自己写，但要确认 `sheet` 装成功了（见 §11）。

---

## 9. 数据模型

```ts
// src/db/schema.ts
export const trainers = sqliteTable('trainers', {
  id:        text('id').primaryKey(),
  handle:    text('handle').notNull().unique(),
  tier:      text('tier').$type<Tier>().notNull().default('registered'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const teams = sqliteTable('teams', {
  id:        text('id').primaryKey(),
  trainerId: text('trainer_id').references(() => trainers.id),   // ← 可空，见下
  name:      text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const members = sqliteTable('members', {
  id:         text('id').primaryKey(),
  teamId:     text('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  speciesId:  integer('species_id').notNull(),
  ability:    text('ability'),
  item:       text('item'),
  nature:     text('nature'),
  teraType:   text('tera_type'),
  evs:        text('evs', { mode: 'json' }).$type<EVs>(),
  moves:      text('moves', { mode: 'json' }).$type<string[]>(),
  position:   integer('position').notNull(),      // 队伍内的槽位
})

export const battles = sqliteTable('battles', {
  id:            text('id').primaryKey(),
  trainerId:     text('trainer_id').references(() => trainers.id).notNull(),
  result:        text('result').$type<'win' | 'loss'>().notNull(),
  opponentSnapshot: text('opponent_snapshot', { mode: 'json' }).notNull(),  // ← 快照非引用
  playedAt:      integer('played_at', { mode: 'timestamp' }).notNull(),
})
```

### 三个刻意的决定

1. **`teams.trainerId` 可空** —— 支持「访客在本地建的队伍」。§2 的压力测试问的
   就是它注册之后怎么归属。可空是把这个决策**推迟**而不是**回避**：schema 允许
   两种答案，产品决策后回填即可。

2. **`battles.opponentSnapshot` 是快照** —— 对手队伍被删改后，历史记录不能跟着变。
   这是 §2 里写明的一条领域规则，在 schema 层面兑现。

3. **`members.position` 而不是数组顺序** —— 队伍槽位是领域概念（1–6 号位），
   不是数组下标。用整数列表达，排序稳定且可查询。

### 迁移

Drizzle Kit 生成迁移，`drizzle/` 目录提交进 git。
SQLite 文件本身**不提交**（加进 `.gitignore`），演示数据用 `seed.ts` 重建。

---

## 10. 实施路线

**顺序是关键：权限骨架必须在功能之前。** 后期补权限是这类项目最贵的错误 ——
每一个已经写好的功能函数都要回头改一遍签名。

| 阶段 | 内容 | 验收标准 | 量级 |
|---|---|---|---|
| **0 · 骨架** | 脚手架上加三套壳（`__root` / `_console` / `_public`），空白侧边栏 | 两套壳互不干扰，`/` 和 `/dashboard` 各自正确 | 半天 |
| **1 · 身份桩** | dev cookie 切换器 + `getTrainer()` 单一入口 + 三档 tier | 浏览器里切换等级，`getTrainer()` 返回值跟着变 | 半天 |
| **2 · 能力层** | `CAPABILITIES` 表 + `can()` + 中间件 + §6.3 的表驱动测试 | 用一个假 VIP 函数验证：guest 调用**抛错** | 半天 |
| **3 · 第一个真功能** | 队伍 CRUD（免费能力） | 能建/改/删队伍，配额生效 | 2–3 天 |
| **4 · 第一个 VIP 功能** | 队伍诊断（`team.diagnose`） | 免费用户看得见菜单但点不动；直接调服务端被封 | 2–3 天 |
| **5 · 持久化** | SQLite + Drizzle 替换内存桩 | 刷新后数据还在 | 1–2 天 |
| **6 · 真账号** | 换掉 `getTrainer()` 的实现 | **其余代码零改动** ← 这一条是对 §5.1 接缝设计的验收 | 1–2 天 |

阶段 6 的验收标准值得单独强调：如果换身份实现时需要改动 `getTrainer()` 之外的
任何文件，说明接缝设计失败了 —— 回头修接缝，而不是继续打补丁。

---

## 11. 已知的坑

前两条是 `pokebrutal` **实际踩过并记录在案**的，对本项目同样适用。

### 坑 1 · `sidebar` 的 registryDependencies 会把 `button` 装成 Radix 变体 🔴

`pokebrutal` 的 `docs/02-踩坑与决策记录.md` 里记录了这个问题：
批量安装时，某个 registry item 的 `registryDependencies` 引用了 `button`，
CLI 把它解析成 **radix 变体**，覆盖了已经装好的 base 变体，结果是：

```
src/components/ui/button.tsx(3,21): error TS2307: Cannot find module 'cn'
```

原因是装进来的 `button.tsx` 里写着 `import { Slot } from "radix-ui"` 和
`import { cn } from "cn"` —— 全是错的。

**`sidebar` 的 `registryDependencies` 恰好包含 `button`。**

**对策**：安装前先 `--dry-run` 看会动哪些文件；安装后**立刻**检查
`button.tsx` 的 import 是否还是 `@base-ui/react`；发现问题用 `--overwrite`
重新装 base 变体。

或者更省事：**从 `pokebrutal` 直接 `cp -r src/components/ui` 过来**，
跳过 CLI 解析这一步。这是本项目推荐的起点。

### 坑 2 · `use-mobile` 钩子缺失 🔴

`sidebar.tsx` 顶部有 `import { useIsMobile } from "@/hooks/use-mobile"`，
但：

- 它**不在** `registryDependencies` 里
- registry 的 54 个 item 里**没有**这个条目
- `https://neobrutalism.com/r/base/use-mobile.json` 实测返回 **404**

也就是说 `shadcn add` 跑完，`sidebar.tsx` 会带着一个解析不到的 import，
`tsc` 直接报错。

**对策**：手写 `src/hooks/use-mobile.ts`。大约 15 行：

```ts
import { useEffect, useState } from 'react'

const BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isMobile
}
```

_注意_：`false` 作为初始值是刻意的 —— SSR 阶段没有 `window`，
返回 `false`（桌面）再由 effect 纠正，避免 hydration mismatch。

### 坑 3 · `--sidebar-*` 主题变量缺失 🔴

`sidebar.tsx` 使用四个 Tailwind token：`bg-sidebar` / `text-sidebar-foreground` /
`border-sidebar-border` / `ring-sidebar-ring`。

但 registry item **既没有 `cssVars` 也没有 `css` 字段** ——
整个 registry 的 54 个 item 全都没有。`pokebrutal` 的 `src/styles.css` 里
也**一个 `--sidebar-*` 都没有**（已 grep 确认）。

**对策**：在 `styles.css` 的 `:root` 和 `.dark` 两块里各补一组。
neobrutalism 风格下建议侧边栏用 `bg-card` 同色、边框用 `--border`：

```css
:root {
  --sidebar: var(--card);
  --sidebar-foreground: var(--card-foreground);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--primary);
  --sidebar-accent: var(--accent);
  --sidebar-accent-foreground: var(--accent-foreground);
}
```

`.dark` 块里同样一份（值跟随各自的 `--card` 等）。
并在 `@theme inline` 里加映射，否则 Tailwind 不认这些类名。

### 坑 4 · `TooltipProvider` 双层嵌套

`sidebar.tsx` 内部会再套一层 `TooltipProvider`，而 `__root.tsx` 已经有一个。
**嵌套无害**（provider 是可重入的），但要知道有两层 —— 调试 tooltip 行为时别被绕进去。

### 坑 5 · cookie 状态的 SSR

`SidebarProvider` 用 cookie（`sidebar_state`，7 天）记开合状态，
但**只写了写的一半 —— 读的一半是消费者的责任**。

不处理的话：SSR 渲染成默认展开 → 客户端 hydration 读 cookie 发现是折叠 → **闪烁**。

**对策**：在 `_console.tsx` 的 `beforeLoad` 里读 cookie 并作为
`defaultOpen` 传给 `SidebarProvider`。服务端和客户端拿到同一个初值，闪烁消失。

### 坑 6 · 侧边栏宽度与 `max-w-*` 的冲突

`pokebrutal` 的页面用 `mx-auto max-w-4xl` 之类的居中容器。
放进 `SidebarInset` 后可用的横向空间变窄，原本舒适的 `max-w-4xl` 会显得局促。

**对策**：控制台内的页面容器改用 `max-w-5xl` 或不限宽 + padding。
这是纯视觉问题，但会让人觉得「布局被破坏了」—— 提前知道就不会误判成架构问题。

---

## 12. 环境与部署

```
pokelab/
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── _console.tsx  +  _console/
│   │   ├── _public.tsx   +  _public/
│   │   └── login.tsx
│   ├── components/
│   │   ├── ui/              ← 从 pokebrutal 整体拷过来
│   │   ├── app-sidebar.tsx  ← 本项目新增
│   │   └── console-header.tsx
│   ├── lib/
│   │   ├── capabilities.ts  ★
│   │   ├── utils.ts
│   │   └── type-chart.ts    ← 从 pokebrutal 拷
│   ├── server/
│   │   ├── trainer.ts       ★ getTrainer() 单一接缝
│   │   ├── middleware.ts    ★
│   │   └── session.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── seed.ts
│   ├── hooks/
│   │   └── use-mobile.ts    ← 手写，见坑 2
│   └── data/                ← 从 pokebrutal 拷（zh-names / dex）
├── drizzle/                 ← 迁移，提交进 git
└── styles.css
```

`★` 标记的是本项目的核心文件，也是**区别于 `pokebrutal` 的全部所在**。

### 环境变量

```
SESSION_SECRET=<32+ 字节随机串>     # 签名 cookie 用
DATABASE_URL=file:./local.db
```

`.env` 进 `.gitignore`，`.env.example` 提交。

---

## 附：这份文档没做什么

- **没回答 §2 的压力测试**（访客队伍归属、降级后的数据处置）—— 那是产品决策，
  应该在阶段 3 开始时定，本文档只负责把问题提准
- **没给具体页面设计**（布局、组件选用）—— 那是阶段 3 的事
- **没写支付**—— 已明确划出范围
- **没建 `CONTEXT.md` / ADR**——§2 的术语还是提案。确认后拆成 `CONTEXT.md`；
  如果「用能力模型而不是 `isVip`」这个决定落定，它满足 ADR 的三条判据
  （难逆、外人看了会疑惑、有真实取舍），值得写一条
