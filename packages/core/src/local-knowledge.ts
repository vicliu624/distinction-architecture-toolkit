import type {
  Evidence,
  KnowledgeConfidence,
  KnowledgeSource,
  KnowledgeStatus
} from "./evidence.js";

export interface LocalKnowledgeRecord {
  id: string;
  source: KnowledgeSource;
  title: string;
  body: string;
  confidence: KnowledgeConfidence;
  status: KnowledgeStatus;
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}
