# VS Code Extension Usage

This repository includes a usable alpha of the Distinction Architecture VS Code extension. The alpha focuses on local installation, F5 debugging, VSIX packaging, command execution, `.distinction/` local knowledge, Chinese Tips, and optional Markdown report persistence.

It intentionally does not include AST analysis, automatic fixes, MCP integration, or Marketplace publishing.

## Install Dependencies

From the repository root:

```bash
npm install
```

## Compile

From the repository root:

```bash
npm run build
```

This compiles all TypeScript packages and the VS Code extension into `dist/` folders.

## F5 Debugging

1. Open this repository in VS Code.
2. Run `npm install`.
3. Run `npm run build`.
4. Press F5 and choose `Run Distinction Architecture Extension` if VS Code asks for a configuration.

The launch configuration opens an Extension Development Host with:

```text
examples/sample-project
```

as the workspace.

On startup, the alpha should automatically:

1. activate because the sample workspace contains `src/application/message_service.ts`,
2. open `message_service.ts`,
3. select `sendDirectMessage`,
4. show a prompt with `生成洞察`.

Choose `生成洞察` to run the analysis immediately. If you dismiss the prompt, you can simply select any non-empty code range and wait briefly. The extension automatically opens or updates the Chinese Tips panel for the current selection.

Manual fallback: run `Distinction Architecture: Explain Selected Code` from the Command Palette while code is selected.

The command opens a Chinese insight tips panel first. It does not automatically persist every tiny selection as a long-term report. Use the panel's `保存为中文报告` action only when the insight is worth recording under `.distinction/reports/latest-selection-insight.md`.

## Use The Sample Project

Open:

```text
examples/sample-project/src/application/message_service.ts
```

Select `sendDirectMessage`, `DirectMessageWorkflow`, or the whole `MessageService` class, then open the Command Palette and run:

```text
Distinction Architecture: Initialize Local Knowledge
Distinction Architecture: Explain Selected Code
```

The sample intentionally mixes:

- application service orchestration
- SQLite persistence
- protocol encoding
- SX1262 hardware access
- UI state mutation

The generated Tips panel should include at least one coupling risk, usually `APPLICATION_HARDWARE_COUPLING` and `RESPONSIBILITY_OVERLOAD`.

## Commands

The alpha contributes these commands:

- `Distinction Architecture: Initialize Local Knowledge`
- `Distinction Architecture: Explain Selected Code`
- `Distinction Architecture: Open Latest Report`
- `Distinction Architecture: Open Local Knowledge Folder`
- `Distinction Architecture: Open Sample Target`

Selecting code in an active workspace file automatically opens a Chinese tips panel with colored groups for scope, impacted code trees, feature modules, quality assessment, test coverage, spec coverage, duplicate-code uncertainty, and a larger `职责评估` panel.

The `影响功能模块` panel is backed by a spec registry under `.distinction/specs/`. The alpha scans project paths, file names, and symbols to infer function modules, writes a candidate index at `.distinction/specs/function-modules.md`, and records module entries in `.distinction/specs/manifest.json`. The index is not the spec body; each real module spec belongs in `.distinction/specs/modules/<module-id>/SPEC.md`.

The `测试覆盖` panel looks for nearby `*.test.*` / `*.spec.*` files that reference the selected symbol or file. If no direct evidence is found, it provides a `让 AI 创建测试方案` action. In this alpha the action opens a Chinese test-plan draft; it does not silently write tests.

The `规格覆盖` panel checks whether the selected code maps to one or more function modules with corresponding `.distinction/specs/modules/<module-id>/SPEC.md` files. If specs are missing, `补规格草案` shows an "AI 正在补规格草案" progress notification, creates one or more module SPEC.md drafts, updates the registry, and automatically re-runs the current selection analysis so the Tips panel refreshes.

The `职责评估` panel is not a yes/no single-responsibility card. It lists every detected responsibility, explains why each responsibility was detected, shows evidence snippets, proposes a final owner, explains why the split matters, and provides a direct `让 AI 给职责拆分方案` action when the selected code appears overloaded or ambiguous.

The `完整调用图` section is a clickable SVG call graph, not a text list. The selected symbol is in the center, upstream callers/references are on the left, and downstream calls are on the right. Clicking a node jumps to the exact source location for that call or reference. It uses VS Code language features in this order:

1. Call Hierarchy, when the active language service supports it.
2. References, when Call Hierarchy is unavailable.
3. Simple text search as a last fallback.

For the best result in the sample workspace, select the `sendDirectMessage` method name or the whole method body in `src/application/message_service.ts` or `src/application/send_direct_message_workflow.ts`. The sample workspace includes its own `tsconfig.json` so VS Code's TypeScript language service can build the call hierarchy.

`Explain Selected Code` remains available as a manual command fallback.

Each negative finding has a `让 AI 给优化方案` button. In this alpha, the button creates a Chinese correction-plan draft and asks for human confirmation before any code change. It does not auto-edit files.

## Local Knowledge

The initialize command creates:

```text
.distinction/
├─ config.json
├─ correction-memory.md
├─ construction-rules.md
├─ coupling-risks.json
├─ session-log.md
├─ specs/
│  ├─ manifest.json
│  ├─ modules/
│  │  └─ <module-id>/
│  │     └─ SPEC.md
│  └─ function-modules.md
└─ reports/
   └─ latest-selection-insight.md
```

Use `Distinction Architecture: Open Local Knowledge Folder` to reveal this folder.

Use `Distinction Architecture: Open Latest Report` to reopen the most recent report.

## Package VSIX

From the repository root:

```bash
npm run package -w vscode-extension
```

The VSIX is written under `vscode-extension/`, for example:

```text
vscode-extension/explicit-architecture-vscode-0.1.0.vsix
```

The extension is bundled for packaging so the VSIX does not include the whole monorepo.

## Install VSIX Locally

In VS Code:

1. Open the Extensions view.
2. Choose `Install from VSIX...`.
3. Select the generated `.vsix` file from `vscode-extension/`.

Or from a terminal with the VS Code CLI available:

```bash
code --install-extension vscode-extension/explicit-architecture-vscode-0.1.0.vsix
```

## Error Handling

The alpha shows explicit messages for these cases:

- no workspace is open
- no workspace file is active
- no code is selected
- the active file is outside the current workspace
- `.distinction/` cannot be initialized
- analysis fails
- report writing or opening fails
