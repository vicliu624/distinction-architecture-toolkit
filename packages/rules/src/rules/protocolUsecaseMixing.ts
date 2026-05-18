import type { ArchitectureRule } from "../rule.js";
import { hasAnyTag, hasAnyToken } from "../rule.js";

export const protocolUsecaseMixingRule: ArchitectureRule = {
  id: "PROTOCOL_USECASE_MIXING",
  evaluate(evidence) {
    const protocol = hasAnyTag(evidence, ["layer:protocol", "responsibility:protocol-handling"]);
    const usecase = hasAnyToken(evidence, ["usecase", "service", "workflow", "orchestrate", "application", "senddirectmessage"]);
    if (protocol.length === 0 || usecase.length === 0) return [];

    return [{
      type: "PROTOCOL_USECASE_MIXING",
      severity: "warning",
      evidence: [...protocol, ...usecase],
      mixedResponsibilities: ["protocol-handling", "usecase-orchestration"],
      whyUnreasonable: "Protocol handling appears to own usecase orchestration.",
      aiRisk: "An agent may add business workflow branches inside protocol parsing or transport handlers.",
      suggestedCorrection: "Let protocol code decode/encode messages and delegate usecase orchestration to the application layer.",
      finalOwnerCandidate: {
        owner: "application/usecase",
        rationale: "Usecase orchestration should be owned by application code after protocol translation.",
        confidence: "medium"
      },
      confidence: "low"
    }];
  }
};
