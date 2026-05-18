import type { ArchitectureViolation } from "@explicit-architecture/core";

export interface CouplingDetectionInput {
  file: string;
  content: string;
}

export function detectResponsibilityOverload(input: CouplingDetectionInput): ArchitectureViolation[] {
  const markers = [
    /BOARD_|board_facts/i,
    /layout|font|nav/i,
    /render|gtk|lvgl|widget/i,
    /runtime|service|state/i,
    /page|screen|route/i
  ];

  const hitCount = markers.filter((m) => m.test(input.content)).length;
  if (hitCount < 3) return [];

  return [{
    id: `responsibility-overload:${input.file}`,
    severity: "warning",
    message: "This file appears to mix hardware facts, layout/page decisions, renderer construction, or runtime access.",
    file: input.file,
    ruleId: "responsibility-overload",
    suggestedAction: "Split responsibilities into BoardFacts, TargetUiProfile, PageManifest, LayoutProfile, renderer adapter, and runtime ports."
  }];
}
