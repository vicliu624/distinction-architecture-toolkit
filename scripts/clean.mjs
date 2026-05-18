import { rmSync } from "node:fs";
import { join } from "node:path";

const roots = [
  "packages/core/dist",
  "packages/analyzer/dist",
  "packages/rules/dist",
  "packages/report-model/dist",
  "packages/prompts/dist",
  "vscode-extension/dist",
  "vscode-extension/out"
];

for (const path of roots) {
  rmSync(join(process.cwd(), path), { recursive: true, force: true });
}
