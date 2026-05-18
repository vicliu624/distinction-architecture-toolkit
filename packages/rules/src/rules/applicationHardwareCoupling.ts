import type { ArchitectureRule } from "../rule.js";
import { hasAnyTag, hasAnyToken } from "../rule.js";

const HARDWARE_TOKENS = ["sx1262", "gpio", "driver", "hardware", "spi", "i2c", "uart"];

export const applicationHardwareCouplingRule: ArchitectureRule = {
  id: "APPLICATION_HARDWARE_COUPLING",
  evaluate(evidence) {
    const application = hasAnyTag(evidence, ["layer:application", "responsibility:application-service", "responsibility:usecase-orchestration"]);
    const hardware = hasAnyToken(evidence, HARDWARE_TOKENS);
    if (application.length === 0 || hardware.length === 0) return [];

    return [{
      type: "APPLICATION_HARDWARE_COUPLING",
      severity: "error",
      evidence: [...application, ...hardware],
      mixedResponsibilities: ["application-service", "hardware-driver"],
      whyUnreasonable: "Application/usecase code is making direct hardware or driver decisions.",
      aiRisk: "An agent may keep adding device-specific branches into the application layer and present them as business facts.",
      suggestedCorrection: "Move hardware operations behind an infrastructure or hardware port and let the application layer depend on an intention-level interface.",
      finalOwnerCandidate: {
        owner: "infrastructure/hardware-adapter",
        rationale: "Hardware tokens belong at the adapter boundary, while the application layer should orchestrate use cases.",
        confidence: "medium"
      },
      confidence: "medium"
    }];
  }
};
