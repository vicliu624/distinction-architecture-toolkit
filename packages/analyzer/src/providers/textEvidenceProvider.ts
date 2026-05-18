import type { Evidence } from "@explicit-architecture/core";
import type { AnalysisContext, EvidenceProvider } from "../context.js";

const TOKEN_PATTERNS: Array<{ pattern: RegExp; tags: string[]; summary: string }> = [
  { pattern: /\bsx1262\b|\bgpio\b|\bdriver\b|\bhardware\b|\bspi\b|\bi2c\b|\buart\b/i, tags: ["layer:hardware", "responsibility:hardware-driver"], summary: "Text references hardware or driver concerns." },
  { pattern: /\bsqlite\b|\bsql\b|\btable\b|\bcolumn\b|\bmigration\b|\borm\b|\bprisma\b|\btypeorm\b/i, tags: ["layer:persistence", "responsibility:persistence-representation"], summary: "Text references persistence representation concerns." },
  { pattern: /\bui\b|\bview\b|\bcomponent\b|\brender\b|\bwidget\b|\bsetMessageStatus\b/i, tags: ["layer:ui", "responsibility:ui-presentation"], summary: "Text references UI or presentation concerns." },
  { pattern: /\bdomain\b|\bentity\b|\baggregate\b|\bbusiness\b|\bpolicy\b/i, tags: ["layer:domain", "responsibility:domain-behavior"], summary: "Text references domain behavior concerns." },
  { pattern: /\bdto\b|\brequest\b|\bresponse\b|\bjson\b|\bhttp\b|\bgraphql\b|\bgrpc\b|\bpayload\b/i, tags: ["layer:transport", "responsibility:transport-dto"], summary: "Text references transport or DTO concerns." },
  { pattern: /\bprotocol\b|\bpacket\b|\bframe\b|\bcodec\b|\bencode\b|\bdecode\b/i, tags: ["layer:protocol", "responsibility:protocol-handling"], summary: "Text references protocol handling concerns." },
  { pattern: /\bservice\b|\busecase\b|\bworkflow\b|\borchestrat\w*\b|\bsendDirectMessage\b/i, tags: ["layer:application", "responsibility:application-service", "responsibility:usecase-orchestration"], summary: "Text references application service or usecase orchestration concerns." }
];

export class TextEvidenceProvider implements EvidenceProvider {
  name = "text";

  async collect(context: AnalysisContext): Promise<Evidence[]> {
    const text = context.selectionText?.trim() ? context.selectionText : context.fileContent;
    const lines = text.split(/\r?\n/);
    const evidence: Evidence[] = [];

    for (const tokenPattern of TOKEN_PATTERNS) {
      const lineIndex = lines.findIndex((line) => tokenPattern.pattern.test(line));
      if (lineIndex === -1) continue;
      const quote = lines[lineIndex]?.trim();
      evidence.push({
        id: evidenceId("text", evidence.length),
        kind: "CANDIDATE",
        source: "text",
        summary: tokenPattern.summary,
        quote,
        location: {
          filePath: context.filePath,
          line: lineIndex + 1
        },
        tags: tokenPattern.tags,
        confidence: "medium",
        status: "open"
      });
    }

    return evidence;
  }
}

function evidenceId(source: string, index: number): string {
  return `${source}:${index + 1}`;
}
