import type { ArchitectureRule } from "../rule.js";
import { hasAnyTag, hasAnyToken } from "../rule.js";

export const uiDomainCouplingRule: ArchitectureRule = {
  id: "UI_DOMAIN_COUPLING",
  evaluate(evidence) {
    const ui = hasAnyTag(evidence, ["layer:ui", "responsibility:ui-presentation", "responsibility:renderer-creation"]);
    const domain = hasAnyToken(evidence, ["domain", "entity", "aggregate", "repository", "business", "policy"]);
    if (ui.length === 0 || domain.length === 0) return [];

    return [{
      type: "UI_DOMAIN_COUPLING",
      severity: "warning",
      evidence: [...ui, ...domain],
      mixedResponsibilities: ["ui-presentation", "domain-behavior"],
      whyUnreasonable: "UI code appears to know domain behavior or domain-owned structures directly.",
      aiRisk: "An agent may let presentation needs reshape domain terms or add UI-only facts to the domain model.",
      suggestedCorrection: "Pass view models or commands across the boundary instead of letting UI code own domain behavior.",
      finalOwnerCandidate: {
        owner: "application/view-model-or-command-boundary",
        rationale: "The UI should speak through application-facing DTOs or commands while domain behavior remains behind the boundary.",
        confidence: "medium"
      },
      confidence: "low"
    }];
  }
};
