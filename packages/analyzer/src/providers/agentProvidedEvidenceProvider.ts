import type { Evidence } from "@explicit-architecture/core";
import type { AnalysisContext, EvidenceProvider } from "../context.js";

export class AgentProvidedEvidenceProvider implements EvidenceProvider {
  name = "agent";

  async collect(context: AnalysisContext): Promise<Evidence[]> {
    return (context.agentEvidence ?? []).map((item, index) => ({
      ...item,
      id: item.id || `agent:${index + 1}`,
      source: "agent",
      kind: item.kind ?? "CANDIDATE",
      confidence: item.confidence ?? "low",
      status: item.status ?? "open"
    }));
  }
}
