import type { ArchitectureViolation } from "@explicit-architecture/core";

const FORBIDDEN = [
  "intermediate_ui",
  "transitional_ui",
  "legacy_ui_extraction",
  "ui_migration_adapter",
  "temporary_ui_profile",
  "modules/ui_legacy_",
  "modules/ui_transition_",
  "modules/ui_intermediate_"
];

export function checkNoTransitionalLayer(file: string, content: string): ArchitectureViolation[] {
  const token = FORBIDDEN.find((item) => file.includes(item) || content.includes(item));
  if (!token) return [];
  return [{
    id: `no-transitional-layer:${file}`,
    severity: "error",
    file,
    ruleId: "no-transitional-layer",
    message: `Forbidden transitional layer marker found: ${token}`,
    suggestedAction: "Move responsibilities directly to final owners or delete the surface."
  }];
}
