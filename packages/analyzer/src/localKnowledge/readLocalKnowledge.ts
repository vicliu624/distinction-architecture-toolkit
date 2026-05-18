import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CouplingRisk, LocalKnowledgeRecord } from "@explicit-architecture/core";
import { localKnowledgeFiles } from "./templates.js";

export interface LocalKnowledgeSnapshot {
  records: LocalKnowledgeRecord[];
  couplingRisks: CouplingRisk[];
}

export async function readLocalKnowledge(workspaceRoot: string): Promise<LocalKnowledgeSnapshot> {
  const root = join(workspaceRoot, ".distinction");
  const [constructionRules, correctionMemory, couplingRisks] = await Promise.all([
    readOptional(join(root, localKnowledgeFiles.constructionRules)),
    readOptional(join(root, localKnowledgeFiles.correctionMemory)),
    readOptional(join(root, localKnowledgeFiles.couplingRisks))
  ]);

  const now = new Date().toISOString();
  const records: LocalKnowledgeRecord[] = [];
  if (constructionRules.trim()) {
    records.push({
      id: "local:construction-rules",
      source: "local-knowledge",
      title: "Construction rules",
      body: constructionRules,
      confidence: "medium",
      status: "open",
      evidence: [],
      createdAt: now,
      updatedAt: now,
      tags: ["local-knowledge:construction-rules"]
    });
  }
  if (correctionMemory.trim()) {
    records.push({
      id: "local:correction-memory",
      source: "local-knowledge",
      title: "Correction memory",
      body: correctionMemory,
      confidence: "medium",
      status: "open",
      evidence: [],
      createdAt: now,
      updatedAt: now,
      tags: ["local-knowledge:correction-memory"]
    });
  }

  return {
    records,
    couplingRisks: parseCouplingRisks(couplingRisks)
  };
}

async function readOptional(path: string): Promise<string> {
  return readFile(path, "utf8").catch((error: unknown) => {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return "";
    }
    throw error;
  });
}

function parseCouplingRisks(content: string): CouplingRisk[] {
  if (!content.trim()) return [];
  try {
    const parsed = JSON.parse(content) as unknown;
    return Array.isArray(parsed) ? parsed as CouplingRisk[] : [];
  } catch {
    return [];
  }
}
