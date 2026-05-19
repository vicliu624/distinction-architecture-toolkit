# Distinction Architecture Toolkit

## VS Code Extension Alpha

The repository now includes a usable VS Code extension alpha. It can be installed locally, debugged with F5, packaged as a VSIX, initialized with `.distinction/`, and used to generate a Markdown architecture insight report from selected code.

Quick start:

```bash
npm install
npm run build
npm run package -w vscode-extension
```

For F5 debugging, sample-project testing, command usage, local knowledge files, and VSIX installation instructions, see [docs/VSCODE_USAGE.md](docs/VSCODE_USAGE.md).

面向 AI 协作开发的架构理解、职责拆解与结构纠偏工具包。

这个项目用于帮助开发者理解和治理由大模型生成、修改或长期参与维护的软件工程。它关注的不是“代码能不能运行”，也不是传统意义上的格式规范或复杂度检查，而是：

> 这段代码在架构中承担什么职责？  
> 它属于哪一层？  
> 谁调用了它？它又依赖了谁？  
> 修改它会影响哪些地方？  
> 它是否混入了过多职责？  
> 它是否存在不合理耦合点？  
> 它是否会让 AI 后续修改时产生误解、误改或结构漂移？

本项目希望为 AI 协作开发提供一套“结构解释层”和“架构治理层”，让开发者在继续使用 AI 修改代码之前，先看清代码的真实结构与风险。

---

## 一、项目定位

`Distinction Architecture Toolkit` 不是普通的 Linter，也不是单纯的代码复杂度分析工具。

它的核心目标是：

> 帮助开发者识别 AI 生成工程中的职责混杂、边界污染、调用链不清、层级穿透、临时兼容代码扩散、最终归属不明确等结构性问题。

它尤其适合以下场景：

- 使用大模型生成了一个项目，但不确定它的架构是否合理；
- 使用 AI 多轮修改代码后，工程结构开始变得混乱；
- 开发者接手一段 AI 生成代码，需要快速理解其层级、调用链和影响范围；
- 某个 Service / Manager / Handler 越来越大，开始承担过多职责；
- 需要判断某段代码到底应该属于 domain、application、infrastructure、adapter 还是 UI；
- 想在 VS Code 中通过选中代码，直接获得架构解释与耦合风险分析；
- 希望通过 Skill 约束 AI，让 AI 在修改代码前先分析职责、边界和最终归属。

---

## 二、核心能力

### 1. 选区架构解释

在 VS Code 中选中一段代码后，工具可以解释：

- 当前代码属于哪个架构层级；
- 当前函数 / 类 / 文件承担什么职责；
- 它在调用链中的位置；
- 哪些地方调用了它；
- 它调用了哪些下游模块；
- 修改它可能影响哪些入口、流程和测试；
- AI 修改它时需要额外关注哪些上下文。

示例：

```text
Selected Symbol:
MessageService::sendDirectMessage

Detected Layer:
Application Service

Incoming Calls:
- ChatController.send()
- BLECompanionBridge.handleSendRequest()
- MessageCommandHandler.handle()

Outgoing Calls:
- ContactRepository.getById()
- MessagePolicy.validateDirectMessage()
- PkiStore.getIdentity()
- LoRaTransport.send()

Impact Scope:
- UI message sending
- BLE companion message bridge
- direct message validation
- transport delivery behavior
````

---

### 2. 不合理耦合点检测

工具会尝试识别代码中不应该混在一起的职责，例如：

* UI 逻辑与业务规则混合；
* Application Service 直接依赖硬件驱动；
* Domain 逻辑依赖数据库字段或协议 DTO；
* 业务状态判断依赖 magic number / 技术状态码；
* 错误处理逻辑依赖底层异常字符串；
* 配置读取散落在核心业务流程中；
* 一个 Service 同时承担编排、存储、协议编码、硬件发送和 UI 更新。

示例：

```text
Unreasonable Coupling Detected:

[1] Application layer coupled with hardware driver
Evidence:
- MessageService directly calls sx1262.send()

Problem:
Application use case depends on concrete radio implementation.

Suggested Correction:
Introduce RadioTransportPort and move SX1262 access into infrastructure adapter.
```

---

### 3. 过多职责识别

工具会对函数、类、文件进行职责分类，判断是否存在职责过载。

可能的职责类型包括：

* UI / Presentation
* Application / Use Case
* Domain / Business Rule
* Data / Persistence
* Transport / Communication
* Protocol / Encoding
* Infrastructure / Hardware
* Configuration
* Error / Logging
* Test / Debug / Mock

示例：

```text
Responsibility Mixing Report:

File:
src/message/message_service.cpp

Detected Responsibilities:
- Application orchestration
- Domain validation
- Identity storage access
- Protocol encoding
- Hardware transport
- UI state mutation

Risk:
Critical

Reason:
This file is not only an application service. It also owns domain policy,
packet construction, hardware communication, and UI state mutation.
```

---

### 4. 最终归属分析

很多 AI 生成代码的问题不是“错”，而是“不知道最终应该归谁”。

本工具会尝试回答：

* 这段逻辑的最终归属应该是谁？
* 当前代码只是临时兼容层，还是长期结构的一部分？
* 当前职责应该沉到 domain，留在 application，还是移到 infrastructure adapter？
* 某个 legacy / compatibility / temporary surface 是否应该被迁移、收敛或删除？

示例：

```text
Current Owner:
MessageService

Suggested Final Owner:
DirectMessagePolicy

Reason:
The selected condition controls whether a contact can receive direct messages.
This is a domain decision, not an application orchestration detail.
```

---

### 5. AI 协作风险解释

本工具会从 AI 协作角度解释结构问题。

它不仅指出“这里复杂”，还会说明：

* AI 为什么容易误解这里；
* 哪些职责混在一起会诱导 AI 误改；
* 修改这里时应该给 AI 哪些上下文；
* 是否适合直接让 AI 修改；
* 是否需要先做 specification baseline 或职责拆分。

示例：

```text
AI Collaboration Risk:
High

Why:
This method connects business flow, PKI identity, protocol encoding,
and radio transport. An AI agent may not know which parts are business
semantics and which parts are technical implementation details.

Recommended Context for AI Modification:
- MessageApplicationService
- MessagePolicy
- PkiStore interface
- MeshPacketBuilder
- RadioTransportPort
- related tests
```

---

## 三、为什么需要这个工具？

随着大模型逐步参与软件开发，很多工程问题发生了变化。

过去我们主要问：

* 代码能否运行？
* 测试是否通过？
* 复杂度是否过高？
* 是否符合格式规范？

但在 AI 协作开发中，还需要额外追问：

* 工程结构是否容易被 AI 正确理解？
* 某个模块的职责是否足够单一？
* 调用链是否清晰？
* 层级边界是否稳定？
* AI 是否会把技术实现误认为业务语义？
* AI 是否会在局部修改时破坏隐藏约束？
* 项目是否已经被多轮 AI 修改带偏？

`Distinction Architecture Toolkit` 关注的正是这些问题。

它希望帮助开发者把工程从“AI 能写”推进到“AI 能稳定理解、谨慎修改、持续协作”。

---

## 四、产品形态

本仓库有一个语义核心，两个主要产品出口。

```text
skill/                 AI Skill 入口
vscode-extension/      VS Code 插件入口
packages/*             共享模型、分析器、规则、报告与 Prompt 构建模块
```

### 1. Skill

`skill/` 用于约束 AI 的分析与修改行为。

它提供：

* 架构解释流程；
* 职责拆解准则；
* 耦合点识别规则；
* 过多职责判断协议；
* final owner 迁移判断；
* legacy / compatibility / temporary surface 检查；
* AI 施工约束；
* review checklist；
* correction protocol。

Skill 的目标不是让 AI 更快写代码，而是让 AI 在写代码之前先理解：

> 当前代码的职责是什么？
> 当前修改是否会跨越不该跨越的边界？
> 当前职责最终应该归属于哪里？
> 当前实现是否只是临时兼容层？
> 修改后是否会导致结构继续漂移？

入口文件：

```text
skill/SKILL.md
```

---

### 2. VS Code 插件

`vscode-extension/` 用于在开发现场提供交互式架构理解能力。

计划支持的能力包括：

* 选中代码后解释架构位置；
* 查看调用层级；
* 查看 incoming calls / outgoing calls；
* 分析影响范围；
* 检测不合理耦合；
* 检测过多职责；
* 生成架构风险报告；
* 生成职责拆分建议；
* 生成 final-owner migration plan；
* 在编辑器中标记架构风险点。

典型命令：

```text
Explicit Architecture: Explain Selected Code
Explicit Architecture: Find Responsibility Overload
Explicit Architecture: Generate Surface Inventory
```

---

### 3. 共享 Packages

本仓库会将核心概念和分析逻辑沉淀到 `packages/*` 中，避免 Skill 与 VS Code 插件各自发展、语义漂移。

```text
packages/core          领域模型与共享术语
packages/analyzer      源码扫描、符号提取、职责分类
packages/rules         架构守卫规则
packages/report-model  报告 schema 与 Markdown 渲染
packages/prompts       Skill 与 AI 集成使用的 Prompt 构建器
```

---

## 五、核心概念

### 1. Distinction / 区分

本项目的基本前提是：

> 架构问题首先是“区分失败”的问题。

当业务规则、技术实现、协议格式、存储状态、UI 状态、兼容逻辑和临时修复混在一起时，AI 很难判断：

* 什么是业务语义；
* 什么是技术细节；
* 什么是临时方案；
* 什么是长期结构；
* 什么应该保留；
* 什么应该迁移；
* 什么应该删除。

因此，本工具优先识别“哪些东西被错误地混在了一起”。

---

### 2. Responsibility / 职责

职责是代码承担的稳定角色。

一个函数、类或文件可以承担多个职责，但当职责类型跨越过多层级时，就会形成架构风险。

例如：

```text
MessageService 同时承担：
- 用例编排
- 联系人查询
- PKI 读取
- 业务判断
- packet 编码
- LoRa 发送
- UI 状态更新
```

这不是普通复杂度问题，而是职责归属混乱。

---

### 3. Final Owner / 最终归属

很多代码当前的位置只是历史偶然，并不代表它应该永远待在那里。

`final owner` 用于判断：

> 这项职责最终应该由哪个模块、层级或概念拥有？

例如：

```text
contact.status == 3
```

如果它决定“联系人是否允许被直连消息发送”，那么最终归属可能不是数据库字段，而应该是：

```text
DirectMessagePolicy
```

---

### 4. Surface / 表面层

本项目关注三类容易污染长期架构的表面层：

* legacy surface：历史遗留表面；
* compatibility surface：兼容表面；
* temporary surface：临时实现表面。

这些代码不一定应该立刻删除，但必须被识别、命名、约束和设置迁移条件。

---

### 5. AI Construction Constraint / AI 施工约束

AI 修改代码时容易产生以下问题：

* 局部补丁式实现；
* 复制已有坏结构；
* 把临时代码固化为长期结构；
* 把技术字段误认为业务概念；
* 绕过边界直接调用底层实现；
* 在不知道调用影响范围时修改接口；
* 在缺少 specification baseline 时扩展历史偶然性。

因此，本项目会为 AI 修改生成施工约束，例如：

```text
Before modifying this function:
- Do not change transport implementation directly.
- Do not introduce UI state mutation into application service.
- Keep domain policy independent from SQLite/NVS representation.
- Add or update specification baseline before changing behavior.
```

---

## 六、典型使用流程

### 1. 作为 VS Code 插件使用

```text
1. 打开一个工程
2. 选中一段代码
3. 执行：Explicit Architecture: Explain Selected Code
4. 查看架构层级、调用链、职责分类和影响范围
5. 如果发现风险，执行：Find Responsibility Overload
6. 生成纠偏建议或 migration plan
```

### 2. 作为 Skill 使用

```text
1. 将 skill/SKILL.md 作为 AI 协作开发约束
2. 让 AI 在修改代码前先进行职责拆解
3. 要求 AI 输出 coupling evidence、final owner、risk 和 correction plan
4. 再进行受约束的代码修改
```

### 3. 作为分析器使用

未来可以通过 CLI 或自动化流程生成报告：

```bash
npm install
npm run build
npm test
```

计划中的命令形态：

```bash
dat scan .
dat explain src/message/message_service.cpp
dat report .
```

---

## 七、非目标

本项目不追求成为另一个泛泛的代码质量工具。

它不会只说：

```text
这个文件太复杂。
这个函数太长。
这个模块耦合度高。
```

它必须进一步说明：

```text
混合了哪些职责？
哪些职责不应该放在一起？
当前职责的最终归属应该是谁？
哪些代码只是 legacy / compatibility / temporary surface？
迁移或删除的条件是什么？
为什么这会影响 AI 后续理解和修改？
```

---

## 八、当前状态

本项目处于早期设计与原型阶段。

当前重点是沉淀以下内容：

* 统一术语；
* Skill 分析协议；
* VS Code 插件交互模型；
* 职责分类模型；
* 耦合风险规则；
* 报告 schema；
* 选区架构解释流程；
* final-owner migration 机制。

---

## 九、适合谁使用？

适合：

* 正在使用 AI 生成或修改代码的开发者；
* 需要审查 AI 生成工程结构的架构师；
* 维护长期演进系统的团队；
* 希望降低 AI 误改风险的研发团队；
* 正在设计 AI coding workflow 的工程负责人；
* 需要约束低成本模型 / 本地模型参与开发的团队。

不太适合：

* 一次性脚本；
* 极小型 demo；
* 不需要长期维护的原型；
* 完全不使用 AI 协作开发的项目。

---

## 十、项目愿景

这个项目的最终目标不是替代开发者，也不是让 AI 自动重构整个工程。

它希望提供一种新的工程基础能力：

> 让开发者和 AI 都能看见代码背后的职责边界、架构层级、调用影响与结构风险。

当一个工程能够被清楚解释、被稳定区分、被逐步纠偏时，AI 才更可能成为长期可靠的协作者，而不是一次性代码生成器。

````
