import type { ArchitectureSurface } from "@explicit-architecture/core";

export interface SurfaceInventoryReport {
  title: string;
  generatedAt: string;
  surfaces: ArchitectureSurface[];
}
