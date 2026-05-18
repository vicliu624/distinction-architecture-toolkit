import * as vscode from "vscode";
import { analyzeSelection, initLocalKnowledge, writeLatestSelectionInsight } from "@explicit-architecture/analyzer";
import { renderMarkdown } from "@explicit-architecture/report-model";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("distinctionArchitecture.initializeLocalKnowledge", initializeLocalKnowledge),
    vscode.commands.registerCommand("distinctionArchitecture.explainSelectedCode", explainSelectedCode),
    vscode.commands.registerCommand("explicitArchitecture.explainSelectedCode", explainSelectedCode)
  );
}

export function deactivate(): void {}

async function initializeLocalKnowledge(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    void vscode.window.showWarningMessage("Open a workspace before initializing local knowledge.");
    return;
  }

  const result = await initLocalKnowledge(workspaceRoot);
  void vscode.window.showInformationMessage(`Initialized local knowledge at ${result.root}.`);
}

async function explainSelectedCode(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const workspaceRoot = getWorkspaceRoot();
  if (!editor || !workspaceRoot) {
    void vscode.window.showWarningMessage("Open a workspace file and select code first.");
    return;
  }

  await initLocalKnowledge(workspaceRoot);
  const selectionText = editor.document.getText(editor.selection);
  const report = await analyzeSelection({
    workspaceRoot,
    filePath: editor.document.uri.fsPath,
    fileContent: editor.document.getText(),
    selectionText: selectionText.trim() ? selectionText : undefined
  });
  const markdown = renderMarkdown(report);
  const reportPath = await writeLatestSelectionInsight(workspaceRoot, markdown);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(reportPath));
  await vscode.window.showTextDocument(document, { preview: false });
}

function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders?.[0]?.uri.fsPath;
}
