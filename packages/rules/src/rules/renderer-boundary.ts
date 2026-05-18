import type { ArchitectureViolation } from "@explicit-architecture/core";

export function checkRendererBoundary(file: string, content: string): ArchitectureViolation[] {
  const isRenderer = file.includes("ui_lvgl") || file.includes("ui_gtk") || file.includes("ui_ascii") || file.includes("ui_headless");
  if (!isRenderer) return [];
  if (!/BOARD_|target_id|findTargetProfile/.test(content)) return [];
  return [{
    id: `renderer-boundary:${file}`,
    severity: "warning",
    file,
    ruleId: "renderer-boundary",
    message: "Renderer appears to know target or board selection.",
    suggestedAction: "Renderer should consume descriptors/profile DTOs, not choose target or UX."
  }];
}
