import type { Evidence } from "@explicit-architecture/core";

export interface AnalysisContext {
  workspaceRoot: string;
  filePath: string;
  fileContent: string;
  selectionText?: string;
  agentEvidence?: Evidence[];
}

export interface EvidenceProvider {
  name: string;
  collect(context: AnalysisContext): Promise<Evidence[]>;
}
