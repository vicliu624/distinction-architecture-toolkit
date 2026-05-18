import type { SurfaceInventoryReport } from "../reports/surface-inventory-report.js";
import type { ResponsibilityReport } from "../reports/responsibility-report.js";

export function renderSurfaceInventoryMarkdown(report: SurfaceInventoryReport): string {
  const lines = [`# ${report.title}`, "", `Generated: ${report.generatedAt}`, ""];

  for (const surface of report.surfaces) {
    lines.push(`## ${surface.id}`);
    lines.push("");
    lines.push(`- File: \`${surface.file}\``);
    lines.push(`- Category: \`${surface.category}\``);
    lines.push(`- Expected owner: \`${surface.expectedOwner.path}\``);
    lines.push(`- Disposition: \`${surface.disposition.disposition}\``);
    lines.push(`- Risk: \`${surface.disposition.risk}\``);
    lines.push("");
  }

  return lines.join("\n");
}

export function renderResponsibilityMarkdown(report: ResponsibilityReport): string {
  const lines = [`# ${report.title}`, "", `Generated: ${report.generatedAt}`, ""];

  for (const violation of report.violations) {
    lines.push(`## ${violation.ruleId}`);
    lines.push("");
    lines.push(`- Severity: \`${violation.severity}\``);
    lines.push(`- File: \`${violation.file}\``);
    lines.push(`- Message: ${violation.message}`);
    lines.push(`- Suggested action: ${violation.suggestedAction}`);
    lines.push("");
  }

  return lines.join("\n");
}
