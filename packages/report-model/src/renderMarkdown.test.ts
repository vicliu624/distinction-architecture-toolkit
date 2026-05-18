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
    "# Architecture Insight Report",
    "## Selected Target",
    "## Architecture Role",
    "## Layer Assessment",
    "## Responsibility Breakdown",
    "## Evidence",
    "## Incoming / Outgoing Relations",
    "## Impact Scope",
    "## Responsibility Overload",
    "## Unreasonable Coupling Points",
    "## Final Owner Candidate",
    "## AI Collaboration Risk",
    "## Construction Constraints",
    "## Suggested Correction",
    "## Persistence Suggestions"
  ]) {
    assert.match(markdown, new RegExp(escapeRegExp(heading)));
  }
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
