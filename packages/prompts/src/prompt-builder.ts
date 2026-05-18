export interface PromptBuildInput {
  projectName: string;
  focus: "inventory" | "responsibility" | "migration" | "review";
  constraints?: string[];
}

export function buildArchitecturePrompt(input: PromptBuildInput): string {
  const constraints = (input.constraints ?? []).map((item) => `- ${item}`).join("\n");
  return [
    `You are analyzing ${input.projectName}.`,
    "",
    `Focus: ${input.focus}.`,
    "",
    "Rules:",
    "- Do not introduce intermediate or transitional layers.",
    "- Assign every responsibility to a final owner.",
    "- Separate hardware facts, target profile, page manifest, layout profile, renderer, and runtime.",
    constraints
  ].filter(Boolean).join("\n");
}
