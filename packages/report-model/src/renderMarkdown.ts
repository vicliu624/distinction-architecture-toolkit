import type {
  ArchitectureInsightReport,
  CallRelation,
  ConstructionConstraint,
  CouplingRisk,
  Evidence,
  Responsibility
} from "@explicit-architecture/core";

export function renderMarkdown(report: ArchitectureInsightReport): string {
  const lines: string[] = [
    "# Architecture Insight Report",
    "",
    "## Selected Target",
    "",
    `- Workspace: \`${report.selectedTarget.workspaceRoot}\``,
    `- File: \`${report.selectedTarget.filePath}\``,
    `- Target: ${report.selectedTarget.targetName ?? "Selection / file"}`,
    "",
    "## Architecture Role",
    "",
    `- Surface: \`${report.architectureRole.surfaceKind}\``,
    `- Symbol role: \`${report.architectureRole.symbolRole}\``,
    `- Primary layer: \`${report.architectureRole.primaryLayer}\``,
    `- Confidence: \`${report.architectureRole.confidence}\``,
    "",
    "## Layer Assessment",
    "",
    `- Expected layer: \`${report.layerAssessment.expectedLayer}\``,
    `- Observed layers: ${formatCodeList(report.layerAssessment.observedLayers)}`,
    `- Confidence: \`${report.layerAssessment.confidence}\``,
    "",
    report.layerAssessment.summary || "No layer assessment available.",
    "",
    "## Responsibility Breakdown",
    ""
  ];

  lines.push(...formatResponsibilities(report.responsibilityBreakdown));
  lines.push(
    "",
    "## Evidence",
    ""
  );
  lines.push(...formatEvidence(report.evidence));
  lines.push(
    "",
    "## Incoming / Outgoing Relations",
    "",
    "### Incoming",
    ""
  );
  lines.push(...formatRelations(report.relations.incoming));
  lines.push("", "### Outgoing", "");
  lines.push(...formatRelations(report.relations.outgoing));
  lines.push(
    "",
    "## Impact Scope",
    "",
    `- Summary: ${report.impactScope.summary}`,
    `- Files: ${formatCodeList(report.impactScope.files)}`,
    `- Layers: ${formatCodeList(report.impactScope.layers)}`,
    `- Confidence: \`${report.impactScope.confidence}\``,
    "",
    "## Responsibility Overload",
    ""
  );
  if (report.responsibilityOverload) {
    lines.push(
      `- Responsibilities: ${formatCodeList(report.responsibilityOverload.responsibilities)}`,
      `- Confidence: \`${report.responsibilityOverload.confidence}\``,
      `- Why overloaded: ${report.responsibilityOverload.whyOverloaded}`
    );
  } else {
    lines.push("No responsibility overload detected.");
  }

  lines.push("", "## Unreasonable Coupling Points", "");
  lines.push(...formatRisks(report.unreasonableCouplingPoints));
  lines.push("", "## Final Owner Candidate", "");
  if (report.finalOwnerCandidate) {
    lines.push(
      `- Owner: \`${report.finalOwnerCandidate.owner}\``,
      `- Confidence: \`${report.finalOwnerCandidate.confidence}\``,
      `- Rationale: ${report.finalOwnerCandidate.rationale}`
    );
  } else {
    lines.push("No final owner candidate inferred.");
  }

  lines.push(
    "",
    "## AI Collaboration Risk",
    "",
    report.aiCollaborationRisk || "No AI collaboration risk recorded.",
    "",
    "## Construction Constraints",
    ""
  );
  lines.push(...formatConstraints(report.constructionConstraints));
  lines.push(
    "",
    "## Suggested Correction",
    "",
    report.suggestedCorrection || "No correction suggested.",
    "",
    "## Persistence Suggestions",
    ""
  );
  lines.push(...formatBullets(report.persistenceSuggestions));

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

function formatResponsibilities(items: Responsibility[]): string[] {
  if (items.length === 0) return ["No responsibilities inferred."];
  return items.map((item) => `- \`${item.kind}\`: ${item.description} (${item.confidence})`);
}

function formatEvidence(items: Evidence[]): string[] {
  if (items.length === 0) return ["No evidence collected."];
  return items.map((item) => {
    const location = item.location?.line ? ` at line ${item.location.line}` : "";
    const quote = item.quote ? ` Quote: \`${oneLine(item.quote)}\`.` : "";
    return `- [${item.kind}/${item.source}/${item.confidence}/${item.status}] ${item.summary}${location}.${quote}`;
  });
}

function formatRelations(items: CallRelation[]): string[] {
  if (items.length === 0) return ["- None detected."];
  return items.map((item) => `- \`${item.kind}\` ${item.target} (${item.confidence})`);
}

function formatRisks(items: CouplingRisk[]): string[] {
  if (items.length === 0) return ["No unreasonable coupling points detected."];
  const lines: string[] = [];
  for (const risk of items) {
    lines.push(`### ${risk.type}`);
    lines.push("");
    lines.push(`- Severity: \`${risk.severity}\``);
    lines.push(`- Confidence: \`${risk.confidence}\``);
    lines.push(`- Mixed responsibilities: ${formatCodeList(risk.mixedResponsibilities)}`);
    lines.push(`- Why unreasonable: ${risk.whyUnreasonable}`);
    lines.push(`- AI risk: ${risk.aiRisk}`);
    lines.push(`- Suggested correction: ${risk.suggestedCorrection}`);
    lines.push(`- Final owner candidate: \`${risk.finalOwnerCandidate.owner}\` (${risk.finalOwnerCandidate.confidence})`);
    lines.push("");
  }
  return lines;
}

function formatConstraints(items: ConstructionConstraint[]): string[] {
  if (items.length === 0) return ["No construction constraints recorded."];
  return items.map((item) => `- [${item.status}] ${item.statement}${item.rationale ? ` ${item.rationale}` : ""}`);
}

function formatBullets(items: string[]): string[] {
  if (items.length === 0) return ["- None."];
  return items.map((item) => `- ${item}`);
}

function formatCodeList(items: readonly string[]): string {
  if (items.length === 0) return "none";
  return items.map((item) => `\`${item}\``).join(", ");
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
