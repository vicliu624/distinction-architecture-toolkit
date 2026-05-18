# OpenWolf 借鉴边界

本文档记录本项目对 OpenWolf 的借鉴范围。

结论：

> 借鉴工程机制，不借鉴产品定位；借鉴本地知识目录和隐形治理思路，不复制代码或功能叙事。

---

## 1. OpenWolf 解决的问题

OpenWolf 的核心定位是 Claude Code 的 second brain。

它主要解决：

- AI 不知道项目里有哪些文件；
- AI 重复读取同一文件；
- AI 没有项目地图；
- AI 没有用户纠错记忆；
- token 消耗不可见；
- Claude Code 缺少跨会话项目记忆。

---

## 2. 本项目解决的问题

`Distinction Architecture Toolkit` 解决的是另一个问题：

> AI 不知道代码在架构上意味着什么。

本项目关注：

- 代码属于哪一层；
- 它承担哪些职责；
- 调用链如何穿过层级；
- 哪些职责不应该耦合；
- 哪些模块承担过多职责；
- 哪些 surface 是 legacy / compatibility / temporary；
- 哪些职责需要 final owner 迁移；
- AI 后续修改会如何误解这些结构。

---

## 3. 可以借鉴的机制

### 3.1 本地知识目录

OpenWolf 使用 `.wolf/` 目录沉淀项目知识。

本项目计划使用：

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

区别：

- `.wolf/` 偏项目文件地图、token 与 Claude 行为记忆；
- `.distinction/` 偏架构语义、职责归属、耦合风险与 AI 施工约束。

### 3.2 项目地图

可借鉴 OpenWolf 的 anatomy 思路，但本项目的 map 不是简单摘要，而是架构语义索引。

示例：

```text
message_service.cpp
- Layer: Application
- Primary responsibility: direct-message use case orchestration
- Mixed responsibilities: protocol encoding, identity access
- Coupling risks: APPLICATION_HARDWARE_COUPLING
- Final owner candidates: MessagePolicy, RadioTransportPort, MeshPacketBuilder
```

### 3.3 纠错记忆

可借鉴 Do-Not-Repeat 机制。

本项目应记录：

```text
- 不要让 application service 直接依赖 SQLite / NVS / SX1262
- 不要把协议 DTO 当作 domain model 传递
- 不要把 compatibility adapter 中的临时代码迁移到 domain
- 不要用 status == 3 表达业务语义，必须引入显式业务枚举
```

### 3.4 事件日志

可借鉴 buglog / memory 机制，但本项目记录 architecture incident。

示例：

```json
{
  "id": "arch-012",
  "symptom": "Application service directly imported SX1262 driver",
  "root_cause": "Transport abstraction was bypassed during AI-generated fix",
  "correction": "Introduce RadioTransportPort and move SX1262 access to infrastructure adapter",
  "tags": ["boundary-leakage", "hardware-coupling", "ai-generated-regression"]
}
```

### 3.5 Hook 驱动的隐形治理

未来可以支持：

```text
AI 读文件前：提示该文件架构层级、职责、风险
AI 写文件前：检查是否违反 construction rules
AI 写文件后：更新 responsibility-map 与 coupling-risks
AI 修改完成后：生成 architecture diff
```

但这不是第一阶段 MVP。

---

## 4. 不应该借鉴的部分

### 4.1 不把 token saving 作为主卖点

本项目可以降低上下文成本，但核心目标不是省 token，而是降低 AI 理解偏移和结构误改。

### 4.2 不绑定 Claude Code

OpenWolf 是 Claude Code-first。

本项目必须保持 architecture-first，可以未来接入 Claude Code、Copilot、Codex、Cursor、本地模型或企业内部 AI 工具。

### 4.3 不复制代码

OpenWolf 使用 AGPL-3.0。为避免许可证和产品边界混乱，本项目只借鉴公开可见的产品机制和工程思想，不复制实现代码。

---

## 5. 本项目自己的表达

OpenWolf 可以概括为：

> 让 Claude Code 知道项目里有什么。

Distinction Architecture Toolkit 应概括为：

> 让开发者和 AI 知道代码在架构上意味着什么。

这两个方向可以互补，但不能混淆。
