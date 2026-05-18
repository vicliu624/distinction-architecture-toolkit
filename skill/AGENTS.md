# Agent Instructions

## Behavioral constraints

- Prefer final-owner migration over wrapper-based migration.
- Never hide a regression behind a checker.
- If real build/UI code was deleted, stop cleanup work and switch to regression recovery.
- Do not call skeleton code a complete migration.
- Treat `legacy`, `compatibility`, `temporary`, `fallback`, `shim`, `deprecated`, `probe`, and `smoke` as surfaces requiring classification.

## Required reasoning order

1. Inventory current surfaces.
2. Classify responsibilities.
3. Assign final owners.
4. Pick governing design patterns.
5. Define migration/deletion conditions.
6. Add guardrail checkers.
7. Only then execute code changes.

## Output style

Use actionable implementation guidance. Include file paths, expected owners, forbidden patterns, and checker names.
