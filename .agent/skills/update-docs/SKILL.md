---
name: update-docs
description: 更新本仓库 docs/ 下的 DSH 插件开发文档。当用户要求修改、补充、重写或新增插件开发文档，或要求把新学到的 DSH 知识整理进文档时使用。覆盖文档结构、每篇职责边界、更新流程、来源核对与格式规则。
---

# 更新 DSH 插件开发文档

本仓库 `docs/` 是 DSH 插件开发知识库：一份总介绍文档 + 11 篇独立文档。每篇独立成文，可单独阅读和改写。

## 文档结构

```
docs/
├── README.md                    # 总介绍：文档地图、阅读路径、版本注意、官方文档站入口
├── 01-核心概念.md                # 插件是什么、三要素、三种形态、生命周期、bundle 与 profile、host/client、加载方式、层顺序
├── 02-Cordis框架要点.md          # fiber 状态机、依赖驱动加载、自动清理、ctx.plugin、HMR、!!js 配置、能力三角色
├── 03-事件系统.md                # 五种分发模式、waterfall、类型安全事件、会话事件区别
├── 04-工具开发.md                # defineTool 契约、schema DSL 硬规则、execute 契约、UI 卡片
├── 05-配置与服务.md              # Config schema、依赖注入、Service 提供、声明合并
├── 06-架构与扩展点.md            # 架构总览、事件域、轮次流程、新行为归属、扩展模式、设置卡片
├── 07-打包安装与分发.md          # bundle manifest、cordis.patch.yml、安装、分发、版本注意
├── 08-Host与Client双面开发.md    # 双面 manifest、双 tsc、client bundle、slot、Conversation Node
├── 09-踩坑清单.md                # 高频错误与修复
├── 10-验证与发布.md              # 验证金字塔、发布 checklist、完成标准
└── 11-参考资料.md                # 全部来源链接
```

根目录 `README.md` 也有一份文档地图表格，与 `docs/README.md` 保持一致。

## 更新流程

1. **先读总介绍**：读 `docs/README.md`，确认文档地图和阅读路径，判断改动落在哪篇。
2. **定位目标文档**：按上表职责边界选择要改的文档。内容跨多篇时，每篇只写自己的职责，不重复。
3. **核对来源**：内容来自官方文档站或社区资料时，先抓取原文核对，不凭记忆写。官方文档站路径见下文速查表。
4. **修改文档**：保持每篇独立完整——一级标题 `#`、小节 `##`、代码块、表格。只改目标篇，不动其他篇。
5. **更新索引**：如果新增/删除/重命名了文档，或文档地图的描述过时，同步更新 `docs/README.md` 和根 `README.md` 的表格。
6. **验证**：检查相对链接（`docs/README.md` 表格里的 `NN-标题.md` 与实际文件名一致）、标题层级、代码块闭合。

## 格式规则

- 每篇文档独立成文：`# 标题` 开头，小节用 `##`，不依赖其他篇的上下文。
- 每篇末尾保留 `## 参考` 小节，列出该篇内容的官方/社区来源链接。
- 代码示例用围栏代码块并标注语言（`ts`、`yaml`、`json`、`sh`）。
- 表格用于规则、映射、清单类内容。
- 版本敏感内容（API 名、服务名、命令）标注适用版本或"以目标版本为准"。
- 文档开头或总介绍里保留版本注意：DSH 处于开发者预览期，API 仍在演进。

## 内容规则

- 只写 DSH 插件开发相关内容；harness 应用逻辑、prompt 设计不属于插件文档。
- 工具 API 以 `@deepseek-ai/dsh-tools` 为准，配置 schema 用 `@deepseek-ai/schemastery`（不是 zod），容器是 `@deepseek-ai/cordis`（不是 koishi / 裸 cordis）。
- 服务名在演进（如 `httpServer` → `webServer`），跨版本写法用 `ctx.get('webServer') ?? ctx.get('httpServer')`。
- 社区资料（博客、讨论、第三方 skill）与官方文档冲突时，以官方为准并标注差异。
- 新增踩坑条目时写清三列：症状、根因、解决。

## 官方文档站速查

VitePress，中英双语：<https://deepseek-harness.github.io/deepseek-harness/>

注意 `/develop` 路径本身 404，实际内容在以下路径：

| 主题 | 路径 |
|---|---|
| 基础插件路径（第一个插件/工具/配置/打包） | `/develop/basic/index.html` |
| Cordis 教程（7 章） | `/develop/cordis-tutorial/index.html` |
| 插件与生命周期（fiber 状态机） | `/develop/framework/index.html` |
| 服务与依赖 | `/develop/framework/service.html` |
| 事件系统 | `/develop/framework/events.html` |
| 能力三角色设计 | `/develop/practice/index.html` |
| 动态 Cordis 工具 | `/develop/practice/dynamic-cordis.html` |
| 架构 | `/reference/index.html` |
| Cordis 入门 | `/reference/cordis-primer.html` |
| Cordis API 参考 | `/reference/cordis-api/context.html` |
| 扩展模式实操手册 | `/reference/cookbook/extension-cookbook.html` |
| 新增设置卡片 | `/reference/cookbook/adding-a-settings-card.html` |
| 新增工具 / LLM 适配器 | `/reference/cookbook/adding-a-tool.html` |
| 能力 Seams | `/reference/capability-seams.html` |
| 子系统索引（约 50 页，含生成的 Cordis 服务/事件参考） | `/reference/subsystems/index.html` |
| 工具 Schema 目录 | `/reference/tool-catalog.html` |
| 工具子系统参考 | `/reference/subsystems/tools.html` |
| 工具执行流水线 | `/reference/tool-execution-pipeline.html` |

抓取页面时用 `curl`（web_fetch 可能被网络策略拦截），正文在 `<div class="vp-doc">` 内。

## 社区来源

- [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) — 双面插件完整实战（developing-dsh-plugins.md、dsh-plugin-development SKILL.md）
- [omdsh-dev/dsh-plugin-dev](https://github.com/omdsh-dev/dsh-plugin-dev) — 公测期踩坑记录
- [dsh-io/dsh-plugin-skill](https://github.com/dsh-io/dsh-plugin-skill) — 工具插件开发 Skill
- [geeklei/dsh-plugins](https://github.com/geeklei/dsh-plugins) — 从 0 到 1 中文指南
- [Discussion #961](https://github.com/deepseek-ai/deepseek-harness/discussions/961) — 实战踩坑全记录
