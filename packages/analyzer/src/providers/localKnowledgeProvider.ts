import type { Evidence } from "@explicit-architecture/core";
import type { AnalysisContext, EvidenceProvider } from "../context.js";
import { readLocalKnowledge } from "../localKnowledge/readLocalKnowledge.js";

export class LocalKnowledgeProvider implements EvidenceProvider {
  name = "local-knowledge";

  async collect(context: AnalysisContext): Promise<Evidence[]> {
    const knowledge = await readLocalKnowledge(context.workspaceRoot);
    return knowledge.records.flatMap((record, index) => {
      const evidence = record.evidence.length > 0 ? record.evidence : [{
        id: `local-knowledge:${index + 1}`,
        kind: "CONFIRMED" as const,
        source: "local-knowledge" as const,
        summary: record.title,
        quote: record.body,
        location: {
          filePath: context.filePath
        },
        tags: record.tags,
        confidence: record.confidence,
        status: record.status
      }];
      return evidence;
    });
  }
}
