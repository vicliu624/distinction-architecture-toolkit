# 产品规格基线：Distinction Architecture Toolkit

本文档定义 `Distinction Architecture Toolkit` 的完整产品形态、核心边界、用户场景、能力模型和第一阶段施工范围。

它不是一次会话中的临时计划，而是后续 README、Skill、VS Code 插件、核心分析器、规则包和报告格式共同遵守的产品规格基线。

---

## 1. 产品一句话

`Distinction Architecture Toolkit` 是一个面向 AI 协作开发的架构理解与结构纠偏工具包。

它帮助开发者在 AI 生成或 AI 多轮修改后的工程中，识别代码的架构层级、调用链、影响范围、职责归属、不合理耦合点和 AI 后续修改风险。

---

## 2. 核心问题

AI 生成的工程经常出现一种表象：

> 目录看起来分层，类名看起来专业，功能也能运行，但职责边界并不真实成立。

常见问题包括：

- `Service` 同时承担用例编排、业务规则、数据库访问、协议编码、硬件调用和 UI 状态更新；
- `Domain` 对象混入 HTTP / BLE / LoRa / database / JSON DTO 字段；
- UI 事件处理器中直接包含业务规则；
- application 层直接依赖 SQLite、NVS、SX1262、HTTP client 等技术实现；
- magic number、状态码、异常字符串被当成业务语义使用；
- legacy / compatibility / temporary 代码没有被标记，逐渐固化为长期结构；
- AI 在后续修改时复制已有坏结构，导致结构漂移持续扩大。

本项目要解决的不是“代码是否复杂”，而是：

> 哪些职责被错误地混在了一起？  
> 哪些耦合会让 AI 误解工程语义？  
> 哪些代码需要先解释、约束和迁移，才能安全地继续让 AI 修改？

---

## 3. 产品目标

### 3.1 理解目标

帮助开发者快速理解：

- 当前选中代码属于哪一层；
- 它承担哪些职责；
- 它被谁调用；
- 它调用了谁；
- 它位于哪些业务流程或技术流程中；
- 修改它会影响哪些入口、模块、测试和行为。

### 3.2 审计目标

识别影响 AI 协作稳定性的结构风险：

- 职责过载；
- 不合理耦合；
- 跨层依赖；
- 领域语义与技术表示混杂；
- legacy / compatibility / temporary surface 扩散；
- final owner 不明确；
- specification 缺失或实现漂移。

### 3.3 纠偏目标

给出可执行、可分阶段的结构纠偏建议：

- 哪些职责应该拆分；
- 哪些抽象应该引入；
- 哪些实现应该迁移到 adapter / infrastructure；
- 哪些规则应该提升为 domain policy；
- 哪些 surface 应该被标记、收敛或删除；
- 哪些上下文必须提供给 AI 后才能安全修改。

---

## 4. 产品出口

本项目长期保持“一个语义核心，多个产品出口”。

```text
packages/core          共享领域模型、术语、枚举和报告结构
packages/analyzer      源码扫描、符号提取、依赖与调用关系分析
packages/rules         架构风险规则与职责过载规则
packages/report-model  JSON / Markdown 报告 schema 与渲染器
packages/prompts       Skill 与 AI 集成使用的 Prompt 构建器
skill/                 AI Skill 入口与施工约束
vscode-extension/      VS Code 插件入口
docs/                  产品规格、概念、路线与设计文档
```

### 4.1 VS Code 插件

插件提供开发现场的交互式体验。

核心体验：

```text
选中代码 → 解释架构位置 → 展示调用层级 → 分析影响范围 → 检测职责过载与不合理耦合 → 生成纠偏建议
```

### 4.2 Skill

Skill 约束 AI 的分析与修改行为。

它要求 AI 在修改前先输出：

- 当前代码身份；
- 架构层级；
- 职责拆解；
- 调用上下游；
- 影响范围；
- 不合理耦合证据；
- final owner 判断；
- AI 施工约束；
- 纠偏计划。

### 4.3 Core / Analyzer / Rules

核心包不依赖 VS Code 或具体 AI 工具。

它们提供可复用能力，使未来可以接入：

- CLI；
- GitHub Action；
- MCP server；
- Claude Code hook；
- 其他 IDE 插件；
- 企业内部 AI coding workflow。

---

## 5. 关键用户场景

### 场景 A：理解 AI 生成项目

用户拿到一个 AI 生成的工程，不确定它是否真的有架构。

工具输出：

- 模块层级图；
- 主要入口；
- 核心调用链；
- 主要职责分布；
- 可疑跨层依赖；
- 高风险耦合点。

### 场景 B：选中代码看调用层级与影响范围

用户选中一个函数、类或代码片段。

工具输出：

- enclosing symbol；
- current layer；
- incoming calls；
- outgoing calls；
- end-to-end flow；
- direct / indirect impact；
- impacted tests；
- AI 修改所需上下文。

### 场景 C：识别过多职责

用户怀疑某个 `Service`、`Manager` 或 `Handler` 过大。

工具输出：

- detected responsibility kinds；
- responsibility mixing score；
- overloaded responsibilities；
- suggested split；
- final owner candidate。

### 场景 D：发现不合理耦合点

用户希望知道哪些依赖不是普通依赖，而是结构污染。

工具输出：

- coupling type；
- evidence；
- why unreasonable；
- AI collaboration risk；
- correction strategy。

### 场景 E：约束 AI 修改

用户准备让 AI 修改某段代码。

工具输出：

- required context set；
- do-not-change constraints；
- boundary constraints；
- specification baseline suggestion；
- safe modification plan。

---

## 6. 职责类型模型

第一阶段采用以下职责类型：

```text
UI_PRESENTATION          UI 状态、页面事件、视图渲染
APPLICATION_USE_CASE     用例编排、流程协调、事务边界
DOMAIN_RULE              业务规则、领域策略、状态转换
DATA_PERSISTENCE         数据库、文件、NVS、缓存、Repository 实现
TRANSPORT_COMMUNICATION  HTTP、BLE、LoRa、MQTT、WebSocket、串口
PROTOCOL_ENCODING        packet 构造、序列化、加密格式、帧解析
INFRASTRUCTURE_HARDWARE  驱动、设备访问、GPIO、SX1262、I2S、GPS、SD 卡
CONFIGURATION            配置读取、环境变量、用户设置、区域参数
ERROR_OBSERVABILITY      日志、错误包装、metrics、trace
TEST_DEBUG_MOCK          测试桩、调试路径、模拟数据
```

职责分类既可以来自静态规则，也可以来自 AI 基于证据的解释。

---

## 7. 不合理耦合类型

第一阶段至少识别以下耦合：

| 类型 | 说明 |
|---|---|
| UI_DOMAIN_COUPLING | UI 逻辑直接拥有业务规则 |
| APPLICATION_HARDWARE_COUPLING | application 层直接依赖硬件或具体基础设施 |
| DOMAIN_PERSISTENCE_REPRESENTATION | domain 判断依赖数据库字段、状态码、NVS key 等存储表示 |
| DOMAIN_TRANSPORT_DTO_LEAKAGE | domain 对象混入 HTTP / BLE / LoRa / JSON DTO 字段 |
| BUSINESS_ERROR_TEXT_COUPLING | 业务状态转换依赖底层错误字符串 |
| GLOBAL_CONFIG_BUSINESS_COUPLING | 核心业务流程直接读取全局配置 |
| PROTOCOL_USECASE_MIXING | 用例编排混入协议编码 / packet 构造 |
| TEMPORARY_SURFACE_SOLIDIFICATION | 临时代码或兼容层被固化为长期结构 |
```

每个耦合报告必须包含：

- coupling type；
- evidence；
- mixed responsibilities；
- why unreasonable；
- AI risk；
- suggested correction；
- final owner candidate。

---

## 8. 影响范围模型

选中代码后，影响范围分为四级：

### 8.1 Direct Impact

直接调用当前符号的函数、类、文件或模块。

### 8.2 Indirect Impact

通过调用链间接到达当前符号的入口、流程或上游模块。

### 8.3 Semantic Impact

当前符号参与的业务能力或系统能力，例如：

- direct message sending；
- BLE companion bridge；
- retry policy；
- user authentication；
- payment state transition。

### 8.4 Change-Type Impact

不同修改类型带来的风险：

- 修改函数体；
- 修改参数；
- 修改返回值；
- 修改异常语义；
- 修改副作用；
- 移动文件或层级；
- 替换实现。

---

## 9. 本地知识目录

本项目借鉴 OpenWolf 的“本地知识目录”机制，但语义完全不同。

计划目录：

```text
.distinction/
├─ project-map.md
├─ architecture-map.md
├─ responsibility-map.md
├─ coupling-risks.json
├─ final-owner-map.md
├─ surface-inventory.md
├─ construction-rules.md
├─ correction-memory.md
├─ architecture-incidents.json
├─ session-log.md
└─ config.json
```

### 9.1 与 OpenWolf 的区别

OpenWolf 主要解决：

> AI 不知道项目里有什么。

本项目主要解决：

> AI 不知道这些代码在架构上意味着什么。

因此，本项目的本地知识不是简单文件摘要，而是架构语义索引。

---

## 10. 非目标

本项目第一阶段不做：

- 通用代码格式化；
- 普通 lint 规则集合；
- 完整自动重构；
- 大规模训练模型；
- 单一 AI 工具绑定；
- 只以 token saving 为目标的优化；
- 仅展示漂亮图谱但不解释职责与耦合。

本项目可以降低上下文成本，但省 token 不是核心卖点。

---

## 11. 第一阶段 MVP 范围

第一阶段 MVP 聚焦一个闭环：

> 选区架构审计。

最小可用能力：

1. VS Code 中选中代码；
2. 定位最近符号：函数、类、接口或文件；
3. 基于路径、命名、imports 和简单引用关系判断架构层级；
4. 输出 incoming / outgoing 关系；
5. 识别职责类型；
6. 检测明显职责过载；
7. 检测第一批不合理耦合规则；
8. 输出 Markdown / JSON 报告；
9. Skill 能根据同一报告 schema 生成解释与施工约束。

---

## 12. 成功标准

第一阶段完成后，仓库应满足：

- README 能让中文用户理解项目价值；
- 产品规格能让新会话或新贡献者理解完整产品形态；
- Skill 能约束 AI 不再泛泛给代码建议；
- 核心模型能表达 layer、responsibility、coupling、impact、final owner；
- VS Code MVP 有清晰交互边界；
- 后续任何实现都不能退化成普通 lint 或普通调用链工具。
