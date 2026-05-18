export type EvidenceKind =
  | "FACT"
  | "CANDIDATE"
  | "INFERENCE"
  | "CONFIRMED";

export type KnowledgeConfidence = "low" | "medium" | "high";

export type KnowledgeStatus =
  | "open"
  | "confirmed"
  | "stale"
  | "resolved";

export type EvidenceSource =
  | "text"
  | "import"
  | "path"
  | "naming"
  | "local-knowledge"
  | "agent"
  | "rule"
  | "ide-symbol";

export type KnowledgeSource =
  | "local-knowledge"
  | "agent"
  | "repository"
  | "human"
  | "rule"
  | "generated-report";

export interface EvidenceLocation {
  filePath?: string;
  line?: number;
  column?: number;
  startOffset?: number;
  endOffset?: number;
}

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  source: EvidenceSource;
  summary: string;
  quote?: string;
  location?: EvidenceLocation;
  tags?: string[];
  confidence: KnowledgeConfidence;
  status: KnowledgeStatus;
}
