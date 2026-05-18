import test from "node:test";
import assert from "node:assert/strict";
import type { Evidence } from "@explicit-architecture/core";
import { responsibilityOverloadRule } from "./responsibilityOverload.js";

test("detects responsibility overload when three responsibilities are present", () => {
  const evidence: Evidence[] = [
    {
      id: "a",
      kind: "CANDIDATE",
      source: "text",
      summary: "Application service evidence.",
      tags: ["responsibility:application-service"],
      confidence: "medium",
      status: "open"
    },
    {
      id: "b",
      kind: "CANDIDATE",
      source: "text",
      summary: "Hardware driver evidence.",
      tags: ["responsibility:hardware-driver"],
      confidence: "medium",
      status: "open"
    },
    {
      id: "c",
      kind: "CANDIDATE",
      source: "text",
      summary: "UI evidence.",
      tags: ["responsibility:ui-presentation"],
      confidence: "medium",
      status: "open"
    }
  ];

  const risks = responsibilityOverloadRule.evaluate(evidence, {
    workspaceRoot: "/workspace",
    filePath: "/workspace/src/application/MessageService.ts"
  });

  assert.equal(risks.length, 1);
  assert.equal(risks[0]?.type, "RESPONSIBILITY_OVERLOAD");
});
