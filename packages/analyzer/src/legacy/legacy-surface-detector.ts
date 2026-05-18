import type { ArchitectureSurface } from "@explicit-architecture/core";
import type { SourceFile } from "../scanner/source-scanner.js";

const KEYWORDS = [
  "legacy",
  "compat",
  "compatibility",
  "transitional",
  "temporary",
  "fallback",
  "shim",
  "deprecated",
  "archive-only",
  "adapter",
  "bridge",
  "probe",
  "smoke"
];

export function detectLegacyLikeSurfaces(files: SourceFile[]): ArchitectureSurface[] {
  const surfaces: ArchitectureSurface[] = [];

  for (const file of files) {
    const content = file.content.toLowerCase();
    const matched = KEYWORDS.filter((keyword) => content.includes(keyword) || file.path.toLowerCase().includes(keyword));

    if (matched.length === 0) continue;

    surfaces.push({
      id: `surface:${file.path}`,
      file: file.path,
      category: "legacy",
      currentResponsibilities: [
        {
          kind: "documentation",
          description: `Contains legacy-like markers: ${matched.join(", ")}`,
          confidence: "medium"
        }
      ],
      expectedOwner: {
        kind: "delete",
        path: file.path,
        rationale: "Needs classification by inventory before migration or deletion."
      },
      designPatterns: ["Architecture Inventory" as never],
      disposition: {
        disposition: "split",
        risk: "medium",
        migrationCondition: "Classify surface and assign final owner."
      }
    });
  }

  return surfaces;
}
