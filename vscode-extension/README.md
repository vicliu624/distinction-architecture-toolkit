# Distinction Architecture VS Code Extension

Usable alpha commands:

- Distinction Architecture: Initialize Local Knowledge
- Distinction Architecture: Explain Selected Code
- Distinction Architecture: Open Latest Report
- Distinction Architecture: Open Local Knowledge Folder
- Distinction Architecture: Open Sample Target

This alpha opens a Chinese architecture insight tips panel first. The panel groups scope, impacted code trees, feature modules, quality assessment, test coverage, spec coverage, duplicate-code uncertainty, and a larger `职责评估` section with colored panels.

Feature modules are backed by `.distinction/specs/`: `function-modules.md` is only an index, `manifest.json` is the registry, and each module owns `.distinction/specs/modules/<module-id>/SPEC.md`. The panel can jump to module specs, generate missing module specs with a progress notification, re-run the current analysis after spec generation, and generate a Chinese test-creation plan when no direct test coverage is detected.

It only writes `.distinction/reports/latest-selection-insight.md` when the user chooses to save the insight as a Chinese report.

When launched with the repository F5 configuration, the extension opens `examples/sample-project/src/application/message_service.ts`, selects `sendDirectMessage`, and prompts you to generate a Chinese Tips panel. After that, selecting any non-empty code range automatically opens or updates the Tips panel.

The main alpha surface is the Tips panel, not an automatically persisted report. Its `完整调用图` section is a clickable SVG call graph: upstream callers/references appear on the left, downstream calls appear on the right, and clicking a node jumps to the exact source location.

See `docs/VSCODE_USAGE.md` in the repository root for F5 debugging, VSIX packaging, and sample project instructions.
