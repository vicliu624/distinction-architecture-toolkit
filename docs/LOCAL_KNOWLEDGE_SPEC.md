# 本地架构知识库规格

本文档定义 `Distinction Architecture Toolkit` 的本地架构知识库机制。

它是本项目的一等产品能力，不是附属缓存，也不是临时日志。

本地知识库的目标是：

> 让开发者、VS Code 插件、Skill、未来 CLI / MCP / hook 集成，都能共享同一份项目架构语义记忆，避免功能在不同 agent 或不同会话之间丢失。

---

## 1. 为什么需要本地架构知识库

AI 协作开发中，很多失败并不是因为模型不会写代码，而是因为它缺少稳定的项目结构记忆：

- 不知道某个文件在架构中属于哪一层；
- 不知道某段逻辑是长期设计还是临时兼容；
- 不知道用户已经纠正过哪些错误；
- 不知道某个坏结构曾经导致过什么事故；
- 不知道哪些职责已经被判定应该迁移到 final owner；
- 不知道哪些文件虽然能运行，但已经存在高风险耦合；
- 不知道修改某段代码前必须遵守哪些施工约束。

因此，本项目需要在目标工程中建立 `.distinction/` 目录，用来沉淀架构语义、职责归属、耦合风险、施工约束和纠偏记忆。

---

## 2. 目录结构

目标工程中计划生成以下目录：

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
├─ reports/
│  ├─ latest-selection-insight.md
│  ├─ latest-workspace-audit.md
│  └─ history/
└─ config.json
```

第一阶段可以先支持其中的核心文件：

```text
project-map.md
architecture-map.md
responsibility-map.md
coupling-risks.json
construction-rules.md
correction-memory.md
config.json
```

---

## 3. 文件职责

### 3.1 project-map.md

项目文件地图。

它记录文件和目录的基本信息，但不能停留在普通摘要。

每个条目应尽量包含：

```text
- path
- language
- approximate size
- primary symbols
- short description
- suspected layer
- known entry points
- last scanned timestamp
- confidence
```

示例：

```text
## src/message/message_service.cpp

- Language: C++
- Primary symbols: MessageService, sendDirectMessage
- Description: Coordinates direct-message sending flow.
- Suspected layer: APPLICATION_USE_CASE
- Known entry points: ChatController, BLECompanionBridge
- Confidence: medium
```

---

### 3.2 architecture-map.md

架构地图。

它记录工程中被识别出的层级、模块、边界和主要流程。

应包含：

```text
- detected architecture style
- layer definitions
- module boundaries
- major entry points
- core flows
- known boundary violations
- uncertain areas
```

示例：

```text
## Layer: Application

Expected responsibility:
- use case orchestration
- transaction boundary
- coordination between domain and ports

Should not own:
- hardware driver calls
- database representation decisions
- UI state mutation
- protocol packet encoding
```

---

### 3.3 responsibility-map.md

职责地图。

它记录文件、类、函数、接口所承担的职责类型。

应包含：

```text
- symbol path
- detected responsibility kinds
- primary responsibility
- mixed responsibilities
- responsibility overload score
- suggested final owner
- confidence
```

示例：

```text
## MessageService::sendDirectMessage

Primary responsibility:
- APPLICATION_USE_CASE

Detected mixed responsibilities:
- DATA_PERSISTENCE
- PROTOCOL_ENCODING
- INFRASTRUCTURE_HARDWARE

Responsibility overload:
- Risk: High
- Reason: use-case orchestration is mixed with packet encoding and radio driver access.
```

---

### 3.4 coupling-risks.json

结构化耦合风险记录。

每条记录必须可被 VS Code 插件、CLI、Skill 和未来 CI 使用。

建议 schema：

```json
{
  "id": "risk-0001",
  "type": "APPLICATION_HARDWARE_COUPLING",
  "severity": "high",
  "location": {
    "file": "src/message/message_service.cpp",
    "symbol": "MessageService::sendDirectMessage",
    "line": 128
  },
  "evidence": [
    "MessageService directly calls sx1262.send()"
  ],
  "mixed_responsibilities": [
    "APPLICATION_USE_CASE",
    "INFRASTRUCTURE_HARDWARE"
  ],
  "why_unreasonable": "Application use case depends on concrete radio driver implementation.",
  "ai_risk": "AI may continue adding hardware-specific behavior into application service.",
  "suggested_correction": "Introduce RadioTransportPort and move SX1262 access into infrastructure adapter.",
  "final_owner_candidate": "RadioTransportPort / SX1262RadioAdapter",
  "confidence": "medium",
  "status": "open"
}
```

---

### 3.5 final-owner-map.md

最终归属地图。

它记录那些当前位置不理想、但已经能判断未来归属的职责。

应包含：

```text
- current owner
- responsibility
- final owner candidate
- migration reason
- migration preconditions
- blocking risks
- deletion condition if applicable
```

示例：

```text
## contact.status == 3 direct-message rule

Current owner:
- MessageService

Responsibility:
- decide whether a contact can receive direct messages

Final owner candidate:
- DirectMessagePolicy

Migration condition:
- introduce explicit ContactTrustState enum
- update tests for direct-message eligibility
```

---

### 3.6 surface-inventory.md

表面层清单。

记录 legacy / compatibility / temporary surface。

每个 surface 必须说明：

```text
- surface kind
- current owner
- reason for existence
- whether it is allowed to grow
- migration condition
- deletion condition
- related risks
```

原则：

> temporary surface 可以存在，但必须被命名、限制和设置退出条件。

---

### 3.7 construction-rules.md

AI 施工约束。

它记录当前工程中 AI 修改代码时必须遵守的规则。

这些规则应被 Skill、VS Code 插件、未来 CLI / hook / MCP 读取。

示例：

```text
## Do not introduce hardware calls into application layer

Reason:
Application layer should depend on transport ports, not concrete drivers.

Forbidden:
- importing sx1262_driver.h from application modules
- calling sx1262.send() from use-case services

Allowed:
- depend on RadioTransportPort
- implement SX1262RadioAdapter in infrastructure layer
```

---

### 3.8 correction-memory.md

纠错记忆。

记录用户纠正、架构偏好、Do-Not-Repeat 规则和历史误判。

示例：

```text
## Do-Not-Repeat

- 不要把协议 DTO 当作 domain model 传递。
- 不要用 status == 3 表达业务语义，必须引入显式业务枚举。
- 不要让 application service 直接依赖 SQLite / NVS / SX1262。
- 不要把 compatibility adapter 中的临时代码迁移到 domain。
```

纠错记忆应优先级很高。后续 AI agent 必须读取并遵守它。

---

### 3.9 architecture-incidents.json

架构事故日志。

用于记录已经发生过的结构误改、根因和纠偏方式。

建议 schema：

```json
{
  "id": "arch-0001",
  "date": "2026-05-18",
  "symptom": "Application service directly imported SX1262 driver",
  "root_cause": "AI-generated fix bypassed transport abstraction",
  "affected_files": [
    "src/message/message_service.cpp"
  ],
  "correction": "Introduce RadioTransportPort and move SX1262 access into infrastructure adapter",
  "do_not_repeat": "Do not import driver headers from application layer",
  "tags": [
    "boundary-leakage",
    "hardware-coupling",
    "ai-generated-regression"
  ]
}
```

---

### 3.10 session-log.md

会话日志。

记录工具扫描、用户请求、AI 审计、报告生成和关键决策。

它不是聊天全文，而是工程操作摘要。

示例：

```text
## 2026-05-18

- Ran selection audit on MessageService::sendDirectMessage.
- Detected APPLICATION_HARDWARE_COUPLING.
- Added construction rule: application layer must depend on RadioTransportPort.
- User confirmed DirectMessagePolicy as final owner candidate for eligibility rules.
```

---

### 3.11 config.json

本地配置。

用于记录项目特定规则。

建议字段：

```json
{
  "version": 1,
  "layers": {
    "ui": ["src/ui", "src/views"],
    "application": ["src/application", "src/services"],
    "domain": ["src/domain"],
    "infrastructure": ["src/infrastructure", "src/drivers"],
    "protocol": ["src/protocol"]
  },
  "naming_rules": {
    "controller": "UI_PRESENTATION",
    "service": "APPLICATION_USE_CASE",
    "policy": "DOMAIN_RULE",
    "repository": "DATA_PERSISTENCE",
    "adapter": "TRANSPORT_COMMUNICATION",
    "driver": "INFRASTRUCTURE_HARDWARE"
  },
  "ignored_paths": [
    "node_modules",
    "dist",
    "build",
    ".git"
  ]
}
```

---

## 4. 事实、推断与人工确认

本地知识库中的内容必须区分三种来源：

```text
FACT       静态分析可确认的事实，例如 import、symbol、file path、reference。
INFERENCE  工具或 AI 根据证据推断出的结论，例如 suspected layer。
CONFIRMED  用户或项目维护者确认过的判断，例如 final owner。
```

任何推断性内容都必须带 `confidence`。

禁止把 AI 推断伪装成事实。

---

## 5. 更新时机

### 5.1 初始化时

当用户运行初始化命令时，应创建 `.distinction/` 目录和最小文件。

未来命令形态：

```bash
dat init
```

### 5.2 扫描项目时

当用户执行项目扫描时，应更新：

```text
project-map.md
architecture-map.md
responsibility-map.md
coupling-risks.json
```

未来命令形态：

```bash
dat scan .
```

### 5.3 选中代码审计时

当用户在 VS Code 中执行选区架构审计时，应更新：

```text
reports/latest-selection-insight.md
session-log.md
```

如果发现新的高置信风险，可以建议写入：

```text
coupling-risks.json
construction-rules.md
```

但不应在未经用户确认时把低置信推断永久写入高优先级规则。

### 5.4 用户纠正 AI 时

当用户明确纠正 AI 的结构判断、命名规则、final owner 或施工边界时，应更新：

```text
correction-memory.md
construction-rules.md
final-owner-map.md
```

### 5.5 修改文件后

当工具检测到文件被修改后，应标记相关条目 stale。

可更新：

```text
project-map.md
responsibility-map.md
coupling-risks.json
session-log.md
```

### 5.6 发生架构误改后

当一次 AI 修改造成结构退化、跨层误改、错误迁移或重复犯错时，应记录到：

```text
architecture-incidents.json
correction-memory.md
```

---

## 6. Stale 与一致性检查

本地知识库必须支持 stale 检查。

建议每条记录包含：

```text
source file path
source file hash or mtime
last scanned timestamp
confidence
status
```

当源文件变化后，对应记录应变成：

```text
status: stale
```

未来命令形态：

```bash
dat knowledge check
dat knowledge refresh
```

VS Code 插件在展示报告时，如果数据 stale，必须提示：

```text
This architecture insight may be stale because source files changed after last scan.
```

中文：

```text
该架构洞察可能已过期，因为源文件在上次扫描后发生了变化。
```

---

## 7. 读写权限与确认机制

不是所有文件都应该自动写入。

### 7.1 可以自动更新

```text
project-map.md
reports/latest-selection-insight.md
session-log.md
```

### 7.2 自动建议，用户确认后写入

```text
construction-rules.md
correction-memory.md
final-owner-map.md
surface-inventory.md
```

### 7.3 可以自动记录，但必须标记来源

```text
coupling-risks.json
architecture-incidents.json
responsibility-map.md
architecture-map.md
```

自动写入时必须包含：

```text
source: analyzer | vscode | skill | user-confirmed
confidence: low | medium | high
status: open | confirmed | stale | resolved
```

---

## 8. VS Code 插件如何使用

VS Code 插件应读取 `.distinction/` 作为上下文增强层。

### 8.1 选区审计前

插件读取：

```text
config.json
project-map.md
architecture-map.md
responsibility-map.md
construction-rules.md
correction-memory.md
```

用途：

- 判断项目层级规则；
- 获取历史纠正；
- 避免重复犯错；
- 提供更准确的选区解释。

### 8.2 选区审计后

插件写入或建议写入：

```text
reports/latest-selection-insight.md
session-log.md
coupling-risks.json
construction-rules.md
```

### 8.3 展示时

插件必须显示：

- 哪些信息来自静态事实；
- 哪些信息来自推断；
- 哪些信息来自用户确认；
- 是否 stale；
- 置信度。

---

## 9. Skill 如何使用

Skill 在分析或修改代码前，应优先读取本地知识库中的以下内容：

```text
construction-rules.md
correction-memory.md
architecture-map.md
responsibility-map.md
final-owner-map.md
surface-inventory.md
```

Skill 必须遵守：

1. 用户确认过的规则优先于 AI 推断；
2. `correction-memory.md` 中的 Do-Not-Repeat 是高优先级约束；
3. `construction-rules.md` 中的边界约束必须在修改前显式复述；
4. `final-owner-map.md` 中已确认的归属不能被随意推翻；
5. stale 数据只能作为线索，不能作为强结论。

---

## 10. 未来 Hook / Agent 集成

本地知识库为未来自动治理提供基础。

未来可支持以下事件：

### 10.1 AI 读文件前

提示该文件：

- 所属层级；
- 主要职责；
- 已知风险；
- 相关 construction rules；
- 是否存在 Do-Not-Repeat 规则。

### 10.2 AI 写文件前

检查：

- 是否违反边界约束；
- 是否复制已有坏结构；
- 是否绕过 final owner；
- 是否把 temporary surface 固化为长期结构。

### 10.3 AI 写文件后

更新或标记：

```text
responsibility-map.md
coupling-risks.json
architecture-map.md
session-log.md
```

### 10.4 AI 修改完成后

生成：

```text
architecture diff
new risks
resolved risks
stale records
required human confirmations
```

---

## 11. 零工作流变化原则

本项目应尽量不要求开发者改变原有工作方式。

优先交互方式：

```text
打开项目
选中代码
执行解释或审计命令
查看报告
确认或拒绝写入长期架构记忆
```

`.distinction/` 应在需要时逐步生成和完善，而不是要求用户一开始手工填写大量配置。

原则：

> 自动收集事实，谨慎持久化推断，用户确认关键规则。

---

## 12. 与 reports 的关系

报告分两类：

### 12.1 临时报告

例如：

```text
reports/latest-selection-insight.md
```

用于当前查看，可以被覆盖。

### 12.2 长期记忆

例如：

```text
construction-rules.md
correction-memory.md
final-owner-map.md
coupling-risks.json
```

这些会影响未来 AI 行为，必须更谨慎。

---

## 13. 成功标准

本地知识库机制完成后，应满足：

- 新 agent 打开项目后，可以通过 `.distinction/` 理解已有架构判断；
- 用户纠正不会只留在聊天记录里，而会沉淀成 Do-Not-Repeat 或 construction rule；
- 已发现的耦合风险不会在下一次会话中丢失；
- final owner 判断可以跨会话延续；
- temporary / compatibility surface 不会被 AI 误当成长期结构；
- VS Code 插件和 Skill 使用同一份架构记忆；
- 后续 hook / MCP / CLI 可以复用同一机制。

---

## 14. 第一阶段落地范围

第一阶段不需要实现完整自动治理，但必须在规格和最小实现中保留这些接口。

建议第一阶段实现：

```text
1. dat init 创建 .distinction/ 最小结构
2. VS Code 选区审计可输出 reports/latest-selection-insight.md
3. coupling-risks.json 有初始 schema
4. construction-rules.md 有人工确认写入路径
5. correction-memory.md 有 Do-Not-Repeat 模板
6. config.json 支持路径层级规则与命名规则
```

第二阶段再实现 stale 检查、自动更新和 hook 集成。
