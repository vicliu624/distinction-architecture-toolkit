import type { ArchitectureSurface } from "./architecture-surface.js";

export interface ProjectSnapshot {
  root: string;
  surfaces: ArchitectureSurface[];
  generatedAt: string;
}
