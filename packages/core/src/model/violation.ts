export type ViolationSeverity = "info" | "warning" | "error";

export interface ArchitectureViolation {
  id: string;
  severity: ViolationSeverity;
  message: string;
  file: string;
  line?: number;
  ruleId: string;
  suggestedAction: string;
}
