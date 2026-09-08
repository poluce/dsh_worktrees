# AGENTS.md

本仓库是一个 DSH 插件：`dsh-worktrees`。它可被 dsh 安装和卸载，在 dsh UI 界面里管理项目不同功能的开发（基于 git worktree）。

## 仓库结构

- `src/` — 插件代码。host 入口 `src/index.ts`，UI 在 `src/client/`。
- `docs/` — 插件开发知识库。总介绍 `docs/README.md` + 11 篇独立文档，每篇可单独改写。
- `.agents/skills/` — 技能：
  - `develop-plugin` — 插件开发全流程。开发插件前先加载，按流程走。
  - `update-docs` — 更新 docs/ 知识库。
- `package.json` — bundle manifest，声明 `dsh.bundle.patch`。
- `cordis.patch.yml` — 向 host 组合插入插件行。

## 开发约定

- 插件代码在仓库根，不在子目录。
- 直接 main 开发、提交、推送。没有"每插件一分支"的约定。
- 本机 npm 配置了 `omit=dev`，安装依赖用 `npm install --include=dev`。
- 依赖版本与 dsh CLI 同通道（当前 `@deepseek-ai/dsh-tools@0.1.2-rc.1`，本机 dsh `0.1.2-rc.1`）。
- 构建：`npm run typecheck` → `npm run build`。
- 验证：`dsh plugin --profile <scratch> add .` + `--dump-config` 确认插件层；独立 profile，不碰运行中的实例。
- 安装/卸载：`dsh plugin --profile <profile> add|remove dsh-worktrees`，之后重启 profile。

## 开发插件时

1. 先加载 `develop-plugin` 技能。
2. 按技能第 0 步和用户确认插件类型（给模型用的工具 / 给用户用的 UI / 命令），不要默认做工具插件。
3. 不确定的 API 以官方文档站和 npm 产物为准，不凭记忆写。

## 更新文档时

1. 先加载 `update-docs` 技能。
2. 每篇文档独立成文，只改目标篇；结构变化时同步 `docs/README.md` 和根 `README.md`。

## 环境

- git 2.53、node 22、pnpm 11、dsh CLI 0.1.2-rc.1（`/usr/bin/dsh`）。
- DSH 处于开发者预览期，API 会演进。
