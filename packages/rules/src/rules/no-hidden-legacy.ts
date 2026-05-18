import type { ArchitectureViolation } from "@explicit-architecture/core";

export function checkNoHiddenLegacy(file: string, content: string): ArchitectureViolation[] {
  if (!content.includes("legacy/app_implementations") && !file.includes("legacy/app_implementations")) return [];
  return [{
    id: `no-hidden-legacy:${file}`,
    severity: "error",
    file,
    ruleId: "no-hidden-legacy",
    message: "Active source references legacy/app_implementations.",
    suggestedAction: "Migrate the responsibility to a final owner or record it only in docs/archive."
  }];
}
