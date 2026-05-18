# Architecture Review Checklist

Use this checklist against an ArchitectureInsightReport. The goal is to stop AI from turning candidates into facts, keep responsibilities assigned to final owners, and make local corrections reusable.

## Report Shape

- [ ] The report starts with `# Architecture Insight Report`.
- [ ] It includes Selected Target, Architecture Role, Layer Assessment, Responsibility Breakdown, Evidence, Incoming / Outgoing Relations, Impact Scope, Responsibility Overload, Unreasonable Coupling Points, Final Owner Candidate, AI Collaboration Risk, Construction Constraints, Suggested Correction, and Persistence Suggestions.

## Evidence Discipline

- [ ] Every claim is backed by evidence or marked as unknown.
- [ ] Evidence uses FACT, CANDIDATE, INFERENCE, or CONFIRMED.
- [ ] Confidence is low, medium, or high.
- [ ] Status is open, confirmed, stale, or resolved.
- [ ] Inference is not upgraded to fact without human or local-knowledge confirmation.

## Responsibility

- [ ] Each surface has a final owner candidate.
- [ ] Hardware facts, target profile, application orchestration, domain behavior, persistence representation, transport DTOs, protocol handling, UI presentation, and renderer construction are not silently merged.
- [ ] Responsibility overload is called out when three or more independent responsibilities appear.
- [ ] Runtime state access goes through ports/projections when crossing boundaries.

## Boundary Checks

- [ ] Application code does not directly own hardware driver details.
- [ ] UI code does not define domain behavior.
- [ ] Domain code does not expose persistence representation.
- [ ] Domain code does not expose transport DTO shape.
- [ ] Protocol handling does not own usecase orchestration.
- [ ] Board facts do not select UX.
- [ ] Build entrypoints do not decide page sets.
- [ ] Renderers do not choose targets.

## Migration And Inventory

- [ ] Legacy/compat/temp surfaces are listed when present.
- [ ] Each legacy surface has a disposition and delete condition.
- [ ] No intermediate UI layer is introduced as a permanent owner.
- [ ] No transitional layer, migration adapter, archive-only root, or root legacy checker becomes the new architecture.
- [ ] Real UI/build code is restored to final owners, not deleted merely to make checks pass.

## Persistence

- [ ] Accepted corrections are candidates for `.distinction/correction-memory.md`.
- [ ] Durable constraints are candidates for `.distinction/construction-rules.md`.
- [ ] Reusable risks are candidates for `.distinction/coupling-risks.json`.
