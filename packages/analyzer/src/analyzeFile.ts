import type { Evidence } from "@explicit-architecture/core";
import { analyzeSelection } from "./analyzeSelection.js";

export interface AnalyzeFileInput {
  workspaceRoot: string;
  filePath: string;
  fileContent: string;
  agentEvidence?: Evidence[];
}

export async function analyzeFile(input: AnalyzeFileInput) {
  return analyzeSelection({
    workspaceRoot: input.workspaceRoot,
    filePath: input.filePath,
    fileContent: input.fileContent,
    agentEvidence: input.agentEvidence
  });
}
