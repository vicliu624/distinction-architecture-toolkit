import type { ArchitectureViolation } from "@explicit-architecture/core";

export interface ResponsibilityReport {
  title: string;
  generatedAt: string;
  violations: ArchitectureViolation[];
}
