# DSH 插件开发文档

DeepSeek Harness（DSH）插件开发知识库，整理自官方文档站与社区实战资料（2026-08 前后）。

DSH 是 DeepSeek 开源的 Agent 框架，"一切皆插件"：模型、工具、会话、技能、UI 都是 Cordis 插件。插件容器是 Cordis 服务框架的 fork（`@deepseek-ai/cordis`）。

## 文档地图

每篇文档独立成文，可按需单独阅读和改写：

| # | 文档 | 内容 |
|---|---|---|
| 01 | [核心概念](01-核心概念.md) | 插件是什么、三要素、三种形态、生命周期、bundle 与 profile、host/client、加载方式、层顺序 |
| 02 | [Cordis框架要点](02-Cordis框架要点.md) | fiber 状态机、依赖驱动加载、自动清理、ctx.plugin、HMR、!!js 配置、能力三角色 |
| 03 | [事件系统](03-事件系统.md) | 五种分发模式、waterfall、类型安全事件、会话事件区别 |
| 04 | [工具开发](04-工具开发.md) | defineTool 契约、schema DSL 硬规则、execute 契约、UI 卡片 |
| 05 | [配置与服务](05-配置与服务.md) | Config schema、依赖注入、Service 提供、声明合并 |
| 06 | [架构与扩展点](06-架构与扩展点.md) | 架构总览、事件域、轮次流程、新行为归属、扩展模式、设置卡片 |
| 07 | [打包安装与分发](07-打包安装与分发.md) | bundle manifest、cordis.patch.yml、安装、分发、版本注意 |
| 08 | [Host与Client双面开发](08-Host与Client双面开发.md) | 双面 manifest、双 tsc、client bundle、slot、Conversation Node |
| 09 | [踩坑清单](09-踩坑清单.md) | 高频错误与修复 |
| 10 | [验证与发布](10-验证与发布.md) | 验证金字塔、发布 checklist、完成标准 |
| 11 | [参考资料](11-参考资料.md) | 全部来源链接 |

## 阅读路径

- 第一次接触：先读 [01](01-核心概念.md)，再读 [04](04-工具开发.md)。
- 要理解底层框架：[02](02-Cordis框架要点.md)。
- 要写插件间通信：[03](03-事件系统.md)。
- 要写能安装的插件：01 → 04 → [07](07-打包安装与分发.md)。
- 要写带浏览器 UI 的插件：[08](08-Host与Client双面开发.md)。
- 要了解整体架构与扩展点：[06](06-架构与扩展点.md)。
- 遇到报错：[09](09-踩坑清单.md)。
- 写完要验证、发布：[10](10-验证与发布.md)。

## 版本注意

DSH 处于开发者预览期，API 仍在演进。文档以 2026-08 前后的公开资料为准，动手前先核对目标版本的官方文档与 npm 产物。部分服务名在演进（如 `httpServer` → `webServer`），跨版本开发时用 `ctx.get('webServer') ?? ctx.get('httpServer')` 兼容。

## 官方文档站

VitePress，中英双语：<https://deepseek-harness.github.io/deepseek-harness/>

注意 `/develop` 路径本身 404，实际内容在 `/develop/basic/`、`/develop/cordis-tutorial/`、`/develop/framework/`、`/develop/practice/` 和 `/reference/` 下。
