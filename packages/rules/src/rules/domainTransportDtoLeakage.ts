import type { ArchitectureRule } from "../rule.js";
import { hasAnyTag, hasAnyToken } from "../rule.js";

export const domainTransportDtoLeakageRule: ArchitectureRule = {
  id: "DOMAIN_TRANSPORT_DTO_LEAKAGE",
  evaluate(evidence) {
    const domain = hasAnyTag(evidence, ["layer:domain", "responsibility:domain-model", "responsibility:domain-behavior"]);
    const transport = hasAnyToken(evidence, ["dto", "request", "response", "json", "http", "graphql", "grpc", "payload"]);
    if (domain.length === 0 || transport.length === 0) return [];

    return [{
      type: "DOMAIN_TRANSPORT_DTO_LEAKAGE",
      severity: "warning",
      evidence: [...domain, ...transport],
      mixedResponsibilities: ["domain-model", "transport-dto"],
      whyUnreasonable: "Domain code appears to expose transport DTO or protocol payload concerns.",
      aiRisk: "An agent may preserve API response shapes as if they were domain concepts.",
      suggestedCorrection: "Translate transport DTOs at the application or adapter boundary before entering domain behavior.",
      finalOwnerCandidate: {
        owner: "transport/adapter-or-application-mapper",
        rationale: "DTO shape belongs to transport/application mapping, while domain owns behavior and invariants.",
        confidence: "medium"
      },
      confidence: "low"
    }];
  }
};
