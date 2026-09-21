# 交接文档 · 2026-09-21

写给**下一个在 pokelab 里开对话的 agent**。`main` 干净，之前的六个 issue 全部 CLOSED。

先读 `DESIGN.md`（尤其 §10 末尾的「2026-09-21 状态修订」），再读这份。
这份只记录「DESIGN 里没有、但会浪费你半天」的东西。

---

## 1. 现在的状态

| 阶段 | 状态 | 落在哪 |
|---|---|---|
| 0 · 三套外壳 | ✅ | `routes/__root.tsx` / `_console.tsx` / `_public.tsx` |
| 1 · 身份桩 | ✅ **已被替换** | 见下面阶段 6 |
| 2 · 能力层 | ✅ | `lib/capabilities.ts` + `server/middleware.ts` |
| 3 · 队伍 CRUD | ✅ | `lib/team.ts` + `server/teams.ts` + `server/team-store.ts` |
| 4 · 队伍诊断 | ✅ | `lib/diagnose.ts` + `routes/_console/diagnose.tsx` |
| 5 · 持久化 | ⚠️ **只做了一半** | `db/` —— 只落了训练家，**队伍仍在内存桩** |
| 6 · 真账号 | ✅ | `server/trainer.ts` 换实现，**三个调用方一行未动** |

### ⚠️ 混合存储状态（最容易被误判成 bug 的事）

**训练家在 SQLite 里，队伍在内存里。** 重启 dev server 后：
训练家还在，**队伍没了**。这是**刻意的**，不是 bug ——
真登录的核心是凭据能被持久验证，而队伍重启即失是**这次改动之前就存在**的行为。

`teams` / `members` / `battles` 三张表的 schema 仍以 DESIGN §9 为准，**未建**。
下一步就是建它们，把 `server/team-store.ts` 换掉（阶段 5 的剩下一半）。

### 阶段 6 的验收结论

DESIGN §10 要求「换掉 `getTrainer()` 时其余代码零改动」。**接缝通过了** ——
三个调用方（`_console.tsx:21`、`middleware.ts:36`、`login.tsx` 的 loader）一行未动。

其余文件的改动来自**新需求**（管理员档、注册、升级码、管理后台），
不是来自「换身份实现」。这两件事在 DESIGN §10 末尾被分开写了，别混。

### 演示账号（`pnpm db:seed`）

```
admin    / admin12345      (admin)
小智      / satoshi12345    (registered)
小茂      / shigeru12345    (vip)

升级码：天王盖地虎
```

seed 是**幂等**的（按训练家名判断），可以反复跑。**管理员的唯一来源就是它** ——
界面上不能授予 admin（服务端也拒绝），但**可以降级**另一个管理员。

---

## 2. ⚠️ 手动驱动 server function 的完整姿势（这个最值钱）

如果你要绕过 UI 直接验证服务端强制（**你应该这么做**），下面每一条都是实测踩出来的。

### 2.1 端点与必需的 header

```
POST http://localhost:<port>/_serverFn/<id>
  content-type: application/json
  x-tsr-serverFn: true
  origin: http://localhost:<port>     ← 缺这个直接 403
  cookie: pokelab_session=...
```

**GET 类型的 server function 要用 GET 方法**，带 body 会得到
`expected GET method. Got POST`（返回的是纯文本，不是 JSON，`JSON.parse` 会炸）。

### 2.2 id 的编码：**必须用 `base64url`，不是 `base64`**

这是个新踩的坑。id 是 base64url 编码的 JSON blob：

```js
const id = Buffer.from(JSON.stringify({
  file: '/src/server/auth.ts?tss-serverfn-split',   // ← 注意 ?tss-serverfn-split 后缀
  export: 'login_createServerFn_handler',
})).toString('base64url')                            // ← base64url，不是 base64
```

用 `base64` 会得到 `Invalid server function ID`（因为 base64 的 `+` `/` `=` 在 URL 里
会被改写，验签对不上）。**dev 和 built 的 id 不一样**（built 是 sha256 hex），
老老实实挑一边测。

最省事的取 id 方式 —— 直接从 dev server 要那个 split 模块，把 id 抓出来：

```bash
curl -s "http://localhost:3001/src/server/auth.ts?tss-serverfn-split" \
  | grep -aoE '"[A-Za-z0-9+/=_-]{40,}"'
```

### 2.3 请求体必须是 seroval 编码，**不能是普通 JSON**

```js
const S = await import(pathToFileURL('.../seroval/dist/index.js').href)
const body = JSON.stringify(await S.toJSONAsync({ data }))
```

手写 `{"data":"队伍1"}` 会在服务端 `Seroval Error` 炸掉 —— **是编码问题，不是产品缺陷**。
Windows 上 ESM 不认 `D:\...` 绝对路径，必须 `pathToFileURL()`。

### 2.4 响应是 Cross-JSON 信封，**HTTP 状态恒为 200**

**被拒绝时状态码也是 200。** 判断成败要看 `error` 槽，不是 `res.status`：

```js
const raw = JSON.parse(await res.text())
const errNode = raw.p.v[raw.p.k.indexOf('error')]
if (errNode?.c) {                                  // 用 c 字段区分，不要用「槽里有没有东西」
  const msg = errNode.s?.message?.s ?? errNode.s?.message
  return { ok: false, error: msg }
}
const decoded = S.fromCrossJSON(raw, { plugins: [], refs: new Map() })
return { ok: true, result: decoded.result }
```

成功时 `error` 槽也是个普通引用节点，**非 null** —— 用「有没有东西」判断会误判。

### 2.5 cookie 拿法

```js
const setCookie = res.headers.getSetCookie()          // Node 22 有这个方法
const cookie = setCookie.map((c) => c.split(';')[0]).join('; ')
```

### 2.6 内存桩不隔离

`server/team-store.ts` 是模块级 Map，**进程内跨请求共享，重启才清**。
跑配额测试时给每轮换个新训练家名。**训练家现在在 SQLite 里，是持久的** ——
所以重复跑同一份脚本会撞 `AUTH_NAME_TAKEN`，名字里带时间戳。

---

## 3. 几处非显然的设计，改之前先读

### 3.1 `server/trainer.ts` 只能导出 `createServerFn`

它被客户端路由 import。一旦导出普通函数（比如写 cookie 的辅助），构建期
import-protection 会因为 `react-start/server` 拒绝整个客户端图：

```
[import-protection] Import denied in client environment
  Denied by specifier pattern: @tanstack/react-start/server
  Importer: src/server/trainer.ts
```

**所以会话的写入侧在 `server/cookies.ts`。** 别把它挪回来。

### 3.2 可写窗口复用**同一个** `can()`

`lib/team.ts` 的 `teamSlots()`：排序后的 `index` **就是**已消耗的配额数，
把它喂给 `can(trainer, 'team.create', { used: index })`。
所以「创建时检查」和「读取时检查」是同一个函数的两次调用。
**别把它重写成「先算 count 再比较 limit」** —— 那会变成第二个权限判断。

### 3.3 `enforceCapability()` 是抽出来给测试用的

`server/middleware.ts` 里真正的逻辑在一个**独立的纯函数**上，
`requireCapability(cap)` 的 `.server()` 只是调它。抽出来之后
「断言访客调用诊断能力会抛错」是普通单测，不用起 HTTP。
**别把它内联回中间件。**

### 3.4 中间件里的两次 `can()` 不是重复检查

`server/teams.ts` 的 `createTeam`：中间件判等级（不带 usage），
handler 里再判一次配额（带 usage）。DESIGN §6.4 说的「配额的两层含义」。
CLAUDE.md 硬约束 1 禁的是**第二个判定函数**，不是第二次调用。

### 3.5 管理后台有三道门，缺一不可

| 层 | 位置 | 作用 |
|---|---|---|
| 侧边栏 | `app-sidebar.tsx` 的 `ADMIN` 分组 | 看不看得见 |
| 页面守卫 | `_console/admin.tsx` 的 `beforeLoad` | 进不进得来 |
| 服务端 | `server/admin.ts` 的 `requireCapability` | 能不能执行 |

**只有第一道不是访问控制。** 另外 `setTrainerTier` 里还有两条**只在服务端**的规则：
拒绝设成 admin（`ASSIGNABLE_TIERS`）、拒绝改自己 —— 界面上少一个选项不算访问控制。

### 3.6 密码与会话的两个「绝不抛错」

`verifyPassword()` 遇到坏哈希返回 `false`；`verify()` 遇到坏 cookie 返回 `null`。
和 `getTrainer()` 同一个性质：**坏数据不该让调用方崩，只该走失败那条路**。
两条都有测试固化。

---

## 4. 验证手段

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run —— 7 个文件 52 个用例
pnpm build       # vite build
pnpm db:generate # 改 schema 后生成迁移
pnpm db:migrate  # 应用迁移
pnpm db:seed     # 造演示账号（幂等）
```

单测覆盖：`capabilities` / `team` / `diagnose` / `middleware` /
`password` / `session`。

**测试有个已知噪音**：vitest 退出时会打一行 `ReferenceError: module is not defined`
（来自 react 的 CJS 入口）和 `close timed out`，但**用例全绿**。环境噪音，不是失败。

### 端到端怎么验

按第 2 节的姿势写脚本。**上一轮的脚本随 job 清掉了**，需要重建。覆盖这几条
（2026-09-21 这轮全跑过、全绿）：

1. 注册 → 拿到签名 cookie；弱密码 `AUTH_WEAK_PASSWORD`；重名 `AUTH_NAME_TAKEN`
2. 错误密码和**不存在的训练家名**都给 `AUTH_BAD_CREDENTIALS`（不泄露哪些名字存在）
3. **篡改 cookie 兑换升级码 → 失败**（这是本次改动的核心验收）
4. 升级码错 `CODE_INVALID`、对 → 升到 vip
5. 普通用户调 `listTrainers` → `FORBIDDEN:user.manage:tier`
6. 管理员 `listTrainers` 通过；**改自己** → `FORBIDDEN:user.manage:self`；
   **把别人设成 admin** → `FORBIDDEN:user.manage:tier-not-assignable`
7. 管理员降级别人 → 成功
8. **改密码后旧 cookie 失效、新 cookie 可用**
9. 登出返回 `Max-Age=0` 的 cookie
10. SSR 层面：`/admin` 对管理员 200、对 VIP/注册训练家 307 到 `/dashboard`、
    对访客 307 到 `/login`；已登录访问 `/login` 307 到 `/dashboard`；
    管理员侧边栏有「管理」分组且**没有**「升级」角标

**没做到的**：没有真开浏览器点按钮。SSR HTML 断言 + 直接打服务端函数
覆盖了「渲染对」和「服务端封得住」，**覆盖不了点击行为本身**。

---

## 5. 仓库约定

- 包管理器 **pnpm**（有 `pnpm-lock.yaml`）
- issue 在 GitHub Issues，用 `gh` CLI；标签词表见 `docs/agents/triage-labels.md`
- 分支流：`feat/xxx` → PR → squash 合进 `main` → 删分支
- **commit / PR 结尾带 `Co-Authored-By: Claude ...` / `🤖 Generated with [Claude Code]`**

### 两条硬约束（CLAUDE.md，别违反）

1. **权限判定只有一处** —— `lib/capabilities.ts` 的 `can()`。UI 和服务端都调它。
   出现第二个权限判断就是 bug。（第 3.2 节那个设计就是为守住这条）
2. **每个能力必须同时在服务端强制**。UI 里隐藏按钮**不是**访问控制。

### 一个 Windows 特有噪音

`src/routeTree.gen.ts`（生成文件）会时不时被 `git status` 报 modified，
但 index hash 和 worktree hash 其实**完全相同** —— `core.autocrlf=true` 导致的
stat cache 过期。`git update-index --refresh src/routeTree.gen.ts` 消掉即可。
**别 commit 它。**

---

## 6. 下一步建议

1. **阶段 5 的剩下一半**：建 `teams` / `members` / `battles` 三张表，
   把 `server/team-store.ts` 的内存桩换掉。动手前先看 DESIGN §9 的五个刻意决定。
2. **`teams.trainerId` 可空那个口子还没收**（DESIGN §2 的压力测试）。
   现在 `server/teams.ts` 的 `trainerId()` 直接拒绝访客，等于暂时选了「访客不能存」。
   建表时要定下来。
3. **没做的管理功能**（都是有理由的，见 DESIGN 附录）：管理员建号、重置他人密码、
   停用/删除训练家。

