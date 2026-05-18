# Skill 规格

本文档定义 `skill/` 的职责边界、输出协议和 AI 施工约束。

Skill 的目标不是让 AI 更快写代码，而是让 AI 在写代码之前先完成架构解释、职责拆解、耦合审计和施工约束生成。

---

## 1. Skill 的定位

Skill 是本项目的“解释协议”和“施工约束”。

它负责把 AI 从以下模式中拉出来：

```text
看到需求 → 直接改代码 → 局部补丁 → 复制已有坏结构
```

转为：

```text
看到需求 → 识别职责 → 判断层级 → 分析调用影响 → 检测耦合 → 生成约束 → 再决定是否修改
```

---

## 2. Skill 必须回答的问题

每次分析或修改前，AI 必须回答：

1. 当前代码属于哪个架构层级？
2. 当前代码承担哪些职责？
3. 哪些地方调用了这里？
4. 这里调用了哪些下游？
5. 修改这里会影响哪些流程？
6. 是否存在职责过载？
7. 是否存在不合理耦合？
8. 当前职责最终应该归谁？
9. 是否存在 legacy / compatibility / temporary surface？
10. 继续修改前需要哪些 AI 施工约束？

---

## 3. 标准输出结构

Skill 输出必须包含以下部分：

```text
1. Selected Target
2. Architecture Role
3. Layer Assessment
4. Responsibility Breakdown
5. Incoming Calls
6. Outgoing Calls
7. Impact Scope
8. Responsibility Overload
9. Unreasonable Coupling Points
10. Final Owner Candidate
11. Surface Assessment
12. AI Collaboration Risk
13. Construction Constraints
14. Correction Plan
```

---

## 4. Evidence 优先原则

Skill 不允许只给结论。

错误示例：

```text
这个 Service 职责太多，需要重构。
```

正确示例：

```text
Responsibility Overload: High

Evidence:
- sendDirectMessage() reads SQLite contact state
- reads NVS identity key
- checks business condition contact.status == 3
- encodes MeshCore packet
- calls SX1262 driver
- mutates UI message state

Mixed responsibilities:
- application orchestration
- persistence representation
- domain decision
- protocol encoding
- hardware transport
- UI state mutation
```

---

## 5. 修改前约束

当用户要求 AI 修改代码时，Skill 必须先输出：

- required context；
- do-not-change constraints；
- boundary constraints；
- final owner constraints；
- surface constraints；
- safe modification plan。

示例：

```text
Before modifying this function:
- Do not introduce direct hardware calls into application layer.
- Do not use database status code as domain concept.
- Keep protocol packet construction outside domain policy.
- Return MessageSendResult instead of mutating UI state here.
- Include MessagePolicy, RadioTransportPort and related tests in context.
```

---

## 6. Skill 与 VS Code 插件的关系

VS Code 插件负责收集结构事实：

- selected symbol；
- file path；
- imports；
- references；
- incoming calls；
- outgoing calls；
- detected rules。

Skill 负责解释这些事实：

- 架构意义；
- 职责归属；
- AI 风险；
- 纠偏建议；
- 施工约束。

两者必须共享同一套核心概念和报告 schema，不能各说各话。

---

## 7. Skill 非目标

Skill 不应该：

- 直接替代静态分析器；
- 在没有证据时臆测复杂结论；
- 一上来要求大规模重构；
- 把所有问题都解释成 DDD 问题；
- 把所有文件都强行套入固定分层；
- 把临时兼容代码直接视为错误；
- 忽视项目已有约束。

Skill 应优先做：

- 区分；
- 解释；
- 归属；
- 约束；
- 分阶段纠偏。
