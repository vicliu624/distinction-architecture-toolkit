import type { Evidence } from "./evidence.js";

export type Layer =
  | "ui"
  | "application"
  | "domain"
  | "infrastructure"
  | "hardware"
  | "persistence"
  | "transport"
  | "protocol"
  | "unknown";

export type ResponsibilityKind =
  | "target-detection"
  | "hardware-facts"
  | "hardware-driver"
  | "build-entrypoint"
  | "app-shell-wiring"
  | "application-service"
  | "usecase-orchestration"
  | "runtime-state-access"
  | "action-dispatch"
  | "page-manifest"
  | "layout-decision"
  | "renderer-creation"
  | "ui-presentation"
  | "platform-adapter"
  | "domain-behavior"
  | "domain-model"
  | "persistence-representation"
  | "transport-dto"
  | "protocol-handling"
  | "test-or-smoke"
  | "documentation"
  | "unknown";

export type SymbolRole =
  | "class"
  | "function"
  | "method"
  | "module"
  | "interface"
  | "type"
  | "constant"
  | "unknown";

export type SurfaceKind =
  | "file"
  | "symbol"
  | "selection"
  | "module"
  | "package"
  | "unknown";

export type CallRelationKind =
  | "incoming"
  | "outgoing"
  | "import"
  | "export"
  | "unknown";

export interface CallRelation {
  kind: CallRelationKind;
  target: string;
  evidence: Evidence[];
  confidence: "low" | "medium" | "high";
}

export interface ImpactScope {
  summary: string;
  files: string[];
  layers: Layer[];
  confidence: "low" | "medium" | "high";
  evidence: Evidence[];
}

export interface Responsibility {
  kind: ResponsibilityKind;
  description: string;
  evidence?: Evidence[];
  confidence: "low" | "medium" | "high";
}

export interface ArchitectureRole {
  surfaceKind: SurfaceKind;
  symbolRole: SymbolRole;
  primaryLayer: Layer;
  responsibilities: Responsibility[];
  confidence: "low" | "medium" | "high";
}
