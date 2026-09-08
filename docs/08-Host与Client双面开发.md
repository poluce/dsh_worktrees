# Host 与 Client 双面开发

一个可安装插件 = 一个 npm 包，可以同时扮演两个角色：

- **host 面**（Node）：包根 `lib/index.js`，作为组合树里的一行插件挂载，注册工具、服务、HTTP 路由、会话事件。
- **client 面**（浏览器）：包子路径 `./client`（`lib/client.js`），被 `dsh-client-modules` 扫描进 `window.__DSH_BOOT__` 名册，在浏览器里作为 Cordis 插件跑 `apply(ctx)`，渲染 UI。

形态判断：工具、system prompt、HTTP、持久化、provider 属于 host；slot、Conversation Node、浏览器状态和浮层属于 client；host 能力需要 Web 可视化才做 host + client。没有 Web 需求就不要声明 `dsh.client`，也不要构建 client bundle。

## 双面 package.json

```jsonc
{
  "name": "dsh-my-plugin",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/types/index.d.ts",
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib", "assets", "cordis.patch.yml", "README.md"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "inject": ["@deepseek-ai/dsh-client-runtime"], "platform": "web" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json && tsc -p tsconfig.client.json && tsdown",
    "typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.client.json --noEmit"
  }
}
```

要点：

- `exports["./client"]` 是名册扫描的硬要求：`client-modules` 读它找浏览器 bundle，缺失直接拒绝该包。
- `dsh.client.platform` 必须是 `"web"`。包元数据和负结论按名称缓存，新增/删除 client 声明、修正 export 后必须重启 host。
- host 侧依赖（`@deepseek-ai/dsh-tools`、`dsh-session` 等）+ 浏览器侧依赖（`@deepseek-ai/dsh-client-runtime`、`react` 等）全部声明为 peer，运行时从 profile 的 `node_modules` 解析，不重复安装。
- `dsh.client.inject` 是随图下发的信息性元数据，不决定激活顺序；真正的依赖等待来自 client bundle 导出的 `export const inject`。

## 双 tsc program（必须拆）

host 侧 `dsh-session` 的 index 声明 `Context.sessions: SessionStore`；浏览器侧 `dsh-client-runtime` 声明 `Context.sessions: ISessions`——同名成员类型冲突，同一 program 内必居其一。拆开后互不污染。

```jsonc
// tsconfig.json —— host
{
  "compilerOptions": {
    "module": "NodeNext", "moduleResolution": "NodeNext",
    "lib": ["ES2022"], "strict": true, "noUncheckedIndexedAccess": true,
    "declaration": true, "declarationDir": "lib/types", "outDir": "lib", "rootDir": "src",
    "allowImportingTsExtensions": true, "rewriteRelativeImportExtensions": true,
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["src/client"]
}
```

```jsonc
// tsconfig.client.json —— client（extends host，覆盖）
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": []
  },
  "include": ["src/client", "src/event-types.ts", "src/css-modules.d.ts"],
  "exclude": []
}
```

规则：

- host program 绝不编译 `src/client`；client program 不能编译任何 import 了 host 侧 index 的文件。
- 共享的 host/client 事件类型文件必须**零 import**（`declare module '@deepseek-ai/dsh-session/types'` 合并即可，子路径文件不含 host 的 Context 合并，安全）。
- 含 JSX 的文件必须 `.tsx`（TS 只在 `.tsx` 里解析 JSX），输出名不变。
- tsc 需要 5.7+：`rewriteRelativeImportExtensions` 让源码里的 `./x.ts` 导入在产物里重写为 `.js`。

## client bundle 协议（tsdown）

浏览器加载的不是源码，而是 `/plugins/<id>/client.js`——一个 CJS closure-factory：

```js
window.__ModuleLoader__.load({
  id: "dsh-my-plugin",
  factory: (require) => { /* ... */ return module.exports }
})
```

构建要点（对齐官方 `packages/client/tsdown.client.ts`）：

- entry 是 tsc client program 产物 `lib/client/index.js`，输出 `lib/client.js`，`format: 'cjs'`，`platform: 'browser'`。
- 外部模块列表（`CLIENT_EXTERNALS`）从目标 checkout 的 `packages/client/web/src/platform.ts` / `tsdown.client.ts` 复制，会演进。
- CSS Modules 内联：lightningcss 编译 + `<style data-plugin>` 注入 + class map；`sourceAssetPath` 需要 lib→src 回退（tsc 产物在 `lib/client/`，css 源在 `src/client/`）。
- purity gate：`@deepseek-ai` 非 external/非内联安全包的值导入直接 build error。
- 浏览器端只能 import 平台模块、类型和明确允许的 inline-safe 包；跨插件值协作走 Cordis service。

## 选择 UI 接缝：slot 优先

先读当前版本的 `packages/client/ui-*/src/client/contract/slots.ts`。常见会话 UI 接缝：`conversation.session.header.actions`、`conversation.input.dock`、`conversation.composer.dock`、`conversation.input.left/right`、`conversation.chat.node` 等；全局浮层用 `shell.overlay`。能落入语义正确的 slot 就优先注册，只有目标版本确实没有对应 seat 的全局面板才用 body portal + fixed 定位。

Slot 四步契约：

1. **声明**：从提供 slot 的官方包拉入类型；自定义 owner 才通过 module augmentation 扩展 `SlotMap`。
2. **认领**：父 entry 的 `children` 表声明子 slot；声明即占有渲染权，不要争抢别人的 seat。
3. **注册**：owner 与贡献者的激活顺序不保证，用 `ctx.slots.inject(key, () => ctx.slots.register({ name, ... }, Component))` 等待声明。kind 参数：keyed 必填 `key`、list 必填 `id`（可加 `order`/`label`）、chain 必填 `select`。向未声明 slot 直接 register 会抛错。
4. **渲染**：owner 使用 `renderSlot`/`renderSlotChain`；贡献者不 import owner 的实现组件。

```tsx
// src/client/index.tsx
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'

export const inject = ['slots', 'sessions']

export function apply(ctx: ClientContext): void {
  const Panel = () => <ActivityPanel openSession={(id: SessionId) => { ctx.sessions.open(id) }} />
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'my-plugin-panel',
    order: 80,
  }, Panel))
}
```

## Conversation Node（对话流内嵌 UI）

对话流内嵌 UI = 注册一个 Conversation Node（浏览器端 Cordis）。它是"事件折叠 + keyed slot renderer"的组合：

1. 定义共享事件类型，merge 到 session event map（`declare module '@deepseek-ai/dsh-session/types'`，零 import）。
2. `ctx.uiConversation.events.register(definition)`：`match` 选择事件、`start` 创建节点状态、`update` 按 seq 确定性折叠、`buildViewNode` 生成稳定的 view node。
3. merge `ChatNodeDataMap` / 节点 kind 类型。
4. 向 `conversation.chat.node` 注册相同 key 的 renderer。

红线：重放同一事件序列必须得到同一节点，不读时间、随机数或当前磁盘状态。`match` 返回稳定业务 id 和 `start|update` 角色。事件写入业务 owner 会话。磁盘/服务端快照可作为实时 UI 真相；事件流用于对话投影、审计和确定性历史，两者职责不要混淆。

## HTTP 路由（host 面数据通道）

```ts
const web = (ctx.get('webServer') ?? ctx.get('httpServer')) as WebRouteHost
ctx.effect(() => web.register({
  kind: 'exact',                       // 或 'prefix'
  path: '/plugins/my-plugin/state',
  handler: async (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ /* ... */ }))
  },
}), 'my-plugin: state route')
```

- `register` 返回 disposer，必须包在 `ctx.effect(..., 'label')` 里（HMR 安全）。
- 服务可能在插件 apply 之后才绑定：首次注册失败时挂 `ctx.on('internal/service', name => ...)` 补注册。
- 静态资源路由务必做白名单（防路径穿越）：`decodeURIComponent` 包 try，用 `split('/').pop()` 剥离路径后查 Set。
- 状态接口显式设置缓存策略：敏感或实时快照优先 `Cache-Control: no-store`。
- 客户端轮询：`no-store`、in-flight 防重叠、响应形状校验、unmount/cancelled 防护，失败保留最后一份成功快照。

## 状态持久化

- 路径配置显式指定，不要用 `process.cwd()` 默认值散落用户数据。
- 状态按 workspace、session、owner 或业务 id 建立清晰隔离维度。
- 同一资源的读改写串行化（进程内 promise 链互斥）；并发创建用 `link()`+`unlink()` 的 no-clobber 协议，勿用 `rename()` 静默覆盖。
- 人可读 JSON 用同目录临时文件 + fsync + 原子发布；追加日志要处理 torn tail。
- 恢复与 HMR 不能假设创建事件会重放；需要时显式扫描和回填已有对象。

## 开发期类型链接（在 DSH checkout 之外开发时）

DSH 包不在 npm registry 发布（pre-release），开发期把依赖符号链接进项目 node_modules：

```sh
mkdir -p node_modules/@deepseek-ai
ln -sfn /path/to/DSH/vendor/cordis           node_modules/@deepseek-ai/cordis
ln -sfn /path/to/DSH/packages/core/session   node_modules/@deepseek-ai/dsh-session
ln -sfn /path/to/DSH/packages/core/tools     node_modules/@deepseek-ai/dsh-tools
```

必须链接到源码 checkout 的构建产物（`packages/<pkg>/lib/types`），不要链到运行实例的 staging 目录（可能是旧构建，`declare module 'cordis'` 而非 `'@deepseek-ai/cordis'`，声明合并不生效）。

## 参考

- 双面插件完整实战：[NanmiCoder/dsh-agent-teams 开发文档](https://github.com/NanmiCoder/dsh-agent-teams/blob/main/docs/developing-dsh-plugins.md)
- 执行型开发 Skill：[dsh-plugin-development SKILL.md](https://github.com/NanmiCoder/dsh-agent-teams/blob/main/skills/dsh-plugin-development/SKILL.md)
- 踩坑记录：[omdsh-dev/dsh-plugin-dev](https://github.com/omdsh-dev/dsh-plugin-dev)
