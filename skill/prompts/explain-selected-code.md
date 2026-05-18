# Explain Selected Code

Analyze the selected code as an ArchitectureInsightReport. Do not rely on AST-only claims unless AST evidence is explicitly provided. Every claim must preserve one of these evidence kinds: FACT, CANDIDATE, INFERENCE, CONFIRMED. Every claim must preserve confidence: low, medium, high. Every claim must preserve status: open, confirmed, stale, resolved.

Output these sections in this order:

## Selected Target

- File or symbol being analyzed.
- Whether the selected text is a file, symbol, or selection surface.

## Layer Assessment

- Expected layer.
- Observed layers.
- Confidence and evidence.

## Responsibility Breakdown

- List each responsibility.
- Mark mixed responsibilities explicitly.

## Evidence

- Quote local evidence.
- Label every item with kind, confidence, and status.

## Coupling Risks

- Report APPLICATION_HARDWARE_COUPLING, UI_DOMAIN_COUPLING, DOMAIN_PERSISTENCE_REPRESENTATION, DOMAIN_TRANSPORT_DTO_LEAKAGE, PROTOCOL_USECASE_MIXING, and RESPONSIBILITY_OVERLOAD when evidence supports them.

## Final Owner Candidate

- Name the most likely owner.
- Explain why this is only a candidate unless confirmed by local knowledge.

## Construction Constraints

- State constraints the AI must obey before changing this code.

## Correction Plan

- Suggest the smallest correction that restores the distinction.
- Do not propose automatic refactoring unless the evidence is confirmed.
