export type ResponsibilityKind =
  | "target-detection"
  | "hardware-facts"
  | "build-entrypoint"
  | "app-shell-wiring"
  | "runtime-state-access"
  | "action-dispatch"
  | "page-manifest"
  | "layout-decision"
  | "renderer-creation"
  | "platform-adapter"
  | "domain-behavior"
  | "test-or-smoke"
  | "documentation";

export interface Responsibility {
  kind: ResponsibilityKind;
  description: string;
  confidence: "low" | "medium" | "high";
}
