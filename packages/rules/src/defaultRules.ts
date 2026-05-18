import type { ArchitectureRule } from "./rule.js";
import { applicationHardwareCouplingRule } from "./rules/applicationHardwareCoupling.js";
import { domainPersistenceRepresentationRule } from "./rules/domainPersistenceRepresentation.js";
import { domainTransportDtoLeakageRule } from "./rules/domainTransportDtoLeakage.js";
import { protocolUsecaseMixingRule } from "./rules/protocolUsecaseMixing.js";
import { responsibilityOverloadRule } from "./rules/responsibilityOverload.js";
import { uiDomainCouplingRule } from "./rules/uiDomainCoupling.js";

export const defaultRules: ArchitectureRule[] = [
  applicationHardwareCouplingRule,
  uiDomainCouplingRule,
  domainPersistenceRepresentationRule,
  domainTransportDtoLeakageRule,
  protocolUsecaseMixingRule,
  responsibilityOverloadRule
];

export function runDefaultRules(
  evidence: Parameters<ArchitectureRule["evaluate"]>[0],
  context: Parameters<ArchitectureRule["evaluate"]>[1]
) {
  return defaultRules.flatMap((rule) => rule.evaluate(evidence, context));
}
