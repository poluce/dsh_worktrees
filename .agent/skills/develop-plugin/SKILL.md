---
name: develop-plugin
description: 开发、扩展或修复 DeepSeek Harness (DSH) 插件。当用户要求新建插件、给现有插件加工具/服务/UI、修复插件加载或工具调用问题、或把插件打包安装发布时使用。覆盖形态判断、项目骨架、host/client 实现、构建、验证、安装与发布全流程。
---

# DSH 插件开发

本仓库的插件开发执行流程。开发前先读本仓库 `docs/` 知识库（见文末文档指引），不确定的 API 以官方文档站和 npm 产物为准，不凭记忆写。

## 触发条件

- 新建一个 DSH 插件（工具、命令、服务、UI、设置卡片）。
- 给现有插件添加能力或修复问题。
- 把插件打包成 bundle、安装到 profile、发布。

## 开发流程

### 0. 先读文档

按需读 `docs/` 对应章节（见文末文档指引），确认：插件形态、目标 API 契约、目标版本。DSH 处于开发者预览期，API 会演进，动手前核对目标版本的官方文档与 npm 产物。

### 1. 形态判断

| 需求 | 形态 |
|---|---|
| 工具、system prompt、HTTP、持久化、provider | host 面 |
| slot、Conversation Node、浏览器状态和浮层 | client 面 |
| host 能力 + Web 可视化 | host + client 双面 |
| 没有 Web 需求 | 只做 host，不声明 `dsh.client`，不构建 client bundle |

### 2. 项目骨架

```
dsh-my-plugin/
├── package.json          # dsh.bundle + dsh.client + exports
├── cordis.patch.yml      # 向 host 组合插入插件行
├── tsconfig.json         # host 编译（排除 src/client）
├── tsconfig.client.json  # client 编译（jsx: react-jsx，仅双面插件需要）
├── tsdown.config.ts      # client bundle 构建（仅双面插件需要）
└── src/
    ├── index.ts          # host 入口：name/inject/Config/apply
    ├── tools.ts          # 工具注册（可选，大插件拆文件）
    └── client/           # 浏览器入口（仅双面插件）
        └── index.tsx     # 必须是 .tsx 才能写 JSX
```

最小可安装包（免构建，纯 ESM）：

```
hello-plugin/
├── package.json       # 声明 dsh.bundle
├── cordis.patch.yml   # 插入插件行
└── index.js           # 插件模块
```

### 3. host 实现

**函数插件四要素**（无 default export）：

```ts
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const name = 'my-plugin'              // 必须与 patch 行 id 一致
export const inject = ['tools']              // 必需服务；未就绪时插件保持 pending
export interface Config { stateDir?: string }
export const Config: z<Config> = z.object({ stateDir: z.string().default('.agent-teams') })
export function apply(ctx: Context, config: Config): void { /* ... */ }
```

**工具注册**（唯一正确方式）：

```ts
import { defineTool } from '@deepseek-ai/dsh-tools'

ctx.tools.register(defineTool({
  name: 'my_tool',                          // snake_case
  description: '……模型看到的完整契约……',
  parameters: {
    arg: { type: 'string', required: true, description: '……' },
    status: { type: 'string', enum: ['a', 'b'], description: '……' },
  },
  output: {
    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true } } },
    render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
  },
  async execute(args, exec) {
    const caller = exec.agent            // 调用者 Agent（cwd、session、id）
    if (!caller) throw new Error('requires a calling agent')
    return { ok: true }                  // 返回符合 output.schema 的 canonical value
  },
}))
```

schema DSL 硬规则：`required` 属性内联（无数组、无 `required: false`）；对象 schema 必须显式 `additionalProperties`；`output` 必填；`execute` 不是 `run`。

**服务注入**：`inject` 只等服务，不等 provider 注册（兄弟插件 effect 可能晚于你的 apply）。依赖兄弟插件行为的校验延迟到首次真正使用处（最早可解析点 fail-loud）。

**HTTP 路由**：`ctx.effect(() => web.register({ kind: 'exact'|'prefix', path, handler }), 'label')`；服务名过渡期用 `ctx.get('webServer') ?? ctx.get('httpServer')`；静态资源白名单防路径穿越。

**持久化**：路径显式配置；读改写串行化（promise 链互斥）；JSON 用临时文件 + fsync + 原子发布；并发创建用 `link()`+`unlink()` no-clobber。

### 4. client 实现（双面插件）

- 双 tsc program：host 排除 `src/client`；client 含 `src/client` + 共享事件类型文件（**零 import**）。
- 含 JSX 的文件必须 `.tsx`；tsc 需要 5.7+（`rewriteRelativeImportExtensions`）。
- client bundle 用 tsdown 复刻官方 `tsdown.client.ts` 协议：CJS closure-factory（`window.__ModuleLoader__.load({ id, factory })`）、purity gate、CSS Modules 内联、lib→src 回退。
- UI 接缝 slot 优先：`ctx.slots.inject(key, () => ctx.slots.register({ name, ... }, Component))` 等待声明；keyed 必填 `key`、list 必填 `id`、chain 必填 `select`；向未声明 slot 直接 register 会抛错。
- 对话流内嵌 UI = Conversation Node：`match`/`start`/`update`/`buildViewNode` + `conversation.chat.node` keyed renderer；重放同一事件序列必须得到同一节点。
- 设置卡片双半侧：Host 半侧 `ctx.settings.installSection(ctx, NS, Config, config, ...)` + 浏览器半侧 `settings.plugin.item` keyed slot，命名空间是配对键。

### 5. 构建

```sh
pnpm build   # tsc host → tsc client → tsdown（client.js）
```

产物检查：`lib/index.js` 存在；`grep -rE "from './[^']+\.ts'" lib/` 无 `.ts` 残留。

### 6. 验证（从快到慢）

1. `pnpm typecheck`（双 program）→ 2. `pnpm build` → 3. 纯逻辑 verify 脚本 → 4. `dsh --profile <scratch> --dump-config`（组合树含插件行）→ 5. headless 真实任务 → 6. 独立 web 实例 + curl 探名册/路由 → 7. 真实浏览器 GUI 端到端。

验证全程用独立 profile/独立端口，不触碰正在运行的实例。

### 7. 安装与发布

```sh
dsh plugin --profile <profile> add <包名或本地路径>   # 安装后重启 profile
dsh --profile <profile> --dump-config                # 验证层出现
dsh plugin --profile <profile> remove <包名>          # 移除
```

- 分发：npm 包（预构建产物）/ tarball / Git（源码 + `prepare` 脚本，pnpm ≥10 需用户 `allowBuilds`，固定 commit）。
- 发布：`npm publish --access public`；仓库打 `dsh-plugin` topic。
- 版本注意：CLI 与 bundle 必须同通道（`npx -p @deepseek-ai/dsh@<版本>` 固定）；peer 范围写 rc 通道；`@deepseek-ai` scope 需要官方只读 token（只放环境变量）。

## 踩坑速查

| 症状 | 解决 |
|---|---|
| `Property 'tools' does not exist on type 'Context'` | 双 Cordis：全链统一 `@deepseek-ai/cordis` |
| 插件崩溃 "no service available" | 补 `export const inject = ['tools']` |
| 工具注册了但模型从不调用 | 重写 `description`（它就是模型契约） |
| patch 行 `id` 与 `export const name` 不一致 | 工具静默不注册，保持一致 |
| object schema 注册失败 | 显式 `additionalProperties: false` |
| `TS5097` / 产物残留 `./x.ts` | tsconfig 补 `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` |
| `TS5096`+`TS5023`（typecheck 过、emit 挂） | TypeScript < 5.7，升 `typescript@^5.9` |
| JSX 报成串 `TS1005 '>' expected` | 文件必须是 `.tsx` |
| `declare module` 合并不生效 | 合并文件顶部加 `import type {} from '<目标模块>'` |
| 首次启动随机报 provider 未注册 | 不在 apply 校验 provider，延迟到首次使用 |
| 浏览器名册不收录插件 | 修正 `dsh.client`/`exports["./client"]` 后重启 host |
| "waiting for service: settingsScope" | CLI 与 bundle 版本不同通道，固定同通道 |
| Windows `ERR_UNSUPPORTED_ESM_URL_SCHEME` | 用 `pathToFileURL()` 生成 file:// URL 写进 patch |

## 文档指引

本仓库 `docs/` 知识库（总介绍：`docs/README.md`）：

| 场景 | 读 |
|---|---|
| 概念、形态、生命周期 | `docs/01-核心概念.md` |
| fiber 状态机、HMR、组合 | `docs/02-Cordis框架要点.md` |
| 事件、扩展点 | `docs/03-事件系统.md`、`docs/06-架构与扩展点.md` |
| 工具开发 | `docs/04-工具开发.md` |
| 配置、服务 | `docs/05-配置与服务.md` |
| 打包、安装、发布 | `docs/07-打包安装与分发.md` |
| 双面插件、UI | `docs/08-Host与Client双面开发.md` |
| 报错排查 | `docs/09-踩坑清单.md` |
| 验证、发布 checklist | `docs/10-验证与发布.md` |
| 来源链接 | `docs/11-参考资料.md` |

官方文档站：<https://deepseek-harness.github.io/deepseek-harness/>（`/develop` 404，内容在 `/develop/basic/`、`/develop/cordis-tutorial/`、`/develop/framework/`、`/develop/practice/`、`/reference/` 下）。抓页面用 `curl`，正文在 `<div class="vp-doc">` 内。
