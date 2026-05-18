# Distinction Architecture Toolkit

A shared toolkit for AI-assisted architecture interpretation, responsibility decomposition, legacy/compatibility/temporary surface detection, final-owner migration planning, and VSCode-based architecture inspection.

This repository intentionally has **one semantic core** and **two product exits**:

- `skill/` — AI Skill instructions, prompts, checklists, and review protocols.
- `vscode-extension/` — VSCode extension entrypoint for code selection, diagnostics, reports, and architecture views.
- `packages/*` — shared model, analyzer, rules, reports, and prompt-rendering packages.

## Why one repository?

The project's core asset is not the VSCode extension or the Skill alone. The core asset is the architecture interpretation model:

- responsibility ownership
- final owner migration
- legacy / compatibility / temporary surface inventory
- coupling and responsibility-overload detection
- design-pattern constraints
- report schemas
- AI施工约束

Keeping Skill and VSCode in one repo prevents semantic drift.

## Packages

```text
packages/core          domain model and shared terminology
packages/analyzer      source scanning, symbol extraction, responsibility classification
packages/rules         architecture guardrail rules
packages/report-model  report schemas and markdown renderers
packages/prompts       prompt builders used by the Skill and future AI integrations
skill/                 Skill distribution
vscode-extension/      VSCode extension distribution
```

## Quick start

```bash
npm install
npm run build
npm test
```

## VSCode extension development

```bash
npm run build
cd vscode-extension
npm run compile
```

Open this repo in VSCode, press `F5`, and run one of the commands:

- `Explicit Architecture: Explain Selected Code`
- `Explicit Architecture: Find Responsibility Overload`
- `Explicit Architecture: Generate Surface Inventory`

## Skill usage

The Skill entrypoint is:

```text
skill/SKILL.md
```

The main prompts live under:

```text
skill/prompts/
```

## Non-goals

This toolkit must not become another vague lint tool. It should not merely say "this file is complex." It must explain:

- what responsibility is being mixed
- what final owner should hold the responsibility
- what design pattern should govern the migration
- what deletion or migration condition makes the change safe
