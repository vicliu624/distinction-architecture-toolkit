export type FinalOwnerKind =
  | "apps"
  | "builds"
  | "boards"
  | "platform"
  | "modules/product-composition"
  | "modules/ui-presentation"
  | "modules/ui-runtime"
  | "modules/domain-runtime"
  | "docs/archive"
  | "tests"
  | "delete";

export interface FinalOwner {
  kind: FinalOwnerKind;
  path: string;
  rationale: string;
}
