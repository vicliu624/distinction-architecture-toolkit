import test from "node:test";
import assert from "node:assert/strict";
import type { Evidence } from "@explicit-architecture/core";
import { applicationHardwareCouplingRule } from "./applicationHardwareCoupling.js";

test("detects application hardware coupling from evidence", () => {
  const evidence: Evidence[] = [
    {
      id: "path:1",
      kind: "INFERENCE",
      source: "path",
      summary: "Path suggests application ownership.",
      tags: ["layer:application", "responsibility:application-service"],
      confidence: "medium",
      status: "open"
    },
    {
      id: "text:1",
      kind: "CANDIDATE",
      source: "text",
      summary: "Text references sx1262 hardware driver.",
      quote: "sx1262.send(packet);",
      tags: ["layer:hardware", "responsibility:hardware-driver"],
      confidence: "medium",
      status: "open"
    }
  ];

  const risks = applicationHardwareCouplingRule.evaluate(evidence, {
    workspaceRoot: "/workspace",
    filePath: "/workspace/src/application/MessageService.ts"
  });

  assert.equal(risks.length, 1);
  assert.equal(risks[0]?.type, "APPLICATION_HARDWARE_COUPLING");
});
