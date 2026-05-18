import type { CouplingRisk, Evidence } from "@explicit-architecture/core";

export interface RuleContext {
  workspaceRoot: string;
  filePath: string;
  fileContent?: string;
  selectionText?: string;
}

export interface ArchitectureRule {
  id: string;
  evaluate(evidence: Evidence[], context: RuleContext): CouplingRisk[];
}

export function hasAnyToken(evidence: Evidence[], tokens: readonly string[]): Evidence[] {
  const lowered = tokens.map((token) => token.toLowerCase());
  return evidence.filter((item) => {
    const haystack = [
      item.summary,
      item.quote,
      ...(item.tags ?? [])
    ].filter(Boolean).join(" ").toLowerCase();
    return lowered.some((token) => haystack.includes(token));
  });
}

export function hasAnyTag(evidence: Evidence[], tags: readonly string[]): Evidence[] {
  const wanted = new Set(tags);
  return evidence.filter((item) => (item.tags ?? []).some((tag) => wanted.has(tag)));
}
