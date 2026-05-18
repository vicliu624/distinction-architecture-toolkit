import { existsSync } from "node:fs";

const required = [
  "skill/SKILL.md",
  "skill/AGENTS.md",
  "skill/prompts/legacy-surface-inventory.md",
  "skill/prompts/responsibility-decomposition.md",
  "skill/prompts/final-owner-migration.md",
  "skill/checklists/architecture-review.md"
];

let failed = false;
for (const path of required) {
  if (!existsSync(path)) {
    console.error(`Missing Skill file: ${path}`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
