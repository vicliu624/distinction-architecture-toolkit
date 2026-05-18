import type { ArchitectureInsightReport } from "@explicit-architecture/core";

export function renderJson(report: ArchitectureInsightReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
