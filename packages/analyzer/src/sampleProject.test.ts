import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSelection } from "./analyzeSelection.js";

test("sample project triggers coupling risk", async () => {
  const workspaceRoot = resolve(process.cwd(), "examples/sample-project");
  const filePath = resolve(workspaceRoot, "src/application/message_service.ts");
  const fileContent = await readFile(filePath, "utf8");
  const report = await analyzeSelection({
    workspaceRoot,
    filePath,
    fileContent,
    selectionText: fileContent
  });

  const types = report.unreasonableCouplingPoints.map((risk) => risk.type);
  assert.ok(types.includes("APPLICATION_HARDWARE_COUPLING"));
  assert.ok(types.includes("RESPONSIBILITY_OVERLOAD"));
});
