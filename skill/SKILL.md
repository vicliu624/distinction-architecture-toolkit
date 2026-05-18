# Distinction Architecture Skill

本 Skill 用于 AI 协作开发中的架构解释、职责拆解、耦合审计和施工约束生成。

当用户要求理解、分析、修改或重构代码时，必须先判断该代码在工程结构中的意义，而不是直接进入实现。

---

## 1. 何时触发

当任务涉及以下任一情况时，必须使用本 Skill：

- 分析某段代码的架构位置；
- 理解 AI 生成代码；
- 判断一个函数、类、文件或模块是否职责过多；
- 查找不合理耦合点；
- 分析调用链、调用层级或影响范围；
- 生成重构、拆分、迁移或纠偏建议；
- 让 AI 修改已有工程代码；
- 审查 legacy / compatibility / temporary surface；
- 判断某项职责的 final owner。

---

## 2. 基本原则

### 2.1 区分优先

先区分，再实现。

必须区分：

- 业务语义与技术实现；
- 用例编排与领域规则；
- domain object 与 transport / persistence DTO；
- 长期结构与临时兼容；
- 当前拥有者与最终归属；
- 普通依赖与不合理耦合。

### 2.2 Evidence 优先

所有架构判断必须尽量给出证据。

不要只说：

```text
这个模块职责太多。
```

必须说明：

```text
它同时包含哪些职责？证据在哪里？为什么这些职责不应该混在一起？
```

### 2.3 不急于重构

发现问题后，不要立刻建议大规模重构。

优先级：

1. 解释当前结构；
2. 明确风险；
3. 补充 specification baseline；
4. 稳定命名与概念；
5. 收敛边界；
6. 迁移 final owner；
7. 逐步拆分；
8. 删除或收敛临时 surface。

---

## 3. 标准分析流程

每次分析选中代码或准备修改代码时，按以下顺序输出：

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

如果当前上下文不足，应明确说明缺少哪些信息，不要伪造调用链或文件结构。

---

## 4. 职责分类

分析时优先使用以下职责类型：

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

---

## 5. 不合理耦合检测

重点识别以下风险：

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

每个风险必须尽量输出：

- evidence；
- mixed responsibilities；
- why unreasonable；
- AI collaboration risk；
- suggested correction；
- final owner candidate；
- confidence。

---

## 6. 修改前施工约束

当用户要求修改代码时，必须先生成施工约束：

```text
Required Context:
- 修改前必须纳入哪些文件、接口、测试或 specification。

Do-Not-Change:
- 哪些行为、边界或接口不能随意改。

Boundary Constraints:
- 哪些层不能直接互相依赖。

Final Owner Constraints:
- 哪些职责不能继续留在当前模块。

Safe Plan:
- 低风险、分阶段的修改顺序。
```

---

## 7. 禁止的迁移形态

除非用户明确要求，否则不要提出以下方案：

- intermediate UI layer；
- transitional UI layer；
- migration adapter；
- archive-only source root；
- wrapper that must be cleaned later；
- moving old code wholesale into a new directory。

旧代码原则上只有三种最终结果：

1. 拆分进入 final owners；
2. 被 final owner implementation 替换；
3. 删除。

---

## 8. 输出风格

输出应该面向工程实践，避免抽象空话。

优先使用：

```text
证据 → 解释 → 风险 → 建议 → 施工约束
```

不要把所有问题都强行归为 DDD，也不要在没有证据时臆测架构意图。

---

## 9. 与项目文档的关系

本 Skill 必须遵守：

```text
docs/PRODUCT_SPEC.md
docs/IMPLEMENTATION_PLAN.md
docs/SKILL_SPEC.md
docs/VSCODE_EXTENSION_SPEC.md
```

如果这些文档与当前回答冲突，以文档为准。
