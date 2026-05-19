# Distinction Architecture Sample Project

This intentionally layered sample project gives the VS Code extension an obvious responsibility-overload target and enough files to show a clickable call graph.

Open `src/application/message_service.ts`, select the `MessageService` class, and run:

- `Distinction Architecture: Initialize Local Knowledge`
- `Distinction Architecture: Explain Selected Code`

The selected code sits above a workflow that touches application orchestration, SQLite persistence, protocol encoding, SX1262 hardware access, UI state mutation, CLI entrypoints, UI entrypoints, and a smoke test.

Good selections to try:

- `MessageService`
- `sendDirectMessage`
- `DirectMessageWorkflow`

The Tips panel should show coupling risks plus a clickable SVG call graph with upstream callers/references on the left and downstream calls on the right. Click any node in `完整调用图` to jump to the exact source location for that call or reference.
