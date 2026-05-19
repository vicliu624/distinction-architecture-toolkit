export const localKnowledgeFiles = {
  config: "config.json",
  correctionMemory: "correction-memory.md",
  constructionRules: "construction-rules.md",
  couplingRisks: "coupling-risks.json",
  sessionLog: "session-log.md",
  specManifest: "specs/manifest.json",
  functionModules: "specs/function-modules.md",
  latestSelectionInsight: "reports/latest-selection-insight.md"
} as const;

export function configTemplate(): string {
  return `${JSON.stringify({
    layers: [
      "ui",
      "application",
      "domain",
      "infrastructure",
      "hardware",
      "persistence",
      "transport",
      "protocol"
    ],
    naming_rules: {
      application: ["Service", "UseCase", "Workflow"],
      domain: ["Entity", "Aggregate", "Policy"],
      infrastructure: ["Adapter", "Repository", "Driver"],
      ui: ["View", "Component", "Presenter"]
    },
    ignored_paths: [
      "node_modules",
      "dist",
      "build",
      ".git"
    ]
  }, null, 2)}\n`;
}

export function correctionMemoryTemplate(): string {
  return [
    "# Correction Memory",
    "",
    "## Do-Not-Repeat",
    "",
    "- Symptom:",
    "- Wrong distinction:",
    "- Correct distinction:",
    "- Evidence:",
    "- Status: open",
    "",
    "## Confirmed Corrections",
    "",
    "- Add confirmed corrections here after human review."
  ].join("\n");
}

export function constructionRulesTemplate(): string {
  return [
    "# Construction Rules",
    "",
    "## AI Construction Constraints",
    "",
    "- Do not present inference as fact. Every claim must carry FACT, CANDIDATE, INFERENCE, or CONFIRMED status.",
    "- Do not let DTOs, database tables, UI views, protocol packets, or hardware drivers define domain truth.",
    "- Do not patch an overloaded file without first naming the mixed responsibilities.",
    "- Do not introduce AST-dependent conclusions in this phase; this toolkit currently uses evidence providers only.",
    "- Persist correction candidates before repeating them across future analyses.",
    "",
    "## Boundary Reminders",
    "",
    "- Application orchestrates use cases.",
    "- Domain owns behavior and invariants.",
    "- Infrastructure owns adapters, drivers, repositories, and external representation.",
    "- UI owns presentation and interaction state, not domain meaning."
  ].join("\n");
}

export function couplingRisksTemplate(): string {
  return "[]\n";
}

export function sessionLogTemplate(): string {
  return [
    "# Session Log",
    "",
    "- Initialized local knowledge workspace."
  ].join("\n");
}

export function latestSelectionInsightTemplate(): string {
  return [
    "# Architecture Insight Report",
    "",
    "No selection analysis has been generated yet."
  ].join("\n");
}

export function functionModulesTemplate(): string {
  return [
    "# 功能模块索引",
    "",
    "这个文件只是功能模块索引，不是规格本体。大型系统应在 `specs/modules/<module-id>/SPEC.md` 中维护每个模块自己的规格。",
    "",
    "## 模块",
    "",
    "尚未生成模块候选。请选择代码并运行 Distinction Architecture 分析。"
  ].join("\n");
}

export function specManifestTemplate(): string {
  return `${JSON.stringify({
    version: 1,
    generated_at: null,
    note: "Spec registry. function-modules.md is only an index; module SPEC.md files are the spec body.",
    modules: []
  }, null, 2)}\n`;
}
