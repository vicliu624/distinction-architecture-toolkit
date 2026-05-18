import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const forbidden = [
  ["packages/core", "vscode"],
  ["packages/core", "skill/"],
  ["packages/analyzer", "vscode"],
  ["packages/rules", "vscode"]
];

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === "dist") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) result.push(...walk(full));
    else if (full.endsWith(".ts") || full.endsWith(".md")) result.push(full);
  }
  return result;
}

let failed = false;
for (const [dir, token] of forbidden) {
  const base = join(process.cwd(), dir);
  try {
    for (const file of walk(base)) {
      const content = readFileSync(file, "utf8");
      if (content.includes(token)) {
        console.error(`Boundary violation: ${file} contains "${token}"`);
        failed = true;
      }
    }
  } catch {
    // Directory may not exist yet in partial worktrees.
  }
}

process.exit(failed ? 1 : 0);
