# CLAUDE.md

## 项目

**POKÉLAB** — 训练家工作台。`pokebrutal` 的续作，演示「装出来的 UI 怎么承载一套真的权限系统」。

**先读 `DESIGN.md`。** 它是这个项目的第一份产物，包含布局架构、身份与能力模型、
服务端强制、以及从 pokebrutal 带过来的已知坑。任何改动前先对齐它。

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.

## 本项目的两条硬约束

1. **权限判定只有一处**：`src/lib/capabilities.ts` 的 `can()`。UI 和服务端都调它。
   任何地方出现第二个权限判断，都是 bug。
2. **每个能力必须同时在服务端强制**。UI 里隐藏按钮不是访问控制。
