import type { Evidence, KnowledgeConfidence } from "./evidence.js";
import type { ResponsibilityKind } from "./architecture.js";

export type CouplingRiskType =
  | "APPLICATION_HARDWARE_COUPLING"
  | "UI_DOMAIN_COUPLING"
  | "DOMAIN_PERSISTENCE_REPRESENTATION"
  | "DOMAIN_TRANSPORT_DTO_LEAKAGE"
  | "PROTOCOL_USECASE_MIXING"
  | "RESPONSIBILITY_OVERLOAD";

export type RuleSeverity = "info" | "warning" | "error";

export interface FinalOwnerCandidate {
  owner: string;
  rationale: string;
  confidence: KnowledgeConfidence;
}

export interface ConstructionConstraint {
  id: string;
  statement: string;
  rationale?: string;
  evidence?: Evidence[];
  status: "open" | "confirmed" | "resolved";
}

export interface CouplingRisk {
  type: CouplingRiskType;
  severity: RuleSeverity;
  evidence: Evidence[];
  mixedResponsibilities: ResponsibilityKind[];
  whyUnreasonable: string;
  aiRisk: string;
  suggestedCorrection: string;
  finalOwnerCandidate: FinalOwnerCandidate;
  confidence: KnowledgeConfidence;
}

export interface ResponsibilityOverload {
  responsibilities: ResponsibilityKind[];
  evidence: Evidence[];
  whyOverloaded: string;
  confidence: KnowledgeConfidence;
}
