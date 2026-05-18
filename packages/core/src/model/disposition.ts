export type SurfaceDisposition =
  | "keep-final"
  | "move"
  | "split"
  | "rename"
  | "delete"
  | "test-only"
  | "keep-deprecated-alias-temporarily"
  | "fallback-pending-deletion";

export type SurfaceRisk = "low" | "medium" | "high";

export interface DispositionDecision {
  disposition: SurfaceDisposition;
  deleteCondition?: string;
  migrationCondition?: string;
  risk: SurfaceRisk;
}
