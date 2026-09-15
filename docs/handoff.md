# 交接文档 · 2026-09-15

写给**下一个在 pokelab 里开对话的 agent**。当前 HEAD `ff69215`，`main` 干净，
六个 issue 全部 CLOSED，两个 PR 已合。

先读 `DESIGN.md`，再读这份。这份只记录「DESIGN 里没有、但会浪费你半天」的东西。

---

## 1. 现在的状态

DESIGN.md §10 的实施路线，**阶段 0–4 已完成**：

| 阶段 | 状态 | 落在哪 |
|---|---|---|
| 0 · 三套外壳 | ✅ | `routes/__root.tsx` / `_console.tsx` / `_public.tsx` |
| 1 · 身份桩 | ✅ | `server/trainer.ts` + `routes/login.tsx` + `_console/settings.tsx` |
| 2 · 能力层 | ✅ | `lib/capabilities.ts` + `server/middleware.ts` |
| 3 · 队伍 CRUD | ✅ | `lib/team.ts` + `server/teams.ts` + `server/team-store.ts` |
| 4 · 队伍诊断 | ✅ | `lib/diagnose.ts` + `routes/_console/diagnose.tsx` |
| **5 · 持久化** | ⬜ **下一个** | SQLite + Drizzle，替换 `server/team-store.ts` 的内存桩 |
| **6 · 真账号** | ⬜ | 换掉 `server/trainer.ts`，**其余文件零改动** |

**阶段 6 是接缝设计的验收**：如果换身份实现时要动 `getTrainer()` 之外的文件，
说明 §5.1 的接缝失败了 —— 回头修接缝，别打补丁。

### 已经能跑的东西

- `_public/` 下的 `index` / `dex` / `guide` / `lab` / `matchup` 是从 pokebrutal 移植的**真页面**，不是占位
- `_console/` 下的 `teams` / `diagnose` 是真功能
- `_console/` 下的 `battles` / `calc` / `export` / `meta` 是 `FeaturePage` **占位**

### 留着的坑（DESIGN 附录点名的）

- **没有 `CONTEXT.md`** —— §2 的术语还是「待确认提案」，没拆出来
- **没有 `docs/adr/`** —— 「用能力模型而不是 `isVip`」这个决定满足 ADR 三条判据
  （难逆、外人看了会疑惑、有真实取舍），值得写一条
- **`.env` / `.env.example` 都还不存在** —— DESIGN §12 列了 `SESSION_SECRET`
  和 `DATABASE_URL`，现在跑起来一个都不需要（没有真签名、没有库）

### 还没定的产品决策

DESIGN §2 末尾那段压力测试，**只答了一半**：

> 访客 A 构筑了一支队伍并存到本地，然后注册。这支队伍现在算谁的？
> 它应该占用 A 的注册配额吗？如果 A 后来降级，第 5 支队伍该被删掉、冻结、还是只读？

- **降级那一问已答**：只读（`teamSlots()` 的可写窗口）。见下面第 3 节。
- **访客队伍归属还没答**。`teams.trainerId` 在 DESIGN §9 里是**可空**的，
  就是为这个问题留的口子 —— schema 允许两种答案，定下来再回填。
  现在 `server/teams.ts` 的 `trainerId()` 直接拒绝无 id 的访客
  （`FORBIDDEN:no-identity`），等于暂时选了「访客不能存」。
  真做「访客本地建队」时，改的是这个函数和 team-store，不是权限层。

---

## 2. ⚠️ 手动驱动 server function 的完整姿势（这个最值钱）

如果你要绕过 UI 直接验证服务端强制（**你应该这么做**，见第 5 节），
下面每一条都是实测踩出来的。手写 JSON 打不通，会让你以为产品坏了。

### 2.1 端点与必需的 header

```
POST http://localhost:<port>/_serverFn/<id>
  content-type: application/json
  x-tsr-serverFn: true
  origin: http://localhost:<port>     ← 缺这个直接 403
  cookie: pokelab_session=...
```

### 2.2 id 从哪来：dev 和 built **不一样**

- **`vite dev`（3000）**：id 是 base64 的 JSON blob，
  `{"file":"/src/server/teams.ts?tss-serverfn-split","export":"<fn>_createServerFn_handler"}`
- **`vite build` + `vite preview`**：id 是 sha256 hex

**两边的 id 不通用** —— built 的 sha256 喂给 dev server 会得到
「Invalid server function ID」。老老实实挑一边测。

sha256 的提取（按 handler 出现顺序配对，和源码里的 export 顺序一致）：

```bash
node -e "
const fs=require('fs');
for (const f of fs.readdirSync('.output/public/assets'))
  if (f.startsWith('teams-') && f.endsWith('.js'))
    console.log(fs.readFileSync('.output/public/assets/'+f,'utf8')
      .match(/\.handler\(e\(.([0-9a-f]{64})./g));
"
```

配对时要连着前面的 `.middleware([i('team.create')])` 一起看，
才能知道哪个 id 对应哪个能力。

### 2.3 请求体必须是 seroval 编码，**不能是普通 JSON**

客户端用 `toJSONAsync` 编码。手写 `{"data":"队伍1"}` 会在服务端
`Seroval Error (step: 3)` 炸掉（HTTP 500）—— 这是**编码问题，不是产品缺陷**。

```js
const S = await import('file:///.../seroval/dist/index.js')  // 记得用 file:// URL
const body = JSON.stringify(await S.toJSONAsync({ data }))
```

seroval 在 `node_modules/.pnpm/seroval@1.6.7/node_modules/seroval/dist/index.js`。
Windows 上 ESM 不认 `D:\...` 绝对路径，必须 `pathToFileURL()` 转成 `file://`。

### 2.4 响应是 Cross-JSON 信封，**HTTP 状态恒为 200**

```
{"t":10,"i":0,"p":{"k":["result","error","context"],"v":[...]}}
```

**被拒绝时状态码也是 200。** 判断成败要看 `error` 槽，不是 `res.status`。

- **结果**槽：不含插件，走 `fromCrossJSON(raw, { plugins: [], refs: new Map() })` 正常解
- **错误**槽：带 `$TSR/Error` 插件（节点上有 `c` 字段），裸 seroval 解不了

可靠的分支方式 —— **用 `c` 字段区分，不要用「槽里有没有东西」**，
因为成功时 `error` 槽也是个普通引用节点，非 null：

```js
const raw = JSON.parse(await res.text())
const errNode = raw.p.v[raw.p.k.indexOf('error')]
if (errNode?.c) {                                  // 真错误
  const msg = errNode.s?.message?.s ?? errNode.s?.message
  return { ok: false, error: msg }
}
const decoded = S.fromCrossJSON(raw, { plugins: [], refs: new Map() })
return { ok: true, result: decoded.result }
```

这个坑我踩了两次 —— 第一次误判成「所有 createTeam 都失败」。

### 2.5 内存桩不隔离，测试要每次换 `trainerId`

`server/team-store.ts` 是模块级 Map，**进程内跨请求共享，重启才清**。
用固定的 `dev-registered` 跑两次测试，第二次会被第一次的队伍吃掉配额。
给每轮测试的 cookie 换个新 id（`dev-registered-<Date.now()>`）。

---

## 3. 两处非显然的设计，改之前先读

### 3.1 可写窗口复用**同一个** `can()`

`lib/team.ts` 的 `teamSlots()`：

```ts
[...teams].sort((a, b) => a.createdAt - b.createdAt)
  .map((team, index) => ({ team, index, writable: can(trainer, 'team.create', { used: index }).allowed }))
```

**排序后的 `index` 就是已消耗的配额数。** 所以「创建时检查」和「读取时检查」
是同一个函数的两次调用，全项目仍然只有一处权限判定（CLAUDE.md 硬约束 1）。

别把它重写成「先算 count 再比较 limit」—— 那会变成第二个权限判断。

### 3.2 `enforceCapability()` 是抽出来给测试用的

`server/middleware.ts` 里，真正的逻辑在一个**独立的纯函数**上，
`requireCapability(cap)` 的 `.server()` 只是调它。

原因：DESIGN §7.4 要求「断言访客调用诊断能力会抛错」。
抽出来之后这个断言是普通单测，不用起 HTTP、不用造 servern-fn context。
**别把它内联回中间件**，否则那条自检就没法测了。

### 3.3 中间件里的两次 `can()` 不是重复检查

`server/teams.ts` 的 `createTeam`：

```ts
.middleware([requireCapability('team.create')])   // 第一次：不带 usage，只判等级
.handler(async ({ context, data: name }) => {
  const verdict = can(context.trainer, 'team.create', { used })  // 第二次：带 usage，判配额
  if (!verdict.allowed) throw new Error('FORBIDDEN:team.create:quota')
```

同一个函数，一次判等级一次判配额。看着像两次检查，其实是 DESIGN §6.4
说的「配额的两层含义」。CLAUDE.md 硬约束 1 禁的是**第二个判定函数**，不是第二次调用。

---

## 4. 验证手段

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run —— 4 个文件 24 个用例
pnpm build       # vite build
pnpm preview     # 起 preview，默认 4173；我用 4281 避开冲突
```

单测覆盖：`capabilities.test.ts` / `team.test.ts` / `diagnose.test.ts` /
`middleware.test.ts`。

**测试有个已知噪音**：vitest 退出时会打一行
`ReferenceError: module is not defined`（来自 react 的 CJS 入口）和
`close timed out`，但 **24 个用例全绿**。是环境噪音，不是失败。

### 端到端怎么验

上一轮的验证脚本在 job 临时目录里，**已经随 job 一起清掉了**，需要重建。
按第 2 节的姿势写，覆盖这几条：

1. 免费用户建第 1~3 支通过、**第 4 支**得到 `FORBIDDEN:team.create:quota`
2. 改名 / 加成员 / 删成员 / 删队伍全通；满 6 只后第 7 只 `TEAM_FULL`
3. 图鉴外编号 `UNKNOWN_SPECIES`（注意：**队伍满时 `TEAM_FULL` 会先拦下来**，
   要拿一支有空位的队伍测）
4. 免费用户 curl `diagnoseTeam` → `FORBIDDEN:team.diagnose:tier`
5. 访客 curl `createTeam` → `FORBIDDEN:team.create:tier`；无 cookie → `FORBIDDEN:no-identity`
6. **降级**：同一个 `trainerId` 先按 vip 建 5 支，再把 cookie 的 tier 改成 registered ——
   5 支一支没少，第 1~3 支可写，第 4/5 支的改名/删除/加成员全部
   `FORBIDDEN:team.create:quota-readonly`；升回 vip 后第 5 支重新可写
7. SSR 层面：无 cookie 时四个 `_console` 路由都 307 到 `/login`；
   注册身份的 `/diagnose` 渲染锁定页（不是功能页），VIP 的渲染功能页；
   降级后 `/teams` 出现「只读」徽章且 5 支都在

**没做到的**：没有真开浏览器点按钮。SSR HTML 断言 + 直接打服务端函数
覆盖了「渲染对」和「服务端封得住」，**覆盖不了点击行为本身**。
如果新对话需要更强的保证，得引入 playwright（现在没装）。

---

## 5. 仓库约定

- 包管理器 **pnpm**（有 `pnpm-lock.yaml`）
- issue 在 GitHub Issues，用 `gh` CLI；标签词表见 `docs/agents/triage-labels.md`
- 分支流：`feat/xxx` → PR → squash 合进 `main` → 删分支
- **commit / PR 结尾带 `Co-Authored-By: Claude ...` / `🤖 Generated with [Claude Code]`**

### 两条硬约束（CLAUDE.md，别违反）

1. **权限判定只有一处** —— `lib/capabilities.ts` 的 `can()`。UI 和服务端都调它。
   出现第二个权限判断就是 bug。（第 3.1 节那个设计就是为守住这条）
2. **每个能力必须同时在服务端强制**。UI 里隐藏按钮**不是**访问控制。

### 一个 Windows 特有噪音

`src/routeTree.gen.ts`（生成文件）会时不时被 `git status` 报 modified，
但 index hash 和 worktree hash 其实**完全相同** —— `core.autocrlf=true`
导致的 stat cache 过期。`git update-index --refresh src/routeTree.gen.ts` 消掉即可。
**别 commit 它**，也别以为丢东西了。

---

## 6. 下一步建议

按 DESIGN §10，**阶段 5（SQLite + Drizzle）**。动手前先看 DESIGN §9 的三个刻意决定
（`teams.trainerId` 可空、`battles.opponentSnapshot` 是快照、`members.position`
不是数组下标），它们是 schema 层面的领域规则，不是随手写的。

然后是阶段 6（换掉 `getTrainer()`），验收标准是**其余文件零改动**。

再往后是 DESIGN 附录点名、至今没做的：拆 `CONTEXT.md`、写第一条 ADR。
这两件事和阶段 5 没有依赖关系，可以随时插队。
