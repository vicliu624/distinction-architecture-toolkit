# Generate Correction Plan

Generate a correction plan from an ArchitectureInsightReport. Do not invent facts outside the report. Preserve the report's evidence kind, confidence, and status labels.

Output:

## Selected Target

Restate the target and the current confidence.

## Coupling Risks

List unreasonable coupling points and their rule types.

## Final Owner Candidate

Identify the owner candidate and explain what evidence supports it.

## Construction Constraints

List constraints that must remain true during implementation.

## Correction Plan

Give ordered correction steps:

1. Stabilize the distinction.
2. Move or isolate responsibilities by final owner.
3. Add or update evidence and tests.
4. Persist accepted knowledge in `.distinction/`.

## Persistence Suggestions

State what belongs in correction-memory.md, construction-rules.md, and coupling-risks.json after human confirmation.
