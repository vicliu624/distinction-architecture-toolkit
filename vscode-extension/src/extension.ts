import * as vscode from "vscode";
import { classifyResponsibilities, detectResponsibilityOverload, detectLegacyLikeSurfaces } from "@explicit-architecture/analyzer";
import { renderSurfaceInventoryMarkdown } from "@explicit-architecture/report-model";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("explicitArchitecture.explainSelectedCode", explainSelectedCode),
    vscode.commands.registerCommand("explicitArchitecture.findResponsibilityOverload", findResponsibilityOverload),
    vscode.commands.registerCommand("explicitArchitecture.generateSurfaceInventory", generateSurfaceInventory)
  );
}

export function deactivate(): void {}

async function explainSelectedCode(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Open a file and select code first.");
    return;
  }

  const text = editor.document.getText(editor.selection) || editor.document.getText();
  const responsibilities = classifyResponsibilities(text);

  const content = [
    "# Architecture Role",
    "",
    ...responsibilities.map((item) => `- **${item.kind}**: ${item.description} (${item.confidence})`)
  ].join("\n");

  await showMarkdown("Explicit Architecture: Selected Code", content);
}

async function findResponsibilityOverload(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Open a file first.");
    return;
  }

  const violations = detectResponsibilityOverload({
    file: editor.document.uri.fsPath,
    content: editor.document.getText()
  });

  const content = violations.length === 0
    ? "# Responsibility Overload\n\nNo obvious overload markers found."
    : ["# Responsibility Overload", "", ...violations.map((v) => `- **${v.severity}** ${v.message}\n  - ${v.suggestedAction}`)].join("\n");

  await showMarkdown("Explicit Architecture: Responsibility Overload", content);
}

async function generateSurfaceInventory(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Open a file first.");
    return;
  }

  const surfaces = detectLegacyLikeSurfaces([{
    path: editor.document.uri.fsPath,
    content: editor.document.getText()
  }]);

  const content = renderSurfaceInventoryMarkdown({
    title: "Legacy / Compatibility / Temporary Surface Inventory",
    generatedAt: new Date().toISOString(),
    surfaces
  });

  await showMarkdown("Explicit Architecture: Surface Inventory", content);
}

async function showMarkdown(title: string, content: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    language: "markdown",
    content
  });
  await vscode.window.showTextDocument(doc, { preview: false });
}
