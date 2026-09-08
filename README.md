# dsh_worktrees

DSH 插件开发仓库。

## 说明

- 每个插件一个分支，直接在仓库里开发、提交、推送。
- MIT License。

## 文档

插件开发知识库在 [`docs/`](docs/README.md)：一份[总介绍文档](docs/README.md) + 11 篇独立文档，每篇可单独阅读和改写。

| # | 文档 | 内容 |
|---|---|---|
| 01 | [核心概念](docs/01-核心概念.md) | 插件是什么、三种形态、生命周期、bundle 与 profile |
| 02 | [Cordis框架要点](docs/02-Cordis框架要点.md) | fiber 状态机、HMR、组合、能力三角色 |
| 03 | [事件系统](docs/03-事件系统.md) | 五种分发模式、类型安全事件、waterfall |
| 04 | [工具开发](docs/04-工具开发.md) | `defineTool` 契约、schema DSL 硬规则、execute/render |
| 05 | [配置与服务](docs/05-配置与服务.md) | Config schema、依赖注入、Service 提供 |
| 06 | [架构与扩展点](docs/06-架构与扩展点.md) | 架构总览、事件域、扩展点归属、设置卡片 |
| 07 | [打包安装与分发](docs/07-打包安装与分发.md) | bundle manifest、cordis.patch.yml、安装与发布 |
| 08 | [Host与Client双面开发](docs/08-Host与Client双面开发.md) | host/client 形态、双 tsc、client bundle、slot |
| 09 | [踩坑清单](docs/09-踩坑清单.md) | 高频错误与修复 |
| 10 | [验证与发布](docs/10-验证与发布.md) | 验证金字塔、发布 checklist |
| 11 | [参考资料](docs/11-参考资料.md) | 全部来源链接 |

> 注意：DSH 处于开发者预览期，API 仍在演进。文档以 2026-08 前后的公开资料为准，动手前先核对目标版本的官方文档与 npm 产物。
