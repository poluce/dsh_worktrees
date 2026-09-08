# Cordis 框架要点

Cordis 是 DSH 底层的插件框架：一个小型运行时，其中每项能力（工具、LLM 适配器、文件访问、agent loop 本身）都是挂载到共享上下文中的插件。本文是官方 Cordis 教程与框架文档的浓缩。

## Fiber 状态机

每个已加载插件实例拥有一个 fiber，状态转换：

```
PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED
              ↘ FAILED
```

| 状态 | 含义 |
|---|---|
| PENDING | 已声明，但所需依赖未就绪 |
| LOADING | 依赖就绪，正在执行 `apply` |
| ACTIVE | 插件运行中 |
| FAILED | `apply` 或配置校验抛出异常 |
| UNLOADING / DISPOSED | disposer 正在运行 / 一切已拆除 |

PENDING 通常就是"为什么我的插件没有输出"的答案：`inject` 指定的服务无人提供时，插件会一直等待，不输出任何内容，也不崩溃。这不是错误——提供方可能稍后挂载。诊断方法：枚举 `ctx.registry`，检查 fiber 状态：

```ts
import { FiberState, type Context } from '@deepseek-ai/cordis'

export function apply(ctx: Context) {
  setTimeout(() => {
    for (const runtime of ctx.registry.values()) {
      for (const fiber of runtime.fibers) {
        if (fiber.state === FiberState.PENDING) {
          console.log(`${fiber.name} is PENDING — a required service is missing`)
        }
      }
    }
  }, 500)
}
```

## 依赖驱动的加载

- `inject` 列出插件需要的服务；Cordis 让插件保持 PENDING 直到每项服务都存在，因此 `apply` 内可以保证服务就绪。
- `cordis.yml` 中的加载顺序无关紧要：决定插件何时启动的是依赖关系，不是文件顺序。各项并发启动。
- **加载后仍跟踪依赖**：运行中所需服务消失（提供方被卸载或热替换），依赖插件随之卸载，服务恢复后重新加载。这也是配置中可以替换服务的原因：卸载 `dsh-bash-local`、挂载另一个 shell 提供方，所有注入 `'shell'` 的插件都会重启并使用新实现。
- 可选依赖：跳过 `inject`，在使用处 `ctx.get('name')` 探测（可能 `undefined`）。

## 自动清理

通过 `ctx` 做的任何注册在插件卸载时自动撤销：

- `ctx.on(event, handler)` — 事件监听
- `ctx.tools.register(tool)` — 工具注册
- `ctx.llm.registerAdapter(names, adapter)` — LLM 适配器注册
- `ctx.effect(() => cleanup)` — 自定义资源

处置器按注册顺序的**逆序**开始调用，但多个异步 disposer **并发**执行，不保证逐个完成。存在顺序依赖的清理步骤必须放进同一个 `ctx.effect()` 返回的 disposer 里，由它串行等待。

## ctx.plugin 与嵌套上下文

`ctx.plugin(child)` 把来自代码的函数/对象/类挂载为插件（与 YAML loader 对每个配置项做的相同），返回一个 fiber——已加载插件实例的运行时句柄。子 fiber 继承父上下文但有独立生命周期，随父插件一同 dispose。

`fiber.dispose()` 会等该插件的所有清理工作（包括异步 disposer）完成后才结束，并递归卸载它挂载的所有子插件。

## 组合与 HMR

Cordis 配置项除了 `name` 和 `config` 还接受其他元数据：

```yaml
- id: greeter          # 稳定标识，让 loader 区分"修改"与"先删再加"
  name: './greeter.ts'
- id: consumer
  name: './consumer.ts'
  disabled: true       # 保留配置项，跳过挂载
```

- `id` 是稳定标识。**不带 `id` 的配置项每次读取都会获得新生成的 id**，所以配置文件任何编辑都会让它被当作先删再加并重新挂载。
- `disabled: true` 卸载插件而不删除配置项；改回后插件以及所有因依赖其服务而 PENDING 的插件都会再次加载。
- 组（group）可以嵌套一份配置项子列表，作为一个单元加载/卸载；`isolate` 为组提供某服务名的独立实例，两组可各自看到配置不同的提供方。
- HMR：`@deepseek-ai/cordis-plugin-hmr` 监视文件，保存时先卸载（回卷所有 effect）再加载。编辑 `cordis.yml` 本身也触发更新，按 `id` 比较只挂载/卸载/重配置变化的部分。

## 配置的 !!js 计算值

loader 支持 `!!js` 标签，用于必须在加载时计算的配置值：

```yaml
- name: './config-demo.ts'
  config:
    greeting: !!js process.env.DEMO_GREETING ?? 'Hello'
```

`!!js` 仅在 `config` 与条目 `disabled` 字段内有效。`disabled: !!js ...` 在每次挂载决策时基于 loader 上下文求值，可以按平台或环境门控一行；其余元数据（`name`、`id`、`inject` 等）保持静态。

## 能力的三种角色设计

当一项能力足够通用、需要支持可替换的提供方时（例如 Bash 执行），harness 区分三种角色：

- **Service Definition**（如 `dsh-shell`）：定义 Cordis 服务以及请求/结果类型。
- **Service Provider**（如 `dsh-bash-local`）：在本地执行命令。
- **Consumer**（如 `dsh-tool-bash`）：把能力公开为模型可调用的工具。

Provider 依赖 Definition，Consumer 依赖 Definition，Provider 和 Consumer 互不依赖。更换提供方时 Definition 和工具保持不变。角色需要独立演进或替换时放入不同包；否则一个包可以承担多个角色。完整能力构成其 seam，任何单一角色都不是 seam。

## 参考

- 官方 Cordis 教程（7 章，可动手运行）：<https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/index.html>
- 官方《插件与生命周期》：<https://deepseek-harness.github.io/deepseek-harness/develop/framework/index.html>
- 官方《能力的三种角色设计》：<https://deepseek-harness.github.io/deepseek-harness/develop/practice/index.html>
