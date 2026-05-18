# 第一阶段实施计划

本文档定义 `Distinction Architecture Toolkit` 的第一阶段施工范围。

第一阶段不是“小修 README”，而是建立一个后续会话、AI agent、贡献者都能接续的产品与工程基线。

---

## 1. 第一阶段名称

```text
Product Baseline + Selection Architecture Audit MVP
```

中文：

```text
产品规格基线 + 选区架构审计 MVP
```

---

## 2. 第一阶段目标

第一阶段要把项目从“概念仓库”推进为“有完整产品规格和可执行 MVP 边界的工程”。

完成后，仓库必须回答：

- 这个产品到底是什么；
- 它解决什么问题；
- 它不是什么；
- VS Code 插件、Skill、packages/core、rules、analyzer 如何分工；
- 第一版 MVP 做到哪里；
- 后续 AI 施工必须遵守哪些架构约束。

---

## 3. 第一阶段交付物

### 3.1 文档基线

```text
README.md
  中文项目入口，面向普通中文用户解释项目价值。

docs/PRODUCT_SPEC.md
  完整产品规格，定义产品形态、能力模型、概念边界和 MVP 范围。

docs/IMPLEMENTATION_PLAN.md
  第一阶段施工路线与验收标准。

docs/VSCODE_EXTENSION_SPEC.md
  VS Code 插件交互、命令、面板、数据流设计。

docs/SKILL_SPEC.md
  Skill 的职责、输入输出、AI 施工约束与报告协议。

docs/OPENWOLF_REFERENCE.md
  对 OpenWolf 的借鉴边界：借鉴工程机制，不借鉴产品定位。
```

### 3.2 Skill 基线

```text
skill/SKILL.md
skill/prompts/explain-selected-code.md
skill/prompts/find-responsibility-overload.md
skill/prompts/generate-correction-plan.md
skill/checklists/architecture-review.md
```

### 3.3 工程骨架

```text
packages/core/
packages/analyzer/
packages/rules/
packages/report-model/
packages/prompts/
vscode-extension/
```

第一阶段可以只创建最小 package 骨架，不要求完整实现所有规则。

---

## 4. MVP 闭环

第一阶段 MVP 聚焦：

> 选区架构审计。

完整闭环如下：

```text
用户在 VS Code 中选中代码
    ↓
定位最近符号：函数 / 类 / 接口 / 文件
    ↓
收集路径、命名、imports、references、简单调用关系
    ↓
判断架构层级与职责类型
    ↓
检测职责过载与不合理耦合点
    ↓
生成 Markdown / JSON 架构审计报告
    ↓
Skill 基于同一报告 schema 生成 AI 施工约束与纠偏建议
```

---

## 5. 第一阶段不做什么

第一阶段明确不做：

- 完整多语言 AST 精准调用链；
- 大规模代码重构；
- 自动修改业务代码；
- 完整 Webview 图谱系统；
- MCP server；
- Claude Code hook；
- GitHub Action；
- 训练模型；
- token saving 作为主功能。

这些可以进入第二或第三阶段。

---

## 6. 第二阶段预期

第二阶段开始实现代码。

建议优先顺序：

1. `packages/core`：定义核心类型；
2. `packages/rules`：实现第一批规则；
3. `packages/report-model`：定义 JSON / Markdown 报告；
4. `packages/analyzer`：实现路径、命名、import、symbol 粗分析；
5. `vscode-extension`：实现 `Explain Selected Code` 命令；
6. `skill/`：使用报告 schema 生成解释。

---

## 7. 核心模型优先级

第一批核心模型必须支持：

```text
Layer
ResponsibilityKind
SymbolRole
CallRelation
ImpactScope
CouplingRisk
ResponsibilityOverload
FinalOwnerCandidate
SurfaceKind
ConstructionConstraint
ArchitectureInsightReport
```

---

## 8. 第一批规则优先级

第一批规则必须覆盖：

```text
UI_DOMAIN_COUPLING
APPLICATION_HARDWARE_COUPLING
DOMAIN_PERSISTENCE_REPRESENTATION
DOMAIN_TRANSPORT_DTO_LEAKAGE
BUSINESS_ERROR_TEXT_COUPLING
GLOBAL_CONFIG_BUSINESS_COUPLING
PROTOCOL_USECASE_MIXING
TEMPORARY_SURFACE_SOLIDIFICATION
RESPONSIBILITY_OVERLOAD
```

---

## 9. 报告格式原则

任何报告必须包含：

- Evidence：证据；
- Interpretation：解释；
- Risk：风险；
- AI Collaboration Impact：对 AI 协作的影响；
- Suggested Correction：纠偏建议；
- Final Owner Candidate：最终归属候选；
- Confidence：置信度。

禁止只输出泛泛结论，例如：

```text
这个文件太复杂。
这个模块耦合度高。
```

必须说明：

```text
混合了哪些职责？
证据在哪里？
为什么这些职责不应该混在一起？
AI 后续修改会如何误解？
应该迁移到哪里？
```

---

## 10. 验收标准

第一阶段完成时，应满足：

- 中文 README 可独立解释产品；
- `docs/PRODUCT_SPEC.md` 可独立解释完整产品形态；
- `docs/IMPLEMENTATION_PLAN.md` 可指导后续开发；
- `skill/SKILL.md` 可约束 AI 输出结构化架构审计；
- VS Code 插件规格明确“选中代码后输出什么”；
- packages 目录职责清晰；
- 后续会话无需依赖本次聊天记录，也能继续施工。

---

## 11. 后续施工纪律

任何后续 PR 或 AI 修改必须遵守：

1. 不得把项目退化为普通 lint 工具；
2. 不得只做调用图而不解释职责与耦合；
3. 不得只做 AI prompt 而没有结构化报告 schema；
4. 不得把 VS Code 插件和 Skill 做成两套互不一致的语义；
5. 不得直接绑定单一 AI 工具；
6. 所有判断必须尽量携带 evidence；
7. 所有纠偏建议必须尽量说明 final owner。
