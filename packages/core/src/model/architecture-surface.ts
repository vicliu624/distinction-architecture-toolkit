import type { Responsibility } from "./responsibility.js";
import type { FinalOwner } from "./final-owner.js";
import type { DesignPattern } from "./design-pattern.js";
import type { DispositionDecision } from "./disposition.js";

export type ArchitectureSurfaceCategory =
  | "final-owner"
  | "legacy"
  | "compatibility"
  | "temporary"
  | "fallback"
  | "adapter"
  | "bridge"
  | "shim"
  | "deprecated-alias"
  | "probe-or-smoke"
  | "responsibility-overload";

export interface ArchitectureSurface {
  id: string;
  file: string;
  symbol?: string;
  category: ArchitectureSurfaceCategory;
  currentResponsibilities: Responsibility[];
  expectedOwner: FinalOwner;
  designPatterns: DesignPattern[];
  disposition: DispositionDecision;
  notes?: string[];
}
