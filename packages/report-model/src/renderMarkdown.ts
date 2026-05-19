import type {
  ArchitectureInsightReport,
  CallRelation,
  ConstructionConstraint,
  CouplingRisk,
  Evidence,
  Responsibility
} from "@explicit-architecture/core";

export function renderMarkdown(report: ArchitectureInsightReport): string {
  const lines: string[] = [
    "# 架构洞察报告",
    "",
    "## 即时摘要",
    "",
    `- 风险等级：\`${riskLevelLabel(report)}\``,
    `- 主要层候选：\`${layerLabel(report.architectureRole.primaryLayer)}\``,
    `- 主要职责：${mainResponsibility(report)}`,
    `- 主要耦合点：${mainCouplingPoint(report)}`,
    `- 建议下一步：${suggestedCorrectionLabel(report)}`,
    "",
    "## 选中目标",
    "",
    `- 工作区：\`${report.selectedTarget.workspaceRoot}\``,
    `- 文件：\`${report.selectedTarget.filePath}\``,
    `- 目标：${report.selectedTarget.targetName ?? "代码选区 / 文件"}`,
    "",
    "## 架构角色",
    "",
    `- 表面类型：\`${surfaceKindLabel(report.architectureRole.surfaceKind)}\``,
    `- 符号角色：\`${symbolRoleLabel(report.architectureRole.symbolRole)}\``,
    `- 主要层：\`${layerLabel(report.architectureRole.primaryLayer)}\``,
    `- 置信度：\`${confidenceLabel(report.architectureRole.confidence)}\``,
    "",
    "## 分层评估",
    "",
    `- 期望层：\`${layerLabel(report.layerAssessment.expectedLayer)}\``,
    `- 观察到的层：${formatCodeList(report.layerAssessment.observedLayers.map(layerLabel))}`,
    `- 置信度：\`${confidenceLabel(report.layerAssessment.confidence)}\``,
    "",
    layerAssessmentSummary(report),
    "",
    "## 职责拆解",
    ""
  ];

  lines.push(...formatResponsibilities(report.responsibilityBreakdown));
  lines.push(
    "",
    "## 证据",
    ""
  );
  lines.push(...formatEvidence(report.evidence));
  lines.push(
    "",
    "## 传入 / 传出关系",
    "",
    "### 传入",
    ""
  );
  lines.push(...formatRelations(report.relations.incoming));
  lines.push("", "### 传出", "");
  lines.push(...formatRelations(report.relations.outgoing));
  lines.push(
    "",
    "## 影响范围",
    "",
    `- 摘要：${impactScopeSummary(report)}`,
    `- 文件：${formatCodeList(report.impactScope.files)}`,
    `- 层：${formatCodeList(report.impactScope.layers.map(layerLabel))}`,
    `- 置信度：\`${confidenceLabel(report.impactScope.confidence)}\``,
    "",
    "## 职责过载",
    ""
  );
  if (report.responsibilityOverload) {
    lines.push(
      `- 职责：${formatCodeList(report.responsibilityOverload.responsibilities.map(responsibilityLabel))}`,
      `- 置信度：\`${confidenceLabel(report.responsibilityOverload.confidence)}\``,
      `- 判断：${responsibilityOverloadSummary(report)}`
    );
  } else {
    lines.push("未发现明显职责过载。");
  }

  lines.push("", "## 不合理耦合点", "");
  lines.push(...formatRisks(report.unreasonableCouplingPoints));
  lines.push("", "## 最终归属候选", "");
  if (report.finalOwnerCandidate) {
    lines.push(
      `- 归属候选：\`${report.finalOwnerCandidate.owner}\``,
      `- 置信度：\`${confidenceLabel(report.finalOwnerCandidate.confidence)}\``,
      `- 理由：${ownerRationaleLabel(report)}`
    );
  } else {
    lines.push("暂未推断出最终归属候选。");
  }

  lines.push(
    "",
    "## AI 协作风险",
    "",
    aiRiskLabel(report),
    "",
    "## 施工约束",
    ""
  );
  lines.push(...formatConstraints(report.constructionConstraints));
  lines.push(
    "",
    "## 建议修正",
    "",
    suggestedCorrectionLabel(report),
    "",
    "## 持久化建议",
    ""
  );
  lines.push(...persistenceSuggestionLabels(report));

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

function formatResponsibilities(items: Responsibility[]): string[] {
  if (items.length === 0) return ["未推断出明确职责。"];
  return items.map((item) => `- \`${responsibilityLabel(item.kind)}\`（${confidenceLabel(item.confidence)}）`);
}

function formatEvidence(items: Evidence[]): string[] {
  if (items.length === 0) return ["未收集到证据。"];
  return items.map((item) => {
    const location = item.location?.line ? `，第 ${item.location.line} 行` : "";
    const quote = item.quote && item.source !== "local-knowledge" ? ` 引用：\`${oneLine(item.quote)}\`` : "";
    return `- [${evidenceKindLabel(item.kind)} / ${sourceLabel(item.source)} / ${confidenceLabel(item.confidence)} / ${statusLabel(item.status)}] ${evidenceSummary(item)}${location}.${quote}`;
  });
}

function formatRelations(items: CallRelation[]): string[] {
  if (items.length === 0) return ["- 暂未检测到。"];
  return items.map((item) => `- \`${relationKindLabel(item.kind)}\` ${item.target}（${confidenceLabel(item.confidence)}）`);
}

function formatRisks(items: CouplingRisk[]): string[] {
  if (items.length === 0) return ["未检测到不合理耦合点。"];
  const lines: string[] = [];
  for (const risk of items) {
    const copy = riskCopy(risk);
    lines.push(`### ${copy.title}`);
    lines.push("");
    lines.push(`- 严重性：\`${severityLabel(risk.severity)}\``);
    lines.push(`- 置信度：\`${confidenceLabel(risk.confidence)}\``);
    lines.push(`- 混合职责：${formatCodeList(risk.mixedResponsibilities.map(responsibilityLabel))}`);
    lines.push(`- 为什么不合理：${copy.why}`);
    lines.push(`- AI 协作风险：${copy.aiRisk}`);
    lines.push(`- 建议修正：${copy.correction}`);
    lines.push(`- 最终归属候选：\`${risk.finalOwnerCandidate.owner}\`（${confidenceLabel(risk.finalOwnerCandidate.confidence)}）`);
    lines.push("");
  }
  return lines;
}

function formatConstraints(items: ConstructionConstraint[]): string[] {
  if (items.length === 0) return ["未记录施工约束。"];
  return items.map((item) => {
    const text = item.id.startsWith("avoid-repeat:")
      ? `避免重复制造 ${riskTypeLabel(item.id.slice("avoid-repeat:".length))}。`
      : item.id === "evidence-kind-required"
        ? "不要把推断当成事实；保留证据类型、置信度和状态。"
        : item.statement;
    return `- [${constraintStatusLabel(item.status)}] ${text}`;
  });
}

function riskLevelLabel(report: ArchitectureInsightReport): string {
  if (report.unreasonableCouplingPoints.some((risk) => risk.severity === "error")) return "高";
  if (report.unreasonableCouplingPoints.some((risk) => risk.severity === "warning")) return "中";
  if (report.unreasonableCouplingPoints.length > 0) return "低";
  return "未发现";
}

function mainResponsibility(report: ArchitectureInsightReport): string {
  const responsibility =
    report.responsibilityBreakdown.find((item) => responsibilityMatchesLayer(item.kind, report.architectureRole.primaryLayer))
    ?? report.responsibilityBreakdown[0];
  if (!responsibility) return "未推断";
  return `\`${responsibilityLabel(responsibility.kind)}\`（${confidenceLabel(responsibility.confidence)}）`;
}

function mainCouplingPoint(report: ArchitectureInsightReport): string {
  const risk = report.unreasonableCouplingPoints[0];
  if (!risk) return "未检测到";
  return `\`${riskTypeLabel(risk.type)}\`（${severityLabel(risk.severity)} / ${confidenceLabel(risk.confidence)}）`;
}

function suggestedCorrectionLabel(report: ArchitectureInsightReport): string {
  const risk = report.unreasonableCouplingPoints[0];
  if (risk) return riskCopy(risk).correction;
  return "先继续收集证据，不要急于改动结构。";
}

function layerAssessmentSummary(report: ArchitectureInsightReport): string {
  const layers = report.layerAssessment.observedLayers;
  if (layers.length === 0) return "当前证据还不足以判断分层。";
  if (layers.length === 1) return `当前证据主要指向「${layerLabel(layers[0] ?? "unknown")}」。`;
  return `当前证据同时触及 ${layers.map((layer) => `「${layerLabel(layer)}」`).join("、")}；「${layerLabel(report.architectureRole.primaryLayer)}」只是当前主要候选。`;
}

function impactScopeSummary(report: ArchitectureInsightReport): string {
  if (report.impactScope.layers.length > 1) return "该选区可能跨越多个架构层，改动前需要先收敛职责边界。";
  return "该选区当前看起来影响范围较窄，但仍需要结合调用关系确认。";
}

function responsibilityOverloadSummary(report: ArchitectureInsightReport): string {
  if (!report.responsibilityOverload) return "未发现明显职责过载。";
  return "该选区承载了三类或更多相互独立的职责，继续在原地补丁会放大结构混乱。";
}

function ownerRationaleLabel(report: ArchitectureInsightReport): string {
  const risk = report.unreasonableCouplingPoints[0];
  if (risk) return ownerRationaleForRisk(risk);
  return `主要层候选为「${layerLabel(report.architectureRole.primaryLayer)}」。`;
}

function aiRiskLabel(report: ArchitectureInsightReport): string {
  const risk = report.unreasonableCouplingPoints[0];
  if (risk) return riskCopy(risk).aiRisk;
  if (report.responsibilityBreakdown.length > 2) return "职责较多，AI 可能因为局部信息充足而继续在当前文件补丁，导致职责继续堆叠。";
  return "当前证据较少。应继续保留推断标签，避免把候选判断升级成事实。";
}

function persistenceSuggestionLabels(report: ArchitectureInsightReport): string[] {
  if (report.unreasonableCouplingPoints.length === 0) {
    return ["- 只有在人类确认该边界判断后，才建议把这次分析沉淀到 `.distinction/`。"];
  }
  return [
    "- 人类确认后，可把耦合风险写入 `.distinction/coupling-risks.json`。",
    "- 如果接受修正方向，可把 Do-Not-Repeat 记录到 `.distinction/correction-memory.md`。",
    "- 如果约束会长期适用，可提升到 `.distinction/construction-rules.md`。"
  ];
}

function riskCopy(risk: CouplingRisk): { title: string; why: string; aiRisk: string; correction: string } {
  const copy: Record<string, { title: string; why: string; aiRisk: string; correction: string }> = {
    APPLICATION_HARDWARE_COUPLING: {
      title: "应用层直接耦合硬件",
      why: "应用 / 用例代码正在直接做硬件或驱动决策，业务意图和设备细节被混在了一起。",
      aiRisk: "AI 后续很容易继续把设备分支加进应用层，并把硬件事实误写成业务事实。",
      correction: "把硬件操作移到基础设施或硬件适配器后面，应用层只依赖表达业务意图的端口。"
    },
    UI_DOMAIN_COUPLING: {
      title: "UI 与领域行为耦合",
      why: "展示层代码看起来知道了领域行为或领域结构，UI 需求可能反向塑造核心模型。",
      aiRisk: "AI 可能为了满足界面展示，把展示字段、状态或交互细节写成领域概念。",
      correction: "通过应用层命令或视图模型跨边界，不让 UI 直接拥有领域行为。"
    },
    DOMAIN_PERSISTENCE_REPRESENTATION: {
      title: "领域层泄漏持久化表示",
      why: "领域代码暴露了表、列、ORM、SQL 等持久化表示细节。",
      aiRisk: "AI 可能把数据库形状当成领域真相，后续围绕表结构继续生造对象。",
      correction: "把持久化表示放到 repository / mapper / adapter，领域对象保持与存储无关。"
    },
    DOMAIN_TRANSPORT_DTO_LEAKAGE: {
      title: "领域层泄漏传输 DTO",
      why: "领域代码出现了 request、response、DTO、payload 等传输形状。",
      aiRisk: "AI 可能把接口返回结构当成领域模型，导致外部协议污染核心语义。",
      correction: "在传输层或应用层完成 DTO 转换，再进入领域行为。"
    },
    PROTOCOL_USECASE_MIXING: {
      title: "协议处理与用例编排混合",
      why: "协议解析 / 编码逻辑看起来同时拥有了业务流程编排。",
      aiRisk: "AI 可能继续把业务分支写进协议 handler，让协议细节支配用例。",
      correction: "协议层只负责 decode / encode，把用例编排交给应用层。"
    },
    RESPONSIBILITY_OVERLOAD: {
      title: "职责过载",
      why: "同一个选区承载了三类或更多独立职责。",
      aiRisk: "AI 会倾向于继续在这个“什么都有”的位置补丁，进一步加重结构混乱。",
      correction: "按最终归属拆分职责：编排、适配、持久化、UI、领域行为分别回到对应边界。"
    }
  };
  return copy[risk.type] ?? {
    title: risk.type,
    why: risk.whyUnreasonable,
    aiRisk: risk.aiRisk,
    correction: risk.suggestedCorrection
  };
}

function ownerRationaleForRisk(risk: CouplingRisk): string {
  const rationales: Record<string, string> = {
    APPLICATION_HARDWARE_COUPLING: "硬件 token 应归属到硬件 / 基础设施适配边界；应用层只负责用例编排。",
    UI_DOMAIN_COUPLING: "UI 不应拥有领域行为；更合适的归属是应用层的命令、视图模型或边界 DTO。",
    DOMAIN_PERSISTENCE_REPRESENTATION: "持久化表示应归属到 repository、mapper 或基础设施适配器，而不是领域模型。",
    DOMAIN_TRANSPORT_DTO_LEAKAGE: "传输 DTO 应归属到传输适配或应用映射层，领域层只保留行为和不变量。",
    PROTOCOL_USECASE_MIXING: "协议层只负责编码 / 解码；用例编排应归属应用层。",
    RESPONSIBILITY_OVERLOAD: "当前选区没有单一最终归属，应先按最终 owner 拆分。"
  };
  return rationales[risk.type] ?? "该归属仍需要人工确认。";
}

function riskTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    APPLICATION_HARDWARE_COUPLING: "应用层直接耦合硬件",
    UI_DOMAIN_COUPLING: "UI 与领域行为耦合",
    DOMAIN_PERSISTENCE_REPRESENTATION: "领域层泄漏持久化表示",
    DOMAIN_TRANSPORT_DTO_LEAKAGE: "领域层泄漏传输 DTO",
    PROTOCOL_USECASE_MIXING: "协议处理与用例编排混合",
    RESPONSIBILITY_OVERLOAD: "职责过载"
  };
  return labels[value] ?? value;
}

function responsibilityMatchesLayer(kind: string, layer: string): boolean {
  const layerResponsibilities: Record<string, string[]> = {
    ui: ["ui-presentation", "renderer-creation", "layout-decision", "page-manifest"],
    application: ["application-service", "usecase-orchestration", "app-shell-wiring", "action-dispatch"],
    domain: ["domain-model", "domain-behavior"],
    infrastructure: ["platform-adapter"],
    hardware: ["hardware-driver", "hardware-facts"],
    persistence: ["persistence-representation"],
    transport: ["transport-dto"],
    protocol: ["protocol-handling"]
  };
  return layerResponsibilities[layer]?.includes(kind) ?? false;
}

function layerLabel(value: string): string {
  const labels: Record<string, string> = {
    ui: "UI / 展示层",
    application: "应用层",
    domain: "领域层",
    infrastructure: "基础设施层",
    hardware: "硬件层",
    persistence: "持久化层",
    transport: "传输层",
    protocol: "协议层",
    unknown: "未知"
  };
  return labels[value] ?? value;
}

function responsibilityLabel(value: string): string {
  const labels: Record<string, string> = {
    "target-detection": "目标识别",
    "hardware-facts": "硬件事实",
    "hardware-driver": "硬件驱动",
    "build-entrypoint": "构建入口",
    "app-shell-wiring": "应用壳装配",
    "application-service": "应用服务",
    "usecase-orchestration": "用例编排",
    "runtime-state-access": "运行时状态访问",
    "action-dispatch": "动作分发",
    "page-manifest": "页面清单",
    "layout-decision": "布局决策",
    "renderer-creation": "渲染器创建",
    "ui-presentation": "UI 展示",
    "platform-adapter": "平台适配",
    "domain-behavior": "领域行为",
    "domain-model": "领域模型",
    "persistence-representation": "持久化表示",
    "transport-dto": "传输 DTO",
    "protocol-handling": "协议处理",
    "test-or-smoke": "测试 / 冒烟",
    documentation: "文档",
    unknown: "未知"
  };
  return labels[value] ?? value;
}

function evidenceKindLabel(value: string): string {
  const labels: Record<string, string> = {
    FACT: "事实",
    CANDIDATE: "候选",
    INFERENCE: "推断",
    CONFIRMED: "已确认"
  };
  return labels[value] ?? value;
}

function sourceLabel(value: string): string {
  const labels: Record<string, string> = {
    text: "文本",
    import: "导入",
    path: "路径",
    naming: "命名",
    "local-knowledge": "本地知识",
    agent: "Agent 提供",
    rule: "规则",
    "ide-symbol": "IDE 符号"
  };
  return labels[value] ?? value;
}

function confidenceLabel(value: string): string {
  const labels: Record<string, string> = {
    low: "低",
    medium: "中",
    high: "高"
  };
  return labels[value] ?? value;
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    open: "待确认",
    confirmed: "已确认",
    stale: "可能过期",
    resolved: "已解决"
  };
  return labels[value] ?? value;
}

function severityLabel(value: string): string {
  const labels: Record<string, string> = {
    info: "提示",
    warning: "警告",
    error: "错误"
  };
  return labels[value] ?? value;
}

function constraintStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    open: "待确认",
    confirmed: "已确认",
    resolved: "已解决"
  };
  return labels[value] ?? value;
}

function relationKindLabel(value: string): string {
  const labels: Record<string, string> = {
    incoming: "传入",
    outgoing: "传出",
    import: "导入",
    export: "导出",
    unknown: "未知"
  };
  return labels[value] ?? value;
}

function surfaceKindLabel(value: string): string {
  const labels: Record<string, string> = {
    file: "文件",
    symbol: "符号",
    selection: "代码选区",
    module: "模块",
    package: "包",
    unknown: "未知"
  };
  return labels[value] ?? value;
}

function symbolRoleLabel(value: string): string {
  const labels: Record<string, string> = {
    class: "类",
    function: "函数",
    method: "方法",
    module: "模块",
    interface: "接口",
    type: "类型",
    constant: "常量",
    unknown: "未知"
  };
  return labels[value] ?? value;
}

function evidenceSummary(item: Evidence): string {
  if (item.source === "local-knowledge") {
    if ((item.tags ?? []).includes("local-knowledge:construction-rules")) return "本地知识库中存在施工约束";
    if ((item.tags ?? []).includes("local-knowledge:correction-memory")) return "本地知识库中存在修正记忆";
    return "本地知识库提供了上下文";
  }
  if ((item.tags ?? []).some((tag) => tag.startsWith("layer:hardware"))) return "出现硬件 / 驱动相关迹象";
  if ((item.tags ?? []).some((tag) => tag.startsWith("layer:persistence"))) return "出现持久化表示相关迹象";
  if ((item.tags ?? []).some((tag) => tag.startsWith("layer:ui"))) return "出现 UI / 展示相关迹象";
  if ((item.tags ?? []).some((tag) => tag.startsWith("layer:domain"))) return "出现领域相关迹象";
  if ((item.tags ?? []).some((tag) => tag.startsWith("layer:transport"))) return "出现传输 / DTO 相关迹象";
  if ((item.tags ?? []).some((tag) => tag.startsWith("layer:protocol"))) return "出现协议处理相关迹象";
  if ((item.tags ?? []).some((tag) => tag.startsWith("layer:application"))) return "出现应用服务 / 用例编排相关迹象";
  return item.summary;
}

function formatCodeList(items: readonly string[]): string {
  if (items.length === 0) return "无";
  return items.map((item) => `\`${item}\``).join("、");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
