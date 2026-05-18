import type { Evidence } from "@explicit-architecture/core";
import type { AnalysisContext, EvidenceProvider } from "../context.js";

const PATH_PATTERNS: Array<{ pattern: RegExp; tags: string[]; summary: string }> = [
  { pattern: /(^|[/\\])ui([/\\]|$)|component|view/i, tags: ["layer:ui", "responsibility:ui-presentation"], summary: "Path suggests UI ownership." },
  { pattern: /(^|[/\\])application([/\\]|$)|usecase|service/i, tags: ["layer:application", "responsibility:application-service"], summary: "Path suggests application ownership." },
  { pattern: /(^|[/\\])domain([/\\]|$)|entity|aggregate/i, tags: ["layer:domain", "responsibility:domain-model"], summary: "Path suggests domain ownership." },
  { pattern: /(^|[/\\])infra(structure)?([/\\]|$)|adapter/i, tags: ["layer:infrastructure", "responsibility:platform-adapter"], summary: "Path suggests infrastructure or adapter ownership." },
  { pattern: /hardware|driver|gpio|sx1262/i, tags: ["layer:hardware", "responsibility:hardware-driver"], summary: "Path suggests hardware ownership." },
  { pattern: /persistence|repository|sqlite|db/i, tags: ["layer:persistence", "responsibility:persistence-representation"], summary: "Path suggests persistence ownership." },
  { pattern: /transport|protocol|http|grpc|packet/i, tags: ["layer:transport", "responsibility:transport-dto"], summary: "Path suggests transport or protocol ownership." }
];

export class PathEvidenceProvider implements EvidenceProvider {
  name = "path";

  async collect(context: AnalysisContext): Promise<Evidence[]> {
    const evidence: Evidence[] = [];
    for (const item of PATH_PATTERNS) {
      if (!item.pattern.test(context.filePath)) continue;
      evidence.push({
        id: `path:${evidence.length + 1}`,
        kind: "INFERENCE",
        source: "path",
        summary: item.summary,
        quote: context.filePath,
        location: {
          filePath: context.filePath
        },
        tags: item.tags,
        confidence: "medium",
        status: "open"
      });
    }
    return evidence;
  }
}
