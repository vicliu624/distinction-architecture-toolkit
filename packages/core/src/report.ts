import type {
  ArchitectureRole,
  CallRelation,
  ImpactScope,
  Layer,
  Responsibility
} from "./architecture.js";
import type { Evidence, KnowledgeConfidence } from "./evidence.js";
import type { LocalKnowledgeRecord } from "./local-knowledge.js";
import type {
  ConstructionConstraint,
  CouplingRisk,
  FinalOwnerCandidate,
  ResponsibilityOverload
} from "./rules.js";

export interface SelectedTarget {
  workspaceRoot: string;
  filePath: string;
  selectionText?: string;
  targetName?: string;
}

export interface LayerAssessment {
  expectedLayer: Layer;
  observedLayers: Layer[];
  summary: string;
  confidence: KnowledgeConfidence;
  evidence: Evidence[];
}

export interface ArchitectureInsightReport {
  id: string;
  generatedAt: string;
  selectedTarget: SelectedTarget;
  architectureRole: ArchitectureRole;
  layerAssessment: LayerAssessment;
  responsibilityBreakdown: Responsibility[];
  evidence: Evidence[];
  relations: {
    incoming: CallRelation[];
    outgoing: CallRelation[];
  };
  impactScope: ImpactScope;
  responsibilityOverload?: ResponsibilityOverload;
  unreasonableCouplingPoints: CouplingRisk[];
  finalOwnerCandidate?: FinalOwnerCandidate;
  aiCollaborationRisk: string;
  constructionConstraints: ConstructionConstraint[];
  suggestedCorrection: string;
  persistenceSuggestions: string[];
  localKnowledge: LocalKnowledgeRecord[];
}
