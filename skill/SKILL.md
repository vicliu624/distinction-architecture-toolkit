# Explicit Architecture / Distinction-First Skill

## Purpose

This Skill guides AI agents to analyze software architecture by identifying distinctions before making changes.

The Skill is designed for:

- legacy / compatibility / temporary surface inventory
- responsibility decomposition
- final-owner migration planning
- architectural regression review
- design-pattern constraint generation
- checker/report generation

## Core rule

Never start with directory movement. Start with meaning and responsibility.

Before proposing migration, classify:

1. What responsibility is this code currently carrying?
2. Is the responsibility final, legacy, compatibility, temporary, fallback, shim, or test-only?
3. What is the final owner?
4. What design pattern governs the final owner?
5. What checker prevents regression?

## Forbidden migration shape

Do not propose:

- intermediate UI layer
- transitional UI layer
- migration adapter
- archive-only source root
- wrapper that must be cleaned later
- moving old code wholesale into a new directory

Old code has only three outcomes:

1. split into final owners
2. replaced by final owner implementation
3. deleted

## Required outputs

For any architecture refactor request, produce:

- Surface Inventory
- Responsibility Ownership Report
- Final Owner Migration Plan
- Design Pattern Constraints
- Guardrail Checker Plan
- Regression Risks
- Validation Commands
