export type DesignPattern =
  | "App Shell"
  | "Build Entrypoint"
  | "Board Facts"
  | "Target Profile"
  | "Binding Registry"
  | "Page Manifest"
  | "Layout Profile"
  | "Target UI Profile"
  | "Strategy"
  | "Null Object"
  | "Adapter"
  | "DTO / Read Model"
  | "Command Port"
  | "Projection / Snapshot"
  | "Guardrail Checker"
  | "Final Owner"
  | "Architecture Inventory";

export interface DesignPatternConstraint {
  pattern: DesignPattern;
  rule: string;
  forbiddenExamples: string[];
}
