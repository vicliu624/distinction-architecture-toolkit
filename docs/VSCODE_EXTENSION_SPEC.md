# VS Code 插件规格

本文档定义 `Distinction Architecture Toolkit` 的 VS Code 插件产品形态。

插件的核心目标不是替代 IDE 的普通引用查找，也不是只画调用图，而是在开发现场帮助用户理解选中代码的架构意义、调用影响、职责混杂和 AI 协作风险。

---

## 1. 核心体验

```text
选中代码
  ↓
解释架构位置
  ↓
展示调用层级
  ↓
分析影响范围
  ↓
检测职责过载与不合理耦合
  ↓
生成 AI 协作风险与纠偏建议
```

---

## 2. 主要命令

### 2.1 Explain Selected Code

命令：

```text
Distinction Architecture: Explain Selected Code
```

输入：当前编辑器选区。

输出：`ArchitectureInsightReport`。

报告内容：

- selected range；
- nearest symbol；
- file / module；
- detected layer；
- detected responsibilities；
- incoming calls；
- outgoing calls；
- impact scope；
- coupling risks；
- AI collaboration risk；
- suggested correction。

---

### 2.2 Find Responsibility Overload

命令：

```text
Distinction Architecture: Find Responsibility Overload
```

输入：当前选区、当前文件或当前工作区。

输出：职责过载报告。

重点回答：

- 当前代码承担了哪些职责；
- 职责类型数量是否过多；
- 是否跨越 UI / application / domain / infrastructure / protocol / hardware；
- 哪些职责应该被迁移；
- 迁移后的 final owner 候选是谁。

---

### 2.3 Show Call Hierarchy

命令：

```text
Distinction Architecture: Show Call Hierarchy
```

输出：架构语义化调用层级。

区别于普通 IDE 调用层级：

- 不只列出 caller / callee；
- 还要标记每个节点的架构层级；
- 标记业务流程和技术流程；
- 标记跨层跳跃；
- 标记可能影响范围。

---

### 2.4 Analyze Impact Scope

命令：

```text
Distinction Architecture: Analyze Impact Scope
```

输出：影响范围报告。

影响范围分为：

- direct impact；
- indirect impact；
- semantic impact；
- change-type impact。

---

### 2.5 Generate Correction Plan

命令：

```text
Distinction Architecture: Generate Correction Plan
```

输出：分阶段纠偏建议。

禁止直接输出大规模重构命令。

必须优先给出：

1. 命名与概念澄清；
2. specification baseline；
3. 接口边界收敛；
4. final owner 迁移；
5. 逐步拆分；
6. 删除或收敛 temporary / compatibility surface。

---

## 3. UI 形态

### 3.1 轻量 Hover

显示：

```text
Layer: Application Service
Responsibilities: Application orchestration, Protocol encoding
Incoming: 3
Outgoing: 5
Coupling Risk: High
AI Risk: High
```

### 3.2 CodeLens

函数或类上方显示：

```text
3 callers | 5 outgoing | Layer: Application | Responsibility overload: High | Explain
```

### 3.3 Side Panel

主报告面板：

```text
Architecture Insight
├─ Current Role
├─ Layer
├─ Responsibilities
├─ Incoming Calls
├─ Outgoing Calls
├─ Impact Scope
├─ Coupling Risks
├─ Responsibility Overload
├─ Final Owner Candidate
├─ AI Construction Constraints
└─ Correction Plan
```

### 3.4 Diagnostics

插件可以在编辑器中标记架构风险，但不能把架构风险伪装成编译错误。

建议 severity：

- Information：结构提示；
- Warning：职责混杂或不合理耦合；
- Hint：建议迁移、补充 specification 或添加 final owner。

---

## 4. 数据流

```text
VS Code Selection
    ↓
Selection Resolver
    ↓
Symbol Context Collector
    ↓
Project Graph / File Graph / Import Graph
    ↓
Rule Engine
    ↓
ArchitectureInsightReport
    ↓
Markdown / Webview / Skill Prompt
```

---

## 5. 第一阶段实现策略

第一阶段优先使用轻量方法：

- VS Code selection API；
- document symbols；
- workspace symbols；
- references；
- imports 扫描；
- 路径规则；
- 命名规则；
- 简单文本启发式。

不要求一开始实现完整 AST 与全语言精准调用图。

---

## 6. 输出示例

```text
Architecture Insight: MessageService::sendDirectMessage

Layer:
Application Service

Detected Responsibilities:
- Application orchestration
- Domain validation
- Identity storage access
- Protocol encoding
- Hardware transport

Incoming Calls:
- ChatController.send()
- BLECompanionBridge.handleSendRequest()

Outgoing Calls:
- ContactRepository.getById()
- MessagePolicy.validateDirectMessage()
- PkiStore.getIdentity()
- LoRaTransport.send()

Unreasonable Coupling:
[APPLICATION_HARDWARE_COUPLING]
Evidence: MessageService directly calls sx1262.send()

AI Risk:
High

Suggested Correction:
Introduce RadioTransportPort and move SX1262 access into infrastructure adapter.
```

---

## 7. 插件非目标

第一阶段插件不做：

- 自动重构；
- 自动修改用户业务代码；
- 完整多语言调用图；
- 大型可视化图谱；
- 与某个 AI 工具强绑定。

插件首先必须把“选区架构审计”跑通。
