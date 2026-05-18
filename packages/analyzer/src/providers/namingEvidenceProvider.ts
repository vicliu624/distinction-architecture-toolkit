import type { Evidence } from "@explicit-architecture/core";
import type { AnalysisContext, EvidenceProvider } from "../context.js";

const NAME_PATTERN = /\b(class|interface|type|function|const|let|var)\s+([A-Z_a-z][A-Z_a-z0-9]*)/g;

export class NamingEvidenceProvider implements EvidenceProvider {
  name = "naming";

  async collect(context: AnalysisContext): Promise<Evidence[]> {
    const text = context.selectionText?.trim() ? context.selectionText : context.fileContent;
    const evidence: Evidence[] = [];
    for (const match of text.matchAll(NAME_PATTERN)) {
      const name = match[2] ?? "";
      const tags = tagsForName(name);
      if (tags.length === 0) continue;
      evidence.push({
        id: `naming:${evidence.length + 1}`,
        kind: "INFERENCE",
        source: "naming",
        summary: `Name ${name} suggests architectural responsibility.`,
        quote: match[0],
        location: {
          filePath: context.filePath,
          line: lineNumberAt(text, match.index ?? 0)
        },
        tags,
        confidence: "low",
        status: "open"
      });
    }
    return evidence;
  }
}

function tagsForName(name: string): string[] {
  const lowered = name.toLowerCase();
  if (lowered.includes("service")) return ["layer:application", "responsibility:application-service"];
  if (lowered.includes("usecase")) return ["layer:application", "responsibility:usecase-orchestration"];
  if (lowered.includes("repository")) return ["layer:persistence", "responsibility:persistence-representation"];
  if (lowered.includes("dto")) return ["layer:transport", "responsibility:transport-dto"];
  if (lowered.includes("protocol") || lowered.includes("packet")) return ["layer:protocol", "responsibility:protocol-handling"];
  if (lowered.includes("view") || lowered.includes("component") || lowered.includes("ui")) return ["layer:ui", "responsibility:ui-presentation"];
  if (lowered.includes("driver") || lowered.includes("hardware")) return ["layer:hardware", "responsibility:hardware-driver"];
  if (lowered.includes("entity") || lowered.includes("aggregate")) return ["layer:domain", "responsibility:domain-model"];
  return [];
}

function lineNumberAt(text: string, offset: number): number {
  return text.slice(0, offset).split(/\r?\n/).length;
}
