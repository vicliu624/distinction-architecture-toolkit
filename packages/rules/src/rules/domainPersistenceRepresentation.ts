import type { ArchitectureRule } from "../rule.js";
import { hasAnyTag, hasAnyToken } from "../rule.js";

export const domainPersistenceRepresentationRule: ArchitectureRule = {
  id: "DOMAIN_PERSISTENCE_REPRESENTATION",
  evaluate(evidence) {
    const domain = hasAnyTag(evidence, ["layer:domain", "responsibility:domain-model", "responsibility:domain-behavior"]);
    const persistence = hasAnyToken(evidence, ["sqlite", "sql", "table", "column", "migration", "orm", "prisma", "typeorm"]);
    if (domain.length === 0 || persistence.length === 0) return [];

    return [{
      type: "DOMAIN_PERSISTENCE_REPRESENTATION",
      severity: "warning",
      evidence: [...domain, ...persistence],
      mixedResponsibilities: ["domain-model", "persistence-representation"],
      whyUnreasonable: "Domain code appears to expose persistence representation details.",
      aiRisk: "An agent may mistake table shape for domain truth and let schema artifacts define the model.",
      suggestedCorrection: "Move persistence representation into a repository/mapper and keep domain objects persistence-agnostic.",
      finalOwnerCandidate: {
        owner: "infrastructure/persistence-mapper",
        rationale: "Persistence details need an adapter or mapper owner, not the domain model.",
        confidence: "medium"
      },
      confidence: "medium"
    }];
  }
};
