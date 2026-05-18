# Find Responsibility Overload

Find whether the selected target carries too many architectural responsibilities. Use the ArchitectureInsightReport vocabulary and keep inference separate from fact.

Output:

## Selected Target

Name the file, symbol, or selection surface.

## Responsibility Breakdown

List responsibilities using the shared responsibility vocabulary: application-service, usecase-orchestration, domain-model, domain-behavior, ui-presentation, renderer-creation, hardware-driver, persistence-representation, transport-dto, protocol-handling, platform-adapter, documentation, test-or-smoke, unknown.

## Evidence

For each responsibility, include evidence kind, confidence, status, and a quote when available.

## Responsibility Overload

Explain whether RESPONSIBILITY_OVERLOAD is present. Treat three or more unrelated responsibilities as a candidate overload, not a confirmed fact.

## AI Collaboration Risk

Explain how an AI agent might make the overload worse by patching locally.

## Final Owner Candidate

Suggest split-by-final-owner or a more specific owner if evidence supports it.

## Construction Constraints

List constraints that prevent future patches from mixing the responsibilities again.
