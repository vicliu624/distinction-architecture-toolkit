# Analyzer 设计：Agent-First Architecture Analysis

本文档定义 `Distinction Architecture Toolkit` 的分析器设计原则。

核心结论：

> 第一阶段不自研跨语言 AST 分析器。  
> 本项目采用 Agent-first、IDE-assisted、evidence-based 的渐进式架构分析方案。

---

## 1. 为什么不以内建 AST 作为起点

本项目关注的核心问题不是“语法树是否能被完整解析”，而是：

- 这段代码在架构上意味着什么；
- 它属于哪一层；
- 它承担了哪些职责；
- 哪些职责被错误地耦合；
- 修改它会影响哪些调用路径；
- AI 继续修改它时会误解什么；
- 哪些判断应该沉淀为本地架构记忆。

AST 能提供语法事实，但不能直接回答职责归属、final owner、不合理耦合、temporary surface 或 AI 协作风险。

如果第一阶段自研跨语言 AST，会立即引入过高复杂度：

- TypeScript / JavaScript 解析；
- Python 解析；
- C / C++ 解析；
- 宏、条件编译、模板、重载；
- 跨文件符号索引；
- 依赖注入、动态调用；
- 多语言项目的一致模型。

这会让项目过早偏向“静态分析器”，而不是“AI 协作架构治理工具”。

---

## 2. 正确的分析路线

本项目第一阶段采用：

```text
Local Knowledge
  + IDE / LSP Facts
  + Text Evidence
  + Agent Interpretation
  + Rule Engine
  + Structured Report
```

也就是：

```text
已有架构记忆 → IDE 中的 Agent 获取上下文 → 收集证据 → 规则检测 → Agent 解释 → 写入报告与本地知识库
```

---

## 3. IDE Agent 的角色

本项目假设用户主要在 IDE 中使用 Agent，例如：

- VS Code Copilot / Agent；
- Claude Code 的 IDE 集成；
- Codex / coding agent；
- Cursor / 类似 IDE agent；
- 企业内部 IDE agent。

这些 Agent 已经具备：

- 读取当前文件；
- 查看选区；
- 搜索项目；
- 打开相关文件；
- 使用 IDE 的引用、定义、符号能力；
- 运行命令和测试；
- 根据上下文做架构解释。

因此，本项目不重复实现它们已经具备的“探索工程”能力，而是提供：

1. 统一的架构分析协议；
2. 结构化证据模型；
3. 职责与耦合规则；
4. 本地架构记忆；
5. 报告 schema；
6. AI 施工约束。

---

## 4. 分析分层

### Level 0：Local Knowledge Provider

读取 `.distinction/` 中的长期架构记忆：

```text
architecture-map.md
responsibility-map.md
coupling-risks.json
final-owner-map.md
surface-inventory.md
construction-rules.md
correction-memory.md
config.json
```

用途：

- 获取项目特定层级规则；
- 获取用户确认过的 final owner；
- 获取 Do-Not-Repeat；
- 获取已有耦合风险；
- 避免跨会话丢失判断。

---

### Level 1：Text Evidence Provider

轻量文本证据采集。

可收集：

```text
file path
file name
import / include
class / function name 粗提取
关键技术词
明显调用 token
配置读取 token
数据库 / 协议 / 硬件 / UI 特征词
```

示例：

```text
application/message_service.cpp contains:
- #include "sx1262_driver.h"
- nvs_get_str
- sqlite
- encodePacket
- ui.setMessageStatus
```

这类证据足以触发很多第一阶段规则。

---

### Level 2：IDE / LSP Evidence Provider

优先复用 IDE 已有能力，而不是自研 AST。

可使用：

```text
Document Symbols
Workspace Symbols
Definition
References
Call Hierarchy
Diagnostics
```

这些能力通常由语言服务器、IDE 或已有扩展提供。

本项目只定义适配接口，不要求第一阶段实现所有语言的精确支持。

---

### Level 3：Agent Interpretation Provider

Agent 根据证据进行架构解释。

Agent 不应凭空推断，而应基于前几层提供的 evidence 输出：

```text
Architecture Role
Layer Assessment
Responsibility Breakdown
Unreasonable Coupling Points
Impact Scope
Final Owner Candidate
AI Collaboration Risk
Construction Constraints
Correction Plan
```

---

### Level 4：Optional AST Provider

AST 只是未来增强层，不是 MVP 前置条件。

未来可以引入：

```text
Tree-sitter
TypeScript Compiler API
clangd
pyright
Roslyn
Java LSP
```

但它们必须作为 `EvidenceProvider` 插件接入，而不能成为项目核心假设。

---

## 5. EvidenceProvider 接口原则

分析器不应被设计成：

```text
Analyzer = AST Parser
```

而应设计成：

```text
Analyzer = Evidence Collection + Rule Evaluation + Report Generation
```

建议抽象：

```ts
export interface EvidenceProvider {
  name: string;
  collect(context: AnalysisContext): Promise<Evidence[]>;
}
```

第一阶段 provider：

```text
LocalKnowledgeProvider
TextEvidenceProvider
ImportEvidenceProvider
PathEvidenceProvider
NamingEvidenceProvider
IdeSymbolEvidenceProvider
AgentProvidedEvidenceProvider
```

未来 provider：

```text
TreeSitterEvidenceProvider
TypeScriptCompilerEvidenceProvider
ClangdEvidenceProvider
PyrightEvidenceProvider
```

---

## 6. Agent 与规则的分工

### Agent 负责

- 解释证据；
- 判断职责语义；
- 说明为什么耦合不合理；
- 给出 final owner 候选；
- 生成施工约束；
- 形成纠偏计划。

### 规则负责

- 根据 evidence 触发结构风险；
- 保证输出格式稳定；
- 避免 Agent 漏掉明显问题；
- 将风险写入结构化报告；
- 为后续本地知识库持久化提供依据。

### IDE / LSP 负责

- 定位符号；
- 查找定义；
- 查找引用；
- 提供诊断；
- 在支持时提供调用层级。

---

## 7. 调用链策略

第一阶段不追求完整调用图。

调用层级采用渐进策略：

1. 优先使用 IDE / LSP references 和 call hierarchy；
2. 如果不可用，使用文本搜索作为候选调用点；
3. 将结果标记为 `FACT`、`INFERENCE` 或 `CANDIDATE`；
4. Agent 解释时必须说明置信度；
5. 不能把候选调用点伪装成确定调用链。

---

## 8. 选区分析流程

```text
用户在 IDE 中选中代码
    ↓
IDE Agent / 插件获取选区、当前文件、工作区路径
    ↓
读取 .distinction/ 本地架构记忆
    ↓
通过 IDE / LSP 获取符号、引用、定义、可用调用层级
    ↓
通过文本扫描获取 imports、路径、命名和关键技术词
    ↓
规则引擎检测明显职责过载和不合理耦合
    ↓
Agent 基于 evidence 生成架构解释
    ↓
输出 ArchitectureInsightReport
    ↓
写入 .distinction/reports/latest-selection-insight.md
    ↓
对高价值判断建议写入 construction-rules / correction-memory / final-owner-map
```

---

## 9. 事实分级

所有分析结果必须标记来源：

```text
FACT        IDE/LSP/文本扫描可直接确认
CANDIDATE   搜索或启发式发现的候选关系
INFERENCE   Agent 或规则基于证据推断
CONFIRMED   用户确认过的长期判断
```

所有 `INFERENCE` 和 `CANDIDATE` 都必须带 confidence。

---

## 10. 第一阶段验收标准

第一阶段分析器设计完成后，应满足：

- 不要求自研 AST；
- 可以在 IDE Agent 参与下完成选区架构审计；
- 能复用 IDE / LSP 的符号和引用能力；
- 能用文本证据触发第一批规则；
- 能把 Agent 解释转成结构化报告；
- 能把重要判断沉淀到 `.distinction/`；
- 能明确区分事实、候选、推断和用户确认。

---

## 11. 禁止事项

后续实现不得：

- 把 AST 作为 MVP 前置条件；
- 因为没有 AST 就阻塞选区架构审计；
- 把 Agent 推断伪装成静态事实；
- 只依赖 Agent 自由发挥而没有 evidence / report schema；
- 只做普通搜索，不解释职责与耦合；
- 只做 IDE 引用列表，不生成架构解释。

---

## 12. 推荐实现顺序

```text
1. packages/core 定义 Evidence、EvidenceSource、Confidence、ArchitectureInsightReport
2. packages/report-model 定义 Markdown / JSON 渲染
3. packages/rules 实现基于 evidence 的第一批规则
4. packages/analyzer 实现 LocalKnowledgeProvider + TextEvidenceProvider
5. vscode-extension 通过 IDE API 补充 references / symbols
6. Skill / IDE Agent 基于 report schema 做解释
7. 未来再增加可选 AST provider
```
