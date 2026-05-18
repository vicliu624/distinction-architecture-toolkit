import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSelection } from "./analyzeSelection.js";

test("analyzes selection and detects hardware coupling and overload without AST", async () => {
  const fileContent = [
    "class MessageService {",
    "  bool sendDirectMessage() {",
    "    sx1262.send(packet);",
    "    sqlite.findContact(id);",
    "    ui.setMessageStatus(\"sent\");",
    "  }",
    "}"
  ].join("\n");

  const report = await analyzeSelection({
    workspaceRoot: "/workspace",
    filePath: "/workspace/src/application/MessageService.ts",
    fileContent,
    selectionText: fileContent
  });

  const types = report.unreasonableCouplingPoints.map((risk) => risk.type);
  assert.ok(types.includes("APPLICATION_HARDWARE_COUPLING"));
  assert.ok(types.includes("RESPONSIBILITY_OVERLOAD"));
});
