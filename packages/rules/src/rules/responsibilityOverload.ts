import type { ArchitectureRule } from "../rule.js";

const RESPONSIBILITY_PREFIX = "responsibility:";

export const responsibilityOverloadRule: ArchitectureRule = {
  id: "RESPONSIBILITY_OVERLOAD",
  evaluate(evidence) {
    const responsibilities = new Set<string>();
    const matched = [];

    for (const item of evidence) {
      const tags = item.tags ?? [];
      const responsibilityTags = tags.filter((tag) => tag.startsWith(RESPONSIBILITY_PREFIX));
      for (const tag of responsibilityTags) {
        responsibilities.add(tag.slice(RESPONSIBILITY_PREFIX.length));
        matched.push(item);
      }
    }

    const mixedResponsibilities = Array.from(responsibilities);
    if (mixedResponsibilities.length < 3) return [];

    return [{
      type: "RESPONSIBILITY_OVERLOAD",
      severity: "warning",
      evidence: matched,
      mixedResponsibilities: mixedResponsibilities as never,
      whyUnreasonable: "The selected surface carries three or more distinct architectural responsibilities.",
      aiRisk: "An agent may patch the current file because every concern appears locally available, making the overload worse.",
      suggestedCorrection: "Split the surface by final owner: keep orchestration, adapter concerns, persistence, UI, and domain behavior in separate places.",
      finalOwnerCandidate: {
        owner: "split-by-final-owner",
        rationale: "No single owner should absorb this many independent responsibilities without an explicit boundary decision.",
        confidence: "medium"
      },
      confidence: "medium"
    }];
  }
};
