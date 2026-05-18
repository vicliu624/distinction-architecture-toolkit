import type { ArchitectureViolation } from "@explicit-architecture/core";

const FORBIDDEN = ["ux_pack", "page_manifest", "layout_profile", "app_shell", "renderer", "TargetProfile", "product_composition"];

export function checkBoardFactsBoundary(file: string, content: string): ArchitectureViolation[] {
  if (!file.includes("boards/")) return [];
  const token = FORBIDDEN.find((item) => content.includes(item));
  if (!token) return [];
  return [{
    id: `board-facts-boundary:${file}`,
    severity: "error",
    file,
    ruleId: "board-facts-boundary",
    message: `Board facts must not decide or reference ${token}.`,
    suggestedAction: "Move interpretation to product_composition or ui_presentation."
  }];
}
