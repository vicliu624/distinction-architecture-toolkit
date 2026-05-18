import type {
  ArchitectureInsightReport,
  ArchitectureRole,
  CallRelation,
  ConstructionConstraint,
  Evidence,
  ImpactScope,
  Layer,
  Responsibility,
  ResponsibilityKind,
  ResponsibilityOverload,
  SurfaceKind,
  SymbolRole
} from "@explicit-architecture/core";
import { runDefaultRules } from "@explicit-architecture/rules";
import type { AnalysisContext, EvidenceProvider } from "./context.js";
import { AgentProvidedEvidenceProvider } from "./providers/agentProvidedEvidenceProvider.js";
import { ImportEvidenceProvider } from "./providers/importEvidenceProvider.js";
import { LocalKnowledgeProvider } from "./providers/localKnowledgeProvider.js";
import { NamingEvidenceProvider } from "./providers/namingEvidenceProvider.js";
import { PathEvidenceProvider } from "./providers/pathEvidenceProvider.js";
import { TextEvidenceProvider } from "./providers/textEvidenceProvider.js";
import { readLocalKnowledge } from "./localKnowledge/readLocalKnowledge.js";

export interface AnalyzeSelectionInput {
  workspaceRoot: string;
  filePath: string;
  fileContent: string;
  selectionText?: string;
  agentEvidence?: Evidence[];
  providers?: EvidenceProvider[];
}

export async function analyzeSelection(input: AnalyzeSelectionInput): Promise<ArchitectureInsightReport> {
  const context: AnalysisContext = {
    workspaceRoot: input.workspaceRoot,
    filePath: input.filePath,
    fileContent: input.fileContent,
    selectionText: input.selectionText,
    agentEvidence: input.agentEvidence
  };
  const providers = input.providers ?? defaultEvidenceProviders();
  const evidenceGroups = await Promise.all(providers.map((provider) => provider.collect(context)));
  const evidence = dedupeEvidence(evidenceGroups.flat());
  const localKnowledge = await readLocalKnowledge(input.workspaceRoot);
  const risks = runDefaultRules(evidence, {
    workspaceRoot: input.workspaceRoot,
    filePath: input.filePath,
    fileContent: input.fileContent,
    selectionText: input.selectionText
  });
  const responsibilityBreakdown = responsibilitiesFromEvidence(evidence);
  const observedLayers = layersFromEvidence(evidence);
  const primaryLayer = choosePrimaryLayer(observedLayers, input.filePath);
  const responsibilityOverload = overloadFromRisks(risks);

  return {
    id: `architecture-insight:${hashString(`${input.filePath}:${input.selectionText ?? input.fileContent}`)}`,
    generatedAt: new Date().toISOString(),
    selectedTarget: {
      workspaceRoot: input.workspaceRoot,
      filePath: input.filePath,
      selectionText: input.selectionText,
      targetName: inferTargetName(input.selectionText || input.fileContent)
    },
    architectureRole: architectureRoleFor(input, primaryLayer, responsibilityBreakdown),
    layerAssessment: {
      expectedLayer: primaryLayer,
      observedLayers,
      summary: layerSummary(primaryLayer, observedLayers),
      confidence: observedLayers.length > 0 ? "medium" : "low",
      evidence: evidence.filter((item) => (item.tags ?? []).some((tag) => tag.startsWith("layer:")))
    },
    responsibilityBreakdown,
    evidence,
    relations: relationsFromEvidence(evidence),
    impactScope: impactScopeFor(input.filePath, observedLayers, evidence),
    responsibilityOverload,
    unreasonableCouplingPoints: risks,
    finalOwnerCandidate: risks[0]?.finalOwnerCandidate ?? finalOwnerFromLayer(primaryLayer),
    aiCollaborationRisk: aiRiskFor(risks, responsibilityBreakdown),
    constructionConstraints: constructionConstraintsFor(risks),
    suggestedCorrection: risks[0]?.suggestedCorrection ?? "Keep collecting evidence before making structural changes.",
    persistenceSuggestions: persistenceSuggestionsFor(risks),
    localKnowledge: localKnowledge.records
  };
}

export function defaultEvidenceProviders(): EvidenceProvider[] {
  return [
    new LocalKnowledgeProvider(),
    new TextEvidenceProvider(),
    new ImportEvidenceProvider(),
    new PathEvidenceProvider(),
    new NamingEvidenceProvider(),
    new AgentProvidedEvidenceProvider()
  ];
}

function architectureRoleFor(
  input: AnalyzeSelectionInput,
  primaryLayer: Layer,
  responsibilities: Responsibility[]
): ArchitectureRole {
  return {
    surfaceKind: input.selectionText?.trim() ? "selection" : "file",
    symbolRole: inferSymbolRole(input.selectionText || input.fileContent),
    primaryLayer,
    responsibilities,
    confidence: responsibilities.length > 0 ? "medium" : "low"
  };
}

function responsibilitiesFromEvidence(evidence: Evidence[]): Responsibility[] {
  const byKind = new Map<ResponsibilityKind, Evidence[]>();
  for (const item of evidence) {
    for (const tag of item.tags ?? []) {
      if (!tag.startsWith("responsibility:")) continue;
      const kind = tag.slice("responsibility:".length);
      if (!isResponsibilityKind(kind)) continue;
      const existing = byKind.get(kind) ?? [];
      existing.push(item);
      byKind.set(kind, existing);
    }
  }

  return Array.from(byKind.entries()).map(([kind, items]) => ({
    kind,
    description: descriptionForResponsibility(kind),
    evidence: items,
    confidence: strongestConfidence(items)
  }));
}

function layersFromEvidence(evidence: Evidence[]): Layer[] {
  const layers = new Set<Layer>();
  for (const item of evidence) {
    for (const tag of item.tags ?? []) {
      if (!tag.startsWith("layer:")) continue;
      const layer = tag.slice("layer:".length);
      if (isLayer(layer)) layers.add(layer);
    }
  }
  return Array.from(layers);
}

function choosePrimaryLayer(layers: Layer[], filePath: string): Layer {
  if (layers.length === 1) return layers[0] ?? "unknown";
  const lowered = filePath.toLowerCase();
  if (/application|usecase|service/.test(lowered)) return "application";
  if (/domain|entity|aggregate/.test(lowered)) return "domain";
  if (/ui|view|component/.test(lowered)) return "ui";
  if (/hardware|driver|gpio|sx1262/.test(lowered)) return "hardware";
  if (/persistence|repository|sqlite|db/.test(lowered)) return "persistence";
  if (/transport|protocol|http|grpc/.test(lowered)) return "transport";
  return layers[0] ?? "unknown";
}

function relationsFromEvidence(evidence: Evidence[]): { incoming: CallRelation[]; outgoing: CallRelation[] } {
  const outgoing = evidence
    .filter((item) => item.source === "import")
    .map((item): CallRelation => ({
      kind: "import",
      target: item.summary.replace(/^Imports\s+/, "").replace(/\.$/, ""),
      evidence: [item],
      confidence: item.confidence
    }));

  return {
    incoming: [],
    outgoing
  };
}

function impactScopeFor(filePath: string, layers: Layer[], evidence: Evidence[]): ImpactScope {
  return {
    summary: layers.length > 1
      ? "The selected surface appears to touch multiple architectural layers."
      : "The selected surface has a narrow inferred impact scope.",
    files: [filePath],
    layers,
    confidence: layers.length > 0 ? "medium" : "low",
    evidence
  };
}

function overloadFromRisks(risks: ReturnType<typeof runDefaultRules>): ResponsibilityOverload | undefined {
  const risk = risks.find((item) => item.type === "RESPONSIBILITY_OVERLOAD");
  if (!risk) return undefined;
  return {
    responsibilities: risk.mixedResponsibilities,
    evidence: risk.evidence,
    whyOverloaded: risk.whyUnreasonable,
    confidence: risk.confidence
  };
}

function finalOwnerFromLayer(layer: Layer) {
  const ownerByLayer: Record<Layer, string> = {
    ui: "ui/presentation",
    application: "application/usecase",
    domain: "domain/model",
    infrastructure: "infrastructure/adapter",
    hardware: "infrastructure/hardware-adapter",
    persistence: "infrastructure/persistence-adapter",
    transport: "transport/adapter",
    protocol: "protocol/codec",
    unknown: "needs-human-decision"
  };

  return {
    owner: ownerByLayer[layer],
    rationale: `Primary inferred layer is ${layer}.`,
    confidence: layer === "unknown" ? "low" as const : "medium" as const
  };
}

function aiRiskFor(risks: ReturnType<typeof runDefaultRules>, responsibilities: Responsibility[]): string {
  if (risks.length > 0) return risks.map((risk) => risk.aiRisk).join(" ");
  if (responsibilities.length > 2) {
    return "Multiple responsibilities are present; an agent may patch locally without deciding final ownership.";
  }
  return "Low evidence so far. Keep inference labels visible and avoid upgrading candidates to facts.";
}

function constructionConstraintsFor(risks: ReturnType<typeof runDefaultRules>): ConstructionConstraint[] {
  const constraints: ConstructionConstraint[] = [{
    id: "evidence-kind-required",
    statement: "Do not present inference as fact; preserve evidence kind, confidence, and status.",
    status: "open"
  }];

  for (const risk of risks) {
    constraints.push({
      id: `avoid-repeat:${risk.type}`,
      statement: `Avoid repeating ${risk.type} while changing this surface.`,
      rationale: risk.whyUnreasonable,
      evidence: risk.evidence,
      status: "open"
    });
  }

  return constraints;
}

function persistenceSuggestionsFor(risks: ReturnType<typeof runDefaultRules>): string[] {
  if (risks.length === 0) {
    return ["Persist this report only if a human confirms the inferred boundary."];
  }
  return [
    "Add confirmed coupling risks to .distinction/coupling-risks.json after review.",
    "Record any accepted correction in .distinction/correction-memory.md.",
    "Promote durable constraints into .distinction/construction-rules.md."
  ];
}

function layerSummary(primaryLayer: Layer, observedLayers: Layer[]): string {
  if (observedLayers.length === 0) return "No layer could be inferred from the current evidence.";
  if (observedLayers.length === 1) return `Evidence currently points to the ${primaryLayer} layer.`;
  return `Evidence spans ${observedLayers.join(", ")}; ${primaryLayer} is only the current primary candidate.`;
}

function inferTargetName(text: string): string | undefined {
  const match = text.match(/\b(class|interface|type|function|const|let|var)\s+([A-Z_a-z][A-Z_a-z0-9]*)/);
  return match?.[2];
}

function inferSymbolRole(text: string): SymbolRole {
  if (/\bclass\s+/.test(text)) return "class";
  if (/\binterface\s+/.test(text)) return "interface";
  if (/\btype\s+/.test(text)) return "type";
  if (/\bfunction\s+/.test(text)) return "function";
  if (/\bconst\s+|\blet\s+|\bvar\s+/.test(text)) return "constant";
  return "unknown";
}

function descriptionForResponsibility(kind: ResponsibilityKind): string {
  return kind.replace(/-/g, " ");
}

function strongestConfidence(items: Evidence[]): "low" | "medium" | "high" {
  if (items.some((item) => item.confidence === "high")) return "high";
  if (items.some((item) => item.confidence === "medium")) return "medium";
  return "low";
}

function dedupeEvidence(items: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  const result: Evidence[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.summary}:${item.quote ?? ""}:${item.location?.line ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...item,
      id: item.id || `evidence:${result.length + 1}`
    });
  }
  return result;
}

function isLayer(value: string): value is Layer {
  return [
    "ui",
    "application",
    "domain",
    "infrastructure",
    "hardware",
    "persistence",
    "transport",
    "protocol",
    "unknown"
  ].includes(value);
}

function isResponsibilityKind(value: string): value is ResponsibilityKind {
  return [
    "target-detection",
    "hardware-facts",
    "hardware-driver",
    "build-entrypoint",
    "app-shell-wiring",
    "application-service",
    "usecase-orchestration",
    "runtime-state-access",
    "action-dispatch",
    "page-manifest",
    "layout-decision",
    "renderer-creation",
    "ui-presentation",
    "platform-adapter",
    "domain-behavior",
    "domain-model",
    "persistence-representation",
    "transport-dto",
    "protocol-handling",
    "test-or-smoke",
    "documentation",
    "unknown"
  ].includes(value);
}

function hashString(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }
  return Math.abs(hash).toString(16);
}
