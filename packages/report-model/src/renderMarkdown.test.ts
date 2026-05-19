import test from "node:test";
import assert from "node:assert/strict";
import type { ArchitectureInsightReport } from "@explicit-architecture/core";
import { renderMarkdown } from "./renderMarkdown.js";

test("renders required ArchitectureInsightReport sections", () => {
  const report: ArchitectureInsightReport = {
    id: "report:test",
    generatedAt: "2026-05-18T00:00:00.000Z",
    selectedTarget: {
      workspaceRoot: "/workspace",
      filePath: "/workspace/src/application/MessageService.ts",
      targetName: "MessageService"
    },
    architectureRole: {
      surfaceKind: "selection",
      symbolRole: "class",
      primaryLayer: "application",
      responsibilities: [],
      confidence: "medium"
    },
    layerAssessment: {
      expectedLayer: "application",
      observedLayers: ["application"],
      summary: "Application service candidate.",
      confidence: "medium",
      evidence: []
    },
    responsibilityBreakdown: [],
    evidence: [],
    relations: {
      incoming: [],
      outgoing: []
    },
    impactScope: {
      summary: "Narrow.",
      files: ["/workspace/src/application/MessageService.ts"],
      layers: ["application"],
      confidence: "medium",
      evidence: []
    },
    unreasonableCouplingPoints: [],
    aiCollaborationRisk: "Keep inference visible.",
    constructionConstraints: [],
    suggestedCorrection: "Collect more evidence.",
    persistenceSuggestions: [],
    localKnowledge: []
  };

  const markdown = renderMarkdown(report);
  for (const heading of [
    "# 架构洞察报告",
    "## 即时摘要",
    "## 选中目标",
    "## 架构角色",
    "## 分层评估",
    "## 职责拆解",
    "## 证据",
    "## 传入 / 传出关系",
    "## 影响范围",
    "## 职责过载",
    "## 不合理耦合点",
    "## 最终归属候选",
    "## AI 协作风险",
    "## 施工约束",
    "## 建议修正",
    "## 持久化建议"
  ]) {
    assert.match(markdown, new RegExp(escapeRegExp(heading)));
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
