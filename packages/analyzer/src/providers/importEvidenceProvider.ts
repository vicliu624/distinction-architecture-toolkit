import type { Evidence } from "@explicit-architecture/core";
import type { AnalysisContext, EvidenceProvider } from "../context.js";

const IMPORT_PATTERN = /^\s*import\s.+?\sfrom\s+["'](.+?)["']|^\s*import\s+["'](.+?)["']|^\s*const\s.+?=\s+require\(["'](.+?)["']\)/gm;

export class ImportEvidenceProvider implements EvidenceProvider {
  name = "import";

  async collect(context: AnalysisContext): Promise<Evidence[]> {
    const evidence: Evidence[] = [];
    for (const match of context.fileContent.matchAll(IMPORT_PATTERN)) {
      const imported = match[1] ?? match[2] ?? match[3] ?? "";
      const tags = tagsForImport(imported);
      evidence.push({
        id: `import:${evidence.length + 1}`,
        kind: "FACT",
        source: "import",
        summary: `Imports ${imported}.`,
        quote: match[0],
        location: {
          filePath: context.filePath,
          line: lineNumberAt(context.fileContent, match.index ?? 0)
        },
        tags,
        confidence: tags.length > 0 ? "medium" : "low",
        status: "open"
      });
    }
    return evidence;
  }
}

function tagsForImport(value: string): string[] {
  const lowered = value.toLowerCase();
  const tags: string[] = [];
  if (/ui|view|component|react|vue|svelte/.test(lowered)) tags.push("layer:ui", "responsibility:ui-presentation");
  if (/domain|entity|aggregate/.test(lowered)) tags.push("layer:domain", "responsibility:domain-model");
  if (/sqlite|sql|repo|prisma|typeorm|db/.test(lowered)) tags.push("layer:persistence", "responsibility:persistence-representation");
  if (/gpio|driver|hardware|sx1262/.test(lowered)) tags.push("layer:hardware", "responsibility:hardware-driver");
  if (/protocol|packet|codec|transport|http|grpc/.test(lowered)) tags.push("layer:protocol", "responsibility:protocol-handling");
  return tags;
}

function lineNumberAt(text: string, offset: number): number {
  return text.slice(0, offset).split(/\r?\n/).length;
}
