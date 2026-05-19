import * as vscode from "vscode";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import type { ArchitectureInsightReport, CouplingRisk, Responsibility } from "@explicit-architecture/core";
import { analyzeSelection, initLocalKnowledge, writeLatestSelectionInsight } from "@explicit-architecture/analyzer";
import { renderMarkdown } from "@explicit-architecture/report-model";

const SAMPLE_RELATIVE_PATH = "src/application/message_service.ts";
const ONBOARDING_SHOWN_KEY = "distinctionArchitecture.sampleOnboardingShown";
const MAX_CALL_TREE_DEPTH = 6;
const MAX_CALL_TREE_NODES = 80;

const latestReports = new Map<string, ArchitectureInsightReport>();
const latestInsights = new Map<string, LatestInsight>();
let tipsPanel: vscode.WebviewPanel | undefined;
let tipsPanelMessageSubscription: vscode.Disposable | undefined;
let selectionTimer: NodeJS.Timeout | undefined;
let lastSelectionKey = "";

interface LatestInsight {
  report: ArchitectureInsightReport;
  projectContext: ProjectInsightContext;
  filePath: string;
  selectionText: string;
  selection: vscode.Selection;
}

interface ProjectInsightContext {
  workspaceRoot: string;
  selectedSymbol?: string;
  functionModuleSpecPath: string;
  functionModules: FunctionModuleSpec[];
  matchingModules: FunctionModuleSpec[];
  testCoverage: TestCoverage;
  specCoverage: SpecCoverage;
}

interface FunctionModuleSpec {
  id: string;
  title: string;
  tokens: string[];
  summary: string;
  files: string[];
  specPath: string;
  specExists: boolean;
  indexLine: number;
  confidence: "low" | "medium" | "high";
  reason: string;
}

interface TestCoverage {
  covered: boolean;
  summary: string;
  matchingFiles: Array<{ filePath: string; line: number; reason: string }>;
  candidateTestPath: string;
  canCreateActiveTest: boolean;
}

interface SpecCoverage {
  covered: boolean;
  summary: string;
  matchingModules: FunctionModuleSpec[];
  missingModules: FunctionModuleSpec[];
  candidateSpecPath: string;
}

interface ImpactTreeNode {
  id: string;
  label: string;
  detail: string;
  filePath: string;
  line: number;
  character: number;
  children: ImpactTreeNode[];
}

interface ImpactTree {
  root: ImpactTreeNode;
  incoming: ImpactTreeNode[];
  outgoing: ImpactTreeNode[];
  provider: "call-hierarchy" | "references" | "none";
  truncated: boolean;
  note: string;
}

interface GraphNode {
  node: ImpactTreeNode;
  x: number;
  y: number;
  side: "incoming" | "root" | "outgoing";
}

interface GraphEdge {
  from: GraphNode;
  to: GraphNode;
}

interface GraphLayout {
  width: number;
  height: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  incomingCount: number;
  outgoingCount: number;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("distinctionArchitecture.initializeLocalKnowledge", initializeLocalKnowledge),
    vscode.commands.registerCommand("distinctionArchitecture.explainSelectedCode", explainSelectedCode),
    vscode.commands.registerCommand("distinctionArchitecture.openLatestReport", openLatestReport),
    vscode.commands.registerCommand("distinctionArchitecture.openLocalKnowledgeFolder", openLocalKnowledgeFolder),
    vscode.commands.registerCommand("distinctionArchitecture.openSampleTarget", () => openSampleTarget({ showMessage: true })),
    vscode.commands.registerCommand("distinctionArchitecture.saveLatestInsightReport", saveLatestInsightReport),
    vscode.commands.registerCommand("distinctionArchitecture.showCorrectionPlan", showCorrectionPlan),
    vscode.commands.registerCommand("distinctionArchitecture.showCreateTestPlan", showCreateTestPlan),
    vscode.commands.registerCommand("distinctionArchitecture.createMissingSpec", createMissingSpec),
    vscode.commands.registerCommand("explicitArchitecture.explainSelectedCode", explainSelectedCode),
    vscode.window.onDidChangeTextEditorSelection((event) => scheduleSelectionInsight(event.textEditor)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) scheduleSelectionInsight(editor);
    })
  );

  void maybeShowSampleOnboarding(context);
}

export function deactivate(): void {}

async function initializeLocalKnowledge(): Promise<void> {
  const workspaceRoot = getWorkspaceRootForActiveContext();
  if (!workspaceRoot.ok) {
    showWorkspaceError(workspaceRoot.reason);
    return;
  }

  try {
    const result = await initLocalKnowledge(workspaceRoot.root);
    void vscode.window.showInformationMessage(`已初始化本地知识库：${result.root}`);
  } catch (error) {
    void vscode.window.showErrorMessage(`初始化 .distinction/ 失败：${formatError(error)}`);
  }
}

async function explainSelectedCode(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("请先打开一个工作区文件。");
    return;
  }

  const workspaceRoot = getWorkspaceRootForDocument(editor.document);
  if (!workspaceRoot.ok) {
    showWorkspaceError(workspaceRoot.reason);
    return;
  }

  const selectionText = editor.document.getText(editor.selection);
  if (!selectionText.trim()) {
    const action = "选择示例目标";
    const chosen = await vscode.window.showWarningMessage("请先选择一段代码，再生成架构洞察。", action);
    if (chosen === action) await openSampleTarget({ showMessage: true });
    return;
  }

  await analyzeEditorSelection(editor, workspaceRoot.root, selectionText, editor.selection, "分析选中代码失败");
}

async function openSampleTarget(options: { showMessage: boolean }): Promise<void> {
  const folder = findSampleWorkspaceFolder();
  if (!folder) {
    void vscode.window.showWarningMessage("请先打开 examples/sample-project，再使用示例目标。");
    return;
  }

  const uri = vscode.Uri.joinPath(folder.uri, ...SAMPLE_RELATIVE_PATH.split("/"));
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    const selection = findMethodSelection(document, "sendDirectMessage") ?? findClassSelection(document, "MessageService") ?? fullDocumentSelection(document);
    editor.selection = selection;
    editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);

    if (options.showMessage) {
      void vscode.window.showInformationMessage("已选中示例目标。稍等片刻会自动生成架构洞察 Tips。");
    }
  } catch (error) {
    void vscode.window.showErrorMessage(`打开示例目标失败：${formatError(error)}`);
  }
}

async function maybeShowSampleOnboarding(context: vscode.ExtensionContext): Promise<void> {
  if (!findSampleWorkspaceFolder()) return;

  await openSampleTarget({ showMessage: false });

  if (context.workspaceState.get<boolean>(ONBOARDING_SHOWN_KEY)) return;
  await context.workspaceState.update(ONBOARDING_SHOWN_KEY, true);

  const run = "生成洞察";
  const chosen = await vscode.window.showInformationMessage(
    "Distinction Architecture 示例已准备好。已选中 sendDirectMessage，要生成架构洞察 Tips 吗？",
    run,
    "稍后"
  );
  if (chosen === run) {
    await vscode.commands.executeCommand("distinctionArchitecture.explainSelectedCode");
  }
}

async function openLatestReport(): Promise<void> {
  const workspaceRoot = getWorkspaceRootForActiveContext();
  if (!workspaceRoot.ok) {
    showWorkspaceError(workspaceRoot.reason);
    return;
  }

  const reportUri = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot.root), ".distinction", "reports", "latest-selection-insight.md");
  try {
    const document = await vscode.workspace.openTextDocument(reportUri);
    await vscode.window.showTextDocument(document, { preview: false });
  } catch (error) {
    void vscode.window.showErrorMessage(`还没有最新报告。请先生成并保存一次洞察。${formatError(error)}`);
  }
}

async function saveLatestInsightReport(workspaceRoot?: string): Promise<void> {
  const root = workspaceRoot ?? getWorkspaceRootForActiveContext();
  const resolvedRoot = typeof root === "string" ? { ok: true as const, root } : root;
  if (!resolvedRoot.ok) {
    showWorkspaceError(resolvedRoot.reason);
    return;
  }

  const report = latestReports.get(resolvedRoot.root);
  if (!report) {
    void vscode.window.showWarningMessage("还没有可保存的洞察。请先选择代码生成 Tips。");
    return;
  }

  try {
    await initLocalKnowledge(resolvedRoot.root);
    const reportPath = await writeLatestSelectionInsight(resolvedRoot.root, renderMarkdown(report));
    const open = "打开报告";
    const chosen = await vscode.window.showInformationMessage(`已保存中文报告：${reportPath}`, open);
    if (chosen === open) {
      const document = await vscode.workspace.openTextDocument(vscode.Uri.file(reportPath));
      await vscode.window.showTextDocument(document, { preview: false });
    }
  } catch (error) {
    void vscode.window.showErrorMessage(`保存中文报告失败：${formatError(error)}`);
  }
}

async function showCorrectionPlan(input?: { workspaceRoot: string; riskType: string }): Promise<void> {
  const root = input?.workspaceRoot ?? getWorkspaceRootForActiveContext();
  const resolvedRoot = typeof root === "string" ? { ok: true as const, root } : root;
  if (!resolvedRoot.ok) {
    showWorkspaceError(resolvedRoot.reason);
    return;
  }

  const report = latestReports.get(resolvedRoot.root);
  if (!report) {
    void vscode.window.showWarningMessage("还没有可用洞察。请先选择代码生成 Tips。");
    return;
  }

  const risk = input?.riskType
    ? report.unreasonableCouplingPoints.find((item) => item.type === input.riskType)
    : report.unreasonableCouplingPoints[0];

  const document = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: correctionPlanMarkdown(report, risk)
  });
  await vscode.window.showTextDocument(document, { preview: false });

  const save = "保存当前洞察";
  const chosen = await vscode.window.showInformationMessage(
    "已生成中文优化方案草稿。当前 Alpha 尚未接入自动执行通道，请人工确认后再决定是否让 AI 改代码。",
    save,
    "先查看方案"
  );
  if (chosen === save) await saveLatestInsightReport(resolvedRoot.root);
}

async function showCreateTestPlan(workspaceRoot?: string): Promise<void> {
  const root = workspaceRoot ?? getWorkspaceRootForActiveContext();
  const resolvedRoot = typeof root === "string" ? { ok: true as const, root } : root;
  if (!resolvedRoot.ok) {
    showWorkspaceError(resolvedRoot.reason);
    return;
  }

  const insight = latestInsights.get(resolvedRoot.root);
  if (!insight) {
    void vscode.window.showWarningMessage("还没有可用洞察。请先选择代码生成 Tips。");
    return;
  }

  const document = await vscode.workspace.openTextDocument({
    language: "markdown",
    content: createTestPlanMarkdown(insight)
  });
  await vscode.window.showTextDocument(document, { preview: false });
  void vscode.window.showInformationMessage("已生成中文测试创建方案草稿。当前 Alpha 只生成方案，不直接写测试文件。");
}

async function createMissingSpec(workspaceRoot?: string): Promise<void> {
  const root = workspaceRoot ?? getWorkspaceRootForActiveContext();
  const resolvedRoot = typeof root === "string" ? { ok: true as const, root } : root;
  if (!resolvedRoot.ok) {
    showWorkspaceError(resolvedRoot.reason);
    return;
  }

  const insight = latestInsights.get(resolvedRoot.root);
  if (!insight) {
    void vscode.window.showWarningMessage("还没有可用洞察。请先选择代码生成 Tips。");
    return;
  }

  const targets = specGenerationTargets(insight);

  try {
    const written = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "AI 正在补规格草案",
        cancellable: false
      },
      async (progress) => {
        const created: string[] = [];
        for (const [index, target] of targets.entries()) {
          progress.report({
            message: `生成 ${target.title}`,
            increment: targets.length > 0 ? 80 / targets.length : 80
          });
          await mkdir(dirname(target.specPath), { recursive: true });
          const content = functionModuleSpecTemplate(insight, target);
          await writeFile(target.specPath, content, { flag: "wx" }).then(
            () => created.push(target.specPath),
            (error: unknown) => {
              if (isAlreadyExistsError(error)) return;
              throw error;
            }
          );
          await wait(index === targets.length - 1 ? 0 : 120);
        }
        progress.report({ message: "更新模块索引并重新评估", increment: 20 });
        await refreshInsightAfterSpecGeneration(resolvedRoot.root, insight);
        return created;
      }
    );

    const summaryPath = await writeSpecGenerationSummary(resolvedRoot.root, insight, targets, written);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(summaryPath));
    await vscode.window.showTextDocument(document, { preview: false });
    void vscode.window.showInformationMessage(`已补充 ${written.length} 份规格草案，并已重新评估当前选区。`);
  } catch (error) {
    void vscode.window.showErrorMessage(`补规格草案失败：${formatError(error)}`);
  }
}

async function openLocalKnowledgeFolder(): Promise<void> {
  const workspaceRoot = getWorkspaceRootForActiveContext();
  if (!workspaceRoot.ok) {
    showWorkspaceError(workspaceRoot.reason);
    return;
  }

  try {
    await initLocalKnowledge(workspaceRoot.root);
    const uri = vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot.root), ".distinction");
    await vscode.commands.executeCommand("revealFileInOS", uri);
  } catch (error) {
    void vscode.window.showErrorMessage(`打开 .distinction/ 失败：${formatError(error)}`);
  }
}

async function openSourceLocation(filePath: string, line: number, character: number): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    const position = new vscode.Position(line, character);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  } catch (error) {
    void vscode.window.showErrorMessage(`无法跳转到调用位置：${formatError(error)}`);
  }
}

type WorkspaceRootResult =
  | { ok: true; root: string }
  | { ok: false; reason: "no-workspace" | "no-file" | "outside-workspace" };

type WorkspaceErrorReason = Extract<WorkspaceRootResult, { ok: false }>["reason"];

function getWorkspaceRootForActiveContext(): WorkspaceRootResult {
  const editor = vscode.window.activeTextEditor;
  if (editor) return getWorkspaceRootForDocument(editor.document);

  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return { ok: false, reason: "no-workspace" };
  return { ok: true, root: folder.uri.fsPath };
}

function getWorkspaceRootForDocument(document: vscode.TextDocument): WorkspaceRootResult {
  if (document.uri.scheme !== "file") return { ok: false, reason: "no-file" };

  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!folder) {
    return vscode.workspace.workspaceFolders?.length
      ? { ok: false, reason: "outside-workspace" }
      : { ok: false, reason: "no-workspace" };
  }

  return { ok: true, root: folder.uri.fsPath };
}

function showWorkspaceError(reason: WorkspaceErrorReason): void {
  const messageByReason = {
    "no-workspace": "请先打开一个工作区，再运行 Distinction Architecture 命令。",
    "no-file": "请先打开工作区内的文件，再运行这个 Distinction Architecture 命令。",
    "outside-workspace": "当前文件不在工作区内。请打开工作区内的文件后再试。"
  };
  void vscode.window.showWarningMessage(messageByReason[reason]);
}

function scheduleSelectionInsight(editor: vscode.TextEditor): void {
  if (selectionTimer) clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    void showInsightForEditorSelection(editor);
  }, 450);
}

async function showInsightForEditorSelection(editor: vscode.TextEditor): Promise<void> {
  if (!editor.selection || editor.selection.isEmpty) return;
  const workspaceRoot = getWorkspaceRootForDocument(editor.document);
  if (!workspaceRoot.ok) return;

  const selectionText = editor.document.getText(editor.selection);
  if (!selectionText.trim()) return;

  const key = [
    workspaceRoot.root,
    editor.document.uri.fsPath,
    editor.selection.start.line,
    editor.selection.start.character,
    editor.selection.end.line,
    editor.selection.end.character,
    selectionText.length
  ].join(":");
  if (key === lastSelectionKey) return;
  lastSelectionKey = key;

  await analyzeEditorSelection(editor, workspaceRoot.root, selectionText, editor.selection, "自动分析选区失败");
}

async function analyzeEditorSelection(
  editor: vscode.TextEditor,
  workspaceRoot: string,
  selectionText: string,
  selection: vscode.Selection,
  errorPrefix: string
): Promise<void> {
  try {
    await initLocalKnowledge(workspaceRoot);
    const [report, impactTree, projectContext] = await Promise.all([
      analyzeSelection({
        workspaceRoot,
        filePath: editor.document.uri.fsPath,
        fileContent: editor.document.getText(),
        selectionText
      }),
      collectImpactTreeWithRetry(editor, selection),
      collectProjectInsightContext(workspaceRoot, editor.document.uri.fsPath, selectionText)
    ]);
    latestReports.set(workspaceRoot, report);
    latestInsights.set(workspaceRoot, {
      report,
      projectContext,
      filePath: editor.document.uri.fsPath,
      selectionText,
      selection
    });
    showInsightTipsPanel(report, workspaceRoot, impactTree, projectContext);
  } catch (error) {
    void vscode.window.showErrorMessage(`${errorPrefix}：${formatError(error)}`);
  }
}

async function collectProjectInsightContext(workspaceRoot: string, selectedFilePath: string, selectionText: string): Promise<ProjectInsightContext> {
  await initLocalKnowledge(workspaceRoot);
  const selectedSymbol = inferSelectedSymbol(selectionText);
  const modules = await discoverFunctionModules(workspaceRoot);
  const matchingModules = matchFunctionModules(modules, selectedFilePath, selectionText, selectedSymbol);
  const testCoverage = await collectTestCoverage(workspaceRoot, selectedFilePath, selectedSymbol, selectionText);
  const specCoverage = collectSpecCoverage(workspaceRoot, matchingModules, selectedSymbol);
  const functionModuleSpecPath = join(workspaceRoot, ".distinction", "specs", "function-modules.md");
  await writeFunctionModulesIndex(functionModuleSpecPath, modules);

  return {
    workspaceRoot,
    selectedSymbol,
    functionModuleSpecPath,
    functionModules: modules,
    matchingModules,
    testCoverage,
    specCoverage
  };
}

async function discoverFunctionModules(workspaceRoot: string): Promise<FunctionModuleSpec[]> {
  const uris = await vscode.workspace.findFiles("**/*.{ts,tsx,js,jsx}", "**/{node_modules,dist,out,build,.git,.distinction}/**", 240);
  const groups = new Map<string, { files: Set<string>; tokens: Set<string>; symbols: Set<string>; reasons: Set<string> }>();

  for (const uri of uris.filter((item) => item.fsPath.startsWith(workspaceRoot))) {
    const filePath = uri.fsPath;
    const rel = normalizePath(relative(workspaceRoot, filePath));
    const content = await readFile(filePath, "utf8").catch(() => "");
    const key = moduleKeyFromPath(rel);
    const entry = groups.get(key) ?? { files: new Set<string>(), tokens: new Set<string>(), symbols: new Set<string>(), reasons: new Set<string>() };
    entry.files.add(filePath);
    for (const token of tokensFromPath(rel)) entry.tokens.add(token);
    for (const symbol of symbolsFromText(content)) {
      entry.symbols.add(symbol);
      for (const token of wordsFromIdentifier(symbol)) entry.tokens.add(token);
    }
    entry.reasons.add(`路径 ${rel}`);
    groups.set(key, entry);
  }

  const specsRoot = join(workspaceRoot, ".distinction", "specs", "modules");
  let line = 9;
  return Array.from(groups.entries())
    .map(([id, entry]) => {
      const title = titleFromModuleId(id);
      const specPath = join(specsRoot, id, "SPEC.md");
      const specExists = fileExistsSyncLike(specPath);
      const files = Array.from(entry.files).sort();
      const tokens = unique([...Array.from(entry.tokens), ...Array.from(entry.symbols).flatMap(wordsFromIdentifier)]).slice(0, 24);
      const module: FunctionModuleSpec = {
        id,
        title,
        tokens,
        summary: summaryForModule(id, files),
        files,
        specPath,
        specExists,
        indexLine: line,
        confidence: files.length > 1 ? "high" : "medium",
        reason: Array.from(entry.reasons).slice(0, 3).join("；")
      };
      line += 7 + Math.min(files.length, 6);
      return module;
    })
    .filter((module) => module.files.length > 0)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function matchFunctionModules(
  modules: FunctionModuleSpec[],
  selectedFilePath: string,
  selectionText: string,
  selectedSymbol?: string
): FunctionModuleSpec[] {
  const selectionTokens = new Set([
    ...tokensFromPath(selectedFilePath),
    ...wordsFromIdentifier(selectedSymbol ?? ""),
    ...symbolsFromText(selectionText).flatMap(wordsFromIdentifier)
  ].map((item) => item.toLowerCase()));

  return modules
    .map((module) => {
      let score = module.files.some((file) => file === selectedFilePath) ? 12 : 0;
      for (const token of module.tokens) if (selectionTokens.has(token.toLowerCase())) score += 2;
      if (selectionText.toLowerCase().includes(module.id.replace(/-/g, ""))) score += 3;
      return { module, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((item) => item.module);
}

async function collectTestCoverage(
  workspaceRoot: string,
  selectedFilePath: string,
  selectedSymbol: string | undefined,
  selectionText: string
): Promise<TestCoverage> {
  const symbol = selectedSymbol ?? inferSelectedSymbol(selectionText);
  const selectedBase = basename(selectedFilePath, extname(selectedFilePath));
  const testFiles = await vscode.workspace.findFiles("**/*.{test,spec}.{ts,tsx,js,jsx}", "**/{node_modules,dist,out,build,.git}/**", 180);
  const matches: TestCoverage["matchingFiles"] = [];

  for (const uri of testFiles.filter((item) => item.fsPath.startsWith(workspaceRoot))) {
    const content = await readFile(uri.fsPath, "utf8").catch(() => "");
    const rel = normalizePath(relative(workspaceRoot, uri.fsPath));
    const symbolIndex = symbol ? content.indexOf(symbol) : -1;
    const baseIndex = content.indexOf(selectedBase);
    if (symbolIndex >= 0 || baseIndex >= 0 || rel.includes(selectedBase)) {
      const offset = symbolIndex >= 0 ? symbolIndex : Math.max(baseIndex, 0);
      matches.push({
        filePath: uri.fsPath,
        line: lineNumberAt(content, offset),
        reason: symbolIndex >= 0 ? `测试中引用了 ${symbol}` : `测试文件与 ${selectedBase} 命名相关`
      });
    }
  }

  const candidateTestPath = join(dirname(selectedFilePath), `${selectedBase}.test.ts`);
  return {
    covered: matches.length > 0,
    summary: matches.length > 0
      ? `发现 ${matches.length} 个候选测试文件。`
      : "未发现直接覆盖当前选区的测试文件。",
    matchingFiles: matches.slice(0, 5),
    candidateTestPath,
    canCreateActiveTest: true
  };
}

function collectSpecCoverage(workspaceRoot: string, matchingModules: FunctionModuleSpec[], selectedSymbol?: string): SpecCoverage {
  const missingModules = matchingModules.filter((module) => !module.specExists);
  const fallbackName = slugify(selectedSymbol || matchingModules[0]?.id || "selected-code");
  const candidateSpecPath = missingModules[0]?.specPath ?? matchingModules[0]?.specPath ?? join(workspaceRoot, ".distinction", "specs", "modules", fallbackName, "SPEC.md");
  return {
    covered: matchingModules.length > 0 && missingModules.length === 0,
    summary: matchingModules.length === 0
      ? "尚未能把当前选区映射到明确功能模块规格。"
      : missingModules.length === 0
        ? "当前选区已映射到有规格文件的功能模块。"
        : `当前选区映射到 ${matchingModules.length} 个功能模块，其中 ${missingModules.length} 个缺少规格草案。`,
    matchingModules,
    missingModules,
    candidateSpecPath
  };
}

async function writeFunctionModulesIndex(indexPath: string, modules: FunctionModuleSpec[]): Promise<void> {
  await mkdir(dirname(indexPath), { recursive: true });
  const content = [
    "# 功能模块索引",
    "",
    "这个文件由 Distinction Architecture Alpha 根据工程路径、文件名和符号名生成。它是候选规格索引，不是最终产品事实。",
    "",
    "## 模块",
    "",
    ...modules.flatMap((module) => [
      `### ${module.title}`,
      "",
      `- ID: \`${module.id}\``,
      `- 状态: ${module.specExists ? "已有模块规格" : "缺少模块规格"}`,
      `- 规格: \`${normalizePath(relative(dirname(indexPath), module.specPath))}\``,
      `- 推断原因: ${module.reason}`,
      "- 关联文件:",
      ...module.files.slice(0, 8).map((file) => `  - \`${normalizePath(relative(dirname(indexPath), file))}\``),
      ""
    ])
  ].join("\n");
  await writeFile(indexPath, content, "utf8");
  await writeSpecManifest(join(dirname(indexPath), "manifest.json"), modules);
}

async function writeSpecManifest(manifestPath: string, modules: FunctionModuleSpec[]): Promise<void> {
  await mkdir(dirname(manifestPath), { recursive: true });
  const manifest = {
    version: 1,
    generated_at: new Date().toISOString(),
    note: "Candidate spec registry generated by Distinction Architecture Alpha. Module SPEC.md files are the spec body; function-modules.md is only an index.",
    modules: modules.map((module) => ({
      id: module.id,
      title: module.title,
      spec_path: normalizePath(relative(dirname(manifestPath), module.specPath)),
      status: module.specExists ? "present" : "missing",
      confidence: module.confidence,
      files: module.files.map((file) => normalizePath(file))
    }))
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function specGenerationTargets(insight: LatestInsight): FunctionModuleSpec[] {
  const { projectContext } = insight;
  const targets = projectContext.specCoverage.missingModules.length > 0
    ? projectContext.specCoverage.missingModules
    : projectContext.matchingModules.filter((module) => !module.specExists);
  if (targets.length > 0) return targets;

  const fallbackId = slugify(projectContext.selectedSymbol ?? insight.report.selectedTarget.targetName ?? "selected-code");
  return [{
    id: fallbackId,
    title: titleFromModuleId(fallbackId),
    tokens: wordsFromIdentifier(fallbackId),
    summary: "由当前选区生成的功能模块规格候选",
    files: [insight.report.selectedTarget.filePath],
    specPath: projectContext.specCoverage.candidateSpecPath,
    specExists: false,
    indexLine: 1,
    confidence: "low",
    reason: "当前选区尚未稳定映射到已有功能模块，使用选区名称生成候选规格。"
  }];
}

async function refreshInsightAfterSpecGeneration(workspaceRoot: string, insight: LatestInsight): Promise<void> {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(insight.filePath));
  const editor = await vscode.window.showTextDocument(document, { preview: false });
  editor.selection = insight.selection;
  editor.revealRange(insight.selection, vscode.TextEditorRevealType.InCenter);
  const selectionText = document.getText(insight.selection).trim() ? document.getText(insight.selection) : insight.selectionText;
  await analyzeEditorSelection(editor, workspaceRoot, selectionText, insight.selection, "补规格后重新评估失败");
}

async function writeSpecGenerationSummary(
  workspaceRoot: string,
  insight: LatestInsight,
  targets: FunctionModuleSpec[],
  written: string[]
): Promise<string> {
  const summaryPath = join(workspaceRoot, ".distinction", "specs", "latest-spec-generation.md");
  await mkdir(dirname(summaryPath), { recursive: true });
  const content = [
    "# 规格补充结果",
    "",
    `- 触发目标：${insight.report.selectedTarget.targetName ?? insight.projectContext.selectedSymbol ?? "当前选区"}`,
    `- 生成数量：${written.length}`,
    `- 候选模块数量：${targets.length}`,
    "",
    "## 已生成 / 已存在规格",
    "",
    ...targets.map((target) => `- ${target.title}: \`${normalizePath(relative(workspaceRoot, target.specPath))}\`${written.includes(target.specPath) ? "" : "（已存在，未覆盖）"}`),
    "",
    "## 后续动作",
    "",
    "- 已自动重新评估当前选区，Tips 中的规格覆盖状态应随之刷新。",
    "- 请人工确认每份 SPEC.md 的功能意图、行为规格和边界约束。",
    "- function-modules.md 只是索引；真实规格请维护在各模块目录的 SPEC.md 中。"
  ].join("\n");
  await writeFile(summaryPath, `${content}\n`, "utf8");
  return summaryPath;
}

async function collectImpactTree(editor: vscode.TextEditor, selection: vscode.Selection): Promise<ImpactTree> {
  const symbolPosition = await symbolPositionForSelection(editor.document, selection);
  const root = createRootImpactNode(editor.document, selection, symbolPosition);

  const prepared = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
    "vscode.prepareCallHierarchy",
    editor.document.uri,
    symbolPosition
  ).then((items) => items ?? [], () => []);

  const hierarchyItem = prepared[0];
  if (hierarchyItem) {
    const budget = { remaining: MAX_CALL_TREE_NODES, truncated: false };
    const incoming = await collectIncomingCalls(hierarchyItem, 0, new Set<string>(), budget);
    const outgoing = await collectOutgoingCalls(hierarchyItem, 0, new Set<string>(), budget);
    return {
      root,
      incoming,
      outgoing,
      provider: "call-hierarchy",
      truncated: budget.truncated,
      note: budget.truncated ? "调用图较大，已截断显示。" : "由 VS Code Call Hierarchy 提供。"
    };
  }

  const references = await collectReferenceNodes(editor.document, symbolPosition);
  if (references.length > 0) {
    return {
      root,
      incoming: references,
      outgoing: [],
      provider: "references",
      truncated: references.length >= MAX_CALL_TREE_NODES,
      note: "当前语言服务没有提供 Call Hierarchy，已退回到 References / 文本搜索。"
    };
  }

  return {
    root,
    incoming: [],
    outgoing: [],
    provider: "none",
    truncated: false,
    note: "当前语言服务没有返回调用层级或引用位置。"
  };
}

async function collectImpactTreeWithRetry(editor: vscode.TextEditor, selection: vscode.Selection): Promise<ImpactTree> {
  const first = await collectImpactTree(editor, selection);
  if (first.provider !== "none" || countTreeNodes(first.incoming) + countTreeNodes(first.outgoing) > 0) return first;

  await wait(550);
  const second = await collectImpactTree(editor, selection);
  if (second.provider === "none" && first.note) {
    return {
      ...second,
      note: `${second.note} 如果刚打开 Extension Development Host，请稍等 TypeScript 语言服务完成索引后重新选择一次。`
    };
  }
  return second;
}

async function collectIncomingCalls(
  item: vscode.CallHierarchyItem,
  depth: number,
  visited: Set<string>,
  budget: { remaining: number; truncated: boolean }
): Promise<ImpactTreeNode[]> {
  if (depth >= MAX_CALL_TREE_DEPTH || budget.remaining <= 0) {
    budget.truncated = true;
    return [];
  }

  const calls = await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
    "vscode.provideIncomingCalls",
    item
  ).then((result) => result ?? [], () => []);

  const nodes: ImpactTreeNode[] = [];
  for (const call of calls) {
    if (budget.remaining <= 0) {
      budget.truncated = true;
      break;
    }

    const node = callHierarchyNode(call.from, call.fromRanges[0] ?? call.from.selectionRange);
    const key = nodeKey(node);
    if (visited.has(key)) continue;
    visited.add(key);
    budget.remaining -= 1;
    node.children = await collectIncomingCalls(call.from, depth + 1, visited, budget);
    nodes.push(node);
  }
  return nodes;
}

async function collectOutgoingCalls(
  item: vscode.CallHierarchyItem,
  depth: number,
  visited: Set<string>,
  budget: { remaining: number; truncated: boolean }
): Promise<ImpactTreeNode[]> {
  if (depth >= MAX_CALL_TREE_DEPTH || budget.remaining <= 0) {
    budget.truncated = true;
    return [];
  }

  const calls = await vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
    "vscode.provideOutgoingCalls",
    item
  ).then((result) => result ?? [], () => []);

  const nodes: ImpactTreeNode[] = [];
  for (const call of calls) {
    if (budget.remaining <= 0) {
      budget.truncated = true;
      break;
    }

    const node = outgoingCallNode(item, call);
    const key = nodeKey(node);
    if (visited.has(key)) continue;
    visited.add(key);
    budget.remaining -= 1;
    node.children = await collectOutgoingCalls(call.to, depth + 1, visited, budget);
    nodes.push(node);
  }
  return nodes;
}

async function collectReferenceNodes(document: vscode.TextDocument, position: vscode.Position): Promise<ImpactTreeNode[]> {
  const references = await vscode.commands.executeCommand<vscode.Location[]>(
    "vscode.executeReferenceProvider",
    document.uri,
    position
  ).then((result) => result ?? [], () => []);

  const nodes = references
    .filter((location) => location.uri.scheme === "file")
    .slice(0, MAX_CALL_TREE_NODES)
    .map((location, index) => locationNode(`reference:${index}`, location.uri, location.range.start, "引用位置"));

  if (nodes.length > 0) return nodes;

  const symbol = wordAt(document, position);
  return symbol ? textSearchReferenceNodes(symbol) : [];
}

async function textSearchReferenceNodes(symbol: string): Promise<ImpactTreeNode[]> {
  const nodes: ImpactTreeNode[] = [];
  const files = await vscode.workspace.findFiles("**/*.{ts,tsx,js,jsx}", "**/{node_modules,dist,out}/**", MAX_CALL_TREE_NODES);
  for (const file of files) {
    if (nodes.length >= MAX_CALL_TREE_NODES) break;
    const document = await vscode.workspace.openTextDocument(file);
    const text = document.getText();
    const index = text.indexOf(symbol);
    if (index === -1) continue;
    nodes.push(locationNode(`text:${nodes.length}`, file, document.positionAt(index), "文本命中"));
  }
  return nodes;
}

function showInsightTipsPanel(report: ArchitectureInsightReport, workspaceRoot: string, impactTree: ImpactTree, projectContext: ProjectInsightContext): void {
  const panel = tipsPanel ?? vscode.window.createWebviewPanel(
    "distinctionArchitecture.insightTips",
    "架构洞察 Tips",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );
  tipsPanel = panel;
  tipsPanel.onDidDispose(() => {
    if (tipsPanel === panel) tipsPanel = undefined;
    tipsPanelMessageSubscription?.dispose();
    tipsPanelMessageSubscription = undefined;
  });

  panel.webview.html = renderInsightTipsHtml(report, impactTree, projectContext);
  tipsPanelMessageSubscription?.dispose();
  tipsPanelMessageSubscription = panel.webview.onDidReceiveMessage((message: { command?: string; riskType?: string; filePath?: string; line?: number; character?: number }) => {
    if (message.command === "saveReport") void saveLatestInsightReport(workspaceRoot);
    if (message.command === "correctionPlan") void showCorrectionPlan({ workspaceRoot, riskType: message.riskType ?? "" });
    if (message.command === "createTestPlan") void showCreateTestPlan(workspaceRoot);
    if (message.command === "createSpec") void createMissingSpec(workspaceRoot);
    if (message.command === "openKnowledge") void openLocalKnowledgeFolder();
    if (message.command === "openLocation" && message.filePath) void openSourceLocation(message.filePath, message.line ?? 0, message.character ?? 0);
  });
}

function renderInsightTipsHtml(report: ArchitectureInsightReport, impactTree: ImpactTree, projectContext: ProjectInsightContext): string {
  const nonce = createNonce();
  const risks = report.unreasonableCouplingPoints;
  const riskLevel = riskLevelText(report);
  const qualityScore = qualityScoreFor(report);
  const impactTrees = impactTreeSummary(impactTree);
  const featureModules = featureModulesSummaryText(projectContext);
  const testCoverage = testCoverageCard(projectContext.testCoverage);
  const specCoverage = specCoverageCard(projectContext.specCoverage);
  const duplicateStatus = duplicateStatusText();
  const target = escapeHtml(report.selectedTarget.targetName ?? "代码选区");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>架构洞察 Tips</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --button: var(--vscode-button-background);
      --button-fg: var(--vscode-button-foreground);
      --button-hover: var(--vscode-button-hoverBackground);
    }
    body {
      margin: 0;
      padding: 18px;
      background: var(--bg);
      color: var(--fg);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.45;
    }
    .shell { max-width: 1180px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
    h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
    .subtitle { color: var(--muted); font-size: 12px; }
    .badge {
      padding: 5px 9px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      background: ${riskBadgeColor(report)};
      color: #fff;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; margin: 12px 0; }
    .card { border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: rgba(127, 127, 127, 0.06); }
    .card h2 { margin: 0 0 8px; font-size: 13px; letter-spacing: 0; }
    .card p { margin: 0; color: var(--fg); }
    .blue { background: rgba(49, 130, 206, 0.16); border-color: rgba(49, 130, 206, 0.45); }
    .green { background: rgba(47, 133, 90, 0.16); border-color: rgba(47, 133, 90, 0.45); }
    .amber { background: rgba(214, 158, 46, 0.18); border-color: rgba(214, 158, 46, 0.5); }
    .red { background: rgba(197, 48, 48, 0.17); border-color: rgba(197, 48, 48, 0.52); }
    .purple { background: rgba(128, 90, 213, 0.15); border-color: rgba(128, 90, 213, 0.45); }
    .section-title { margin: 18px 0 8px; font-size: 15px; font-weight: 700; }
    .panel { border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin: 10px 0; background: rgba(127, 127, 127, 0.06); }
    .panel-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    .panel-head h2 { margin: 0 0 5px; font-size: 16px; }
    .panel-summary { color: var(--muted); margin: 0; }
    .responsibility-panel { background: rgba(214, 158, 46, 0.12); border-color: rgba(214, 158, 46, 0.44); }
    .module-panel { background: rgba(49, 130, 206, 0.11); border-color: rgba(49, 130, 206, 0.42); }
    .coverage-panel { background: rgba(47, 133, 90, 0.1); border-color: rgba(47, 133, 90, 0.38); }
    .spec-panel { background: rgba(128, 90, 213, 0.1); border-color: rgba(128, 90, 213, 0.38); }
    .responsibility-list { display: grid; gap: 10px; }
    .responsibility-item { border: 1px solid rgba(214, 158, 46, 0.38); border-radius: 8px; padding: 11px; background: rgba(214, 158, 46, 0.08); }
    .module-list { display: grid; gap: 9px; }
    .module-item { border: 1px solid var(--border); border-radius: 8px; padding: 10px; background: rgba(127, 127, 127, 0.07); }
    .module-title { display: flex; justify-content: space-between; gap: 10px; align-items: center; font-weight: 700; }
    .module-title button { padding: 5px 8px; }
    .module-meta { color: var(--muted); font-size: 12px; margin-top: 5px; }
    .module-files { margin-top: 6px; color: var(--muted); font-size: 12px; }
    .coverage-list { display: grid; gap: 7px; margin-top: 10px; }
    .coverage-hit { border: 1px solid var(--border); border-radius: 6px; padding: 8px; background: rgba(127, 127, 127, 0.07); }
    .responsibility-top { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 8px; }
    .responsibility-name { font-weight: 700; font-size: 13px; }
    .responsibility-index { display: inline-flex; width: 20px; height: 20px; align-items: center; justify-content: center; margin-right: 6px; border-radius: 50%; background: rgba(214, 158, 46, 0.32); }
    .responsibility-confidence { color: var(--muted); font-size: 12px; white-space: nowrap; }
    .responsibility-body { display: grid; gap: 6px; }
    .responsibility-line strong { color: var(--fg); }
    .evidence-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
    .evidence-chip { border: 1px solid var(--border); border-radius: 999px; padding: 3px 7px; color: var(--muted); background: rgba(127, 127, 127, 0.08); font-size: 11px; }
    .risk { display: grid; gap: 8px; border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin: 8px 0; background: rgba(197, 48, 48, 0.12); }
    .risk-title { font-weight: 700; }
    .risk-meta, .muted { color: var(--muted); font-size: 12px; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    button { border: 0; border-radius: 6px; padding: 7px 10px; background: var(--button); color: var(--button-fg); cursor: pointer; font: inherit; font-size: 12px; }
    button:hover { background: var(--button-hover); }
    .secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .call-tree { border: 1px solid var(--border); border-radius: 8px; background: rgba(49, 130, 206, 0.08); overflow: auto; padding: 10px; }
    .graph-caption { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 8px; color: var(--muted); font-size: 12px; }
    .legend { display: inline-flex; align-items: center; gap: 5px; }
    .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .call-graph { min-width: 760px; width: 100%; height: auto; }
    .graph-edge { fill: none; stroke: var(--vscode-descriptionForeground); stroke-width: 1.4; opacity: 0.78; }
    .graph-node { cursor: pointer; outline: none; }
    .graph-node rect { stroke-width: 1.2; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.18)); }
    .graph-node:hover rect, .graph-node:focus rect { stroke: var(--vscode-focusBorder); stroke-width: 2; }
    .graph-label { fill: var(--fg); font-size: 12px; font-weight: 700; pointer-events: none; }
    .graph-detail { fill: var(--muted); font-size: 10px; pointer-events: none; }
  </style>
</head>
<body>
  <main class="shell">
    <div class="header">
      <div>
        <h1>架构洞察 Tips：${target}</h1>
        <div class="subtitle">${escapeHtml(report.selectedTarget.filePath)}</div>
      </div>
      <div class="badge">${escapeHtml(riskLevel)}</div>
    </div>

    <div class="grid">
      <div class="card blue"><h2>作用范围</h2><p>${escapeHtml(scopeText(report))}</p></div>
      <div class="card purple"><h2>影响代码树</h2><p>${escapeHtml(impactTrees)}</p></div>
      <div class="card green"><h2>影响功能模块</h2><p>${escapeHtml(featureModules)}</p></div>
      <div class="card ${qualityScore.card}"><h2>质量评估</h2><p>${escapeHtml(qualityScore.text)}</p></div>
    </div>

    <div class="grid">
      <div class="card ${testCoverage.card}"><h2>测试覆盖</h2><p>${escapeHtml(testCoverage.text)}</p></div>
      <div class="card ${specCoverage.card}"><h2>规格覆盖</h2><p>${escapeHtml(specCoverage.text)}</p></div>
      <div class="card ${duplicateStatus.card}"><h2>是否有重复代码迹象</h2><p>${escapeHtml(duplicateStatus.text)}</p></div>
      <div class="card amber"><h2>职责摘要</h2><p>${escapeHtml(responsibilitySummaryText(report))}</p></div>
    </div>

    <div class="section-title">影响功能模块</div>
    ${renderFunctionModules(projectContext)}

    <div class="section-title">测试覆盖</div>
    ${renderTestCoverage(projectContext)}

    <div class="section-title">规格覆盖</div>
    ${renderSpecCoverage(projectContext)}

    <div class="section-title">职责评估</div>
    ${renderResponsibilityAssessment(report)}

    <div class="section-title">负面问题与动作</div>
    ${risks.length > 0 ? risks.map(renderRiskCard).join("") : `<div class="card green"><p>当前没有检测到明确负面问题。建议只把这次结果当成即时参考，不需要沉淀为长期报告。</p></div>`}

    <div class="section-title">完整调用图</div>
    ${renderImpactTree(impactTree)}

    <div class="actions">
      <button data-command="saveReport">保存为中文报告</button>
      <button class="secondary" data-command="openKnowledge">打开 .distinction</button>
    </div>
  </main>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function postDatasetCommand(target) {
      vscode.postMessage({
        command: target.getAttribute("data-command"),
        riskType: target.getAttribute("data-risk-type") || undefined,
        filePath: target.getAttribute("data-file-path") || undefined,
        line: Number(target.getAttribute("data-line") || 0),
        character: Number(target.getAttribute("data-character") || 0)
      });
    }

    document.addEventListener("click", (event) => {
      const clicked = event.target;
      if (!(clicked instanceof Element)) return;
      const target = clicked.closest("[data-command]");
      if (!target) return;
      postDatasetCommand(target);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const focused = document.activeElement;
      if (!(focused instanceof Element)) return;
      const target = focused.closest("[data-command]");
      if (!target) return;
      event.preventDefault();
      postDatasetCommand(target);
    });
  </script>
</body>
</html>`;
}

function renderRiskCard(risk: CouplingRisk): string {
  const copy = riskCopyForTips(risk);
  return `<section class="risk">
    <div class="risk-title">${escapeHtml(copy.title)}</div>
    <div>${escapeHtml(copy.why)}</div>
    <div class="risk-meta">严重性：${escapeHtml(severityText(risk.severity))} · 置信度：${escapeHtml(confidenceText(risk.confidence))}</div>
    <div class="actions">
      <button data-command="correctionPlan" data-risk-type="${escapeHtml(risk.type)}">让 AI 给优化方案</button>
    </div>
  </section>`;
}

function renderFunctionModules(context: ProjectInsightContext): string {
  const modules = context.matchingModules.length > 0 ? context.matchingModules : context.functionModules.slice(0, 4);
  const items = modules.length > 0
    ? modules.map((module) => renderFunctionModuleItem(module, context.functionModuleSpecPath)).join("")
    : `<div class="card amber"><p>当前还没有扫描到可映射的功能模块。请先生成或维护功能模块规格。</p></div>`;

  return `<section class="panel module-panel">
    <div class="panel-head">
      <div>
        <h2>候选影响模块：${context.matchingModules.length}</h2>
        <p class="panel-summary">模块来自工程级扫描并写入 .distinction/specs/ 注册表。function-modules.md 只是索引，真实规格在 modules/&lt;module-id&gt;/SPEC.md。</p>
      </div>
      <button class="secondary" data-command="openLocation" data-file-path="${escapeHtml(context.functionModuleSpecPath)}" data-line="0" data-character="0">打开模块索引</button>
    </div>
    <div class="module-list">${items}</div>
  </section>`;
}

function renderFunctionModuleItem(module: FunctionModuleSpec, indexPath: string): string {
  const targetPath = module.specExists ? module.specPath : indexPath;
  const line = module.specExists ? 0 : Math.max(0, module.indexLine - 1);
  const files = module.files.slice(0, 3).map((file) => normalizePath(relative(dirname(indexPath), file))).join("、");
  const actionText = module.specExists ? "打开规格" : "查看索引";
  return `<article class="module-item">
    <div class="module-title">
      <span>${escapeHtml(module.title)}</span>
      <button class="secondary" data-command="openLocation" data-file-path="${escapeHtml(targetPath)}" data-line="${line}" data-character="0">${actionText}</button>
    </div>
    <div class="module-meta">${escapeHtml(module.summary)} · 置信度：${escapeHtml(confidenceText(module.confidence))} · ${module.specExists ? "已有规格" : "缺少规格"}</div>
    <div class="module-files">${escapeHtml(files || "暂无文件")}</div>
  </article>`;
}

function renderTestCoverage(context: ProjectInsightContext): string {
  const coverage = context.testCoverage;
  const hits = coverage.matchingFiles.length > 0
    ? coverage.matchingFiles.map((hit) => `<div class="coverage-hit">
        <button class="secondary" data-command="openLocation" data-file-path="${escapeHtml(hit.filePath)}" data-line="${Math.max(0, hit.line - 1)}" data-character="0">打开测试</button>
        ${escapeHtml(normalizePath(relative(context.workspaceRoot, hit.filePath)))} · ${escapeHtml(hit.reason)}
      </div>`).join("")
    : `<div class="coverage-hit">未找到直接测试证据。建议为当前选区建立最小行为测试。</div>`;
  const action = coverage.covered ? "" : `<div class="actions"><button data-command="createTestPlan">让 AI 创建测试方案</button></div>`;

  return `<section class="panel coverage-panel">
    <div class="panel-head">
      <div>
        <h2>${coverage.covered ? "已发现候选测试覆盖" : "未发现测试覆盖"}</h2>
        <p class="panel-summary">${escapeHtml(coverage.summary)}</p>
      </div>
      <div class="badge" style="background:${coverage.covered ? "#2f855a" : "#b7791f"}">${coverage.covered ? "有测试迹象" : "缺测试"}</div>
    </div>
    <div class="coverage-list">${hits}</div>
    ${action}
  </section>`;
}

function renderSpecCoverage(context: ProjectInsightContext): string {
  const coverage = context.specCoverage;
  const modules = coverage.matchingModules.length > 0
    ? coverage.matchingModules.map((module) => `<div class="coverage-hit">
        <button class="secondary" data-command="openLocation" data-file-path="${escapeHtml(module.specExists ? module.specPath : context.functionModuleSpecPath)}" data-line="${module.specExists ? 0 : Math.max(0, module.indexLine - 1)}" data-character="0">${module.specExists ? "打开规格" : "查看索引"}</button>
        ${escapeHtml(module.title)} · ${module.specExists ? "已有规格" : "缺少规格"}
      </div>`).join("")
    : `<div class="coverage-hit">当前选区尚未映射到稳定功能模块。建议先补模块规格。</div>`;
  const action = coverage.covered ? "" : `<div class="actions"><button data-command="createSpec">AI 补规格草案</button></div>`;

  return `<section class="panel spec-panel">
    <div class="panel-head">
      <div>
        <h2>${coverage.covered ? "已关联功能规格" : "规格缺口"}</h2>
        <p class="panel-summary">${escapeHtml(coverage.summary)}</p>
      </div>
      <div class="badge" style="background:${coverage.covered ? "#2f855a" : "#805ad5"}">${coverage.covered ? "有规格" : "需补规格"}</div>
    </div>
    <div class="coverage-list">${modules}</div>
    ${action}
  </section>`;
}

function renderResponsibilityAssessment(report: ArchitectureInsightReport): string {
  const responsibilities = report.responsibilityBreakdown;
  const status = responsibilityAssessmentStatus(report);
  const items = responsibilities.length > 0
    ? responsibilities.map((responsibility, index) => renderResponsibilityItem(responsibility, index)).join("")
    : `<div class="card amber"><p>当前选区还没有足够证据识别明确职责。建议先扩大选区到函数或类，再重新分析。</p></div>`;
  const action = responsibilityAssessmentNeedsAction(report)
    ? `<div class="actions"><button data-command="correctionPlan" data-risk-type="RESPONSIBILITY_OVERLOAD">让 AI 给职责拆分方案</button></div>`
    : "";

  return `<section class="panel responsibility-panel">
    <div class="panel-head">
      <div>
        <h2>${escapeHtml(status.title)}</h2>
        <p class="panel-summary">${escapeHtml(status.summary)}</p>
      </div>
      <div class="badge" style="background:${status.color}">${escapeHtml(status.badge)}</div>
    </div>
    <div class="responsibility-list">
      ${items}
    </div>
    ${action}
  </section>`;
}

function renderResponsibilityItem(responsibility: Responsibility, index: number): string {
  const evidence = (responsibility.evidence ?? []).slice(0, 3);
  const evidenceChips = evidence.length > 0
    ? evidence.map((item) => `<span class="evidence-chip">${escapeHtml(evidenceLabel(item.summary, item.quote))}</span>`).join("")
    : `<span class="evidence-chip">暂无可展示证据片段</span>`;
  const split = responsibilitySplitAdvice(responsibility.kind);

  return `<article class="responsibility-item">
    <div class="responsibility-top">
      <div class="responsibility-name"><span class="responsibility-index">${index + 1}</span>${escapeHtml(responsibilityText(responsibility.kind))}</div>
      <div class="responsibility-confidence">置信度：${escapeHtml(confidenceText(responsibility.confidence))}</div>
    </div>
    <div class="responsibility-body">
      <div class="responsibility-line"><strong>它是什么：</strong>${escapeHtml(responsibilityDescriptionText(responsibility))}</div>
      <div class="responsibility-line"><strong>为什么这么判断：</strong>${escapeHtml(responsibilityReasonText(responsibility))}</div>
      <div class="responsibility-line"><strong>建议归属：</strong>${escapeHtml(split.owner)}</div>
      <div class="responsibility-line"><strong>拆分建议：</strong>${escapeHtml(split.advice)}</div>
      <div class="responsibility-line"><strong>为什么要这样拆：</strong>${escapeHtml(split.reason)}</div>
      <div class="evidence-chip-row">${evidenceChips}</div>
    </div>
  </article>`;
}

function renderImpactTree(tree: ImpactTree): string {
  const layout = layoutImpactGraph(tree);
  const edges = layout.edges.map(renderGraphEdge).join("");
  const nodes = layout.nodes.map(renderGraphNode).join("");
  return `<section class="call-tree">
    <div class="graph-caption">
      <span class="legend"><span class="legend-dot" style="background:#805ad5"></span>上游调用 / 引用：${layout.incomingCount}</span>
      <span class="legend"><span class="legend-dot" style="background:#3182ce"></span>当前选区</span>
      <span class="legend"><span class="legend-dot" style="background:#2f855a"></span>下游调用：${layout.outgoingCount}</span>
      <span>${escapeHtml(tree.note)}</span>
    </div>
    <svg class="call-graph" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="完整调用图">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="currentColor"></path>
        </marker>
      </defs>
      ${edges}
      ${nodes}
    </svg>
  </section>`;
}

function layoutImpactGraph(tree: ImpactTree): GraphLayout {
  const rowGap = 86;
  const colGap = 250;
  const nodeWidth = 190;
  const nodeHeight = 52;
  const rootX = Math.max(maxDepth(tree.incoming), 1) * colGap + 36;
  const incomingPositions: GraphNode[] = [];
  const outgoingPositions: GraphNode[] = [];
  const incomingEdges: GraphEdge[] = [];
  const outgoingEdges: GraphEdge[] = [];
  let row = 0;

  const rootGraphNode: GraphNode = {
    node: tree.root,
    x: rootX,
    y: 40,
    side: "root"
  };

  row = layoutSide(tree.incoming, rootGraphNode, "incoming", rootX - colGap, 0, row, incomingPositions, incomingEdges, rowGap, colGap);
  row = Math.max(row, 1);
  layoutSide(tree.outgoing, rootGraphNode, "outgoing", rootX + colGap, 0, 0, outgoingPositions, outgoingEdges, rowGap, colGap);

  const maxRows = Math.max(row, countVisibleRows(tree.outgoing), 1);
  const maxOutgoingDepth = Math.max(maxDepth(tree.outgoing), 1);
  const width = rootX + maxOutgoingDepth * colGap + nodeWidth + 72;
  const height = Math.max(180, maxRows * rowGap + nodeHeight + 72);
  rootGraphNode.y = Math.max(40, (height - nodeHeight) / 2);

  for (const edge of [...incomingEdges, ...outgoingEdges]) {
    if (edge.to.side === "root") edge.to = rootGraphNode;
    if (edge.from.side === "root") edge.from = rootGraphNode;
  }

  return {
    width,
    height,
    nodes: [...incomingPositions, rootGraphNode, ...outgoingPositions],
    edges: [...incomingEdges, ...outgoingEdges],
    incomingCount: countTreeNodes(tree.incoming),
    outgoingCount: countTreeNodes(tree.outgoing)
  };
}

function layoutSide(
  nodes: ImpactTreeNode[],
  parent: GraphNode,
  side: "incoming" | "outgoing",
  x: number,
  depth: number,
  row: number,
  positioned: GraphNode[],
  edges: GraphEdge[],
  rowGap: number,
  colGap: number
): number {
  for (const node of nodes) {
    const graphNode: GraphNode = {
      node,
      x,
      y: 40 + row * rowGap,
      side
    };
    positioned.push(graphNode);
    if (side === "incoming") edges.push({ from: graphNode, to: parent });
    else edges.push({ from: parent, to: graphNode });
    row += 1;
    const childX = side === "incoming" ? x - colGap : x + colGap;
    row = layoutSide(node.children, graphNode, side, childX, depth + 1, row, positioned, edges, rowGap, colGap);
  }
  return row;
}

function renderGraphEdge(edge: GraphEdge): string {
  const fromX = edge.from.x + (edge.from.side === "incoming" ? 190 : edge.from.side === "root" ? 190 : 0);
  const toX = edge.to.x + (edge.to.side === "incoming" ? 190 : edge.to.side === "root" ? 0 : 0);
  const fromY = edge.from.y + 26;
  const toY = edge.to.y + 26;
  const midX = (fromX + toX) / 2;
  return `<path class="graph-edge" marker-end="url(#arrow)" d="M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}" />`;
}

function renderGraphNode(item: GraphNode): string {
  const fill = item.side === "root" ? "rgba(49, 130, 206, 0.28)" : item.side === "incoming" ? "rgba(128, 90, 213, 0.22)" : "rgba(47, 133, 90, 0.22)";
  const stroke = item.side === "root" ? "rgba(49, 130, 206, 0.9)" : item.side === "incoming" ? "rgba(128, 90, 213, 0.85)" : "rgba(47, 133, 90, 0.85)";
  return `<g
    class="graph-node"
    role="button"
    tabindex="0"
    aria-label="打开 ${escapeHtml(item.node.label)}"
    data-command="openLocation"
    data-file-path="${escapeHtml(item.node.filePath)}"
    data-line="${item.node.line}"
    data-character="${item.node.character}"
    transform="translate(${item.x}, ${item.y})"
  >
    <rect width="190" height="52" rx="8" fill="${fill}" stroke="${stroke}"></rect>
    <text class="graph-label" x="10" y="21">${escapeHtml(truncateText(item.node.label, 22))}</text>
    <text class="graph-detail" x="10" y="39">${escapeHtml(truncateText(item.node.detail, 30))}</text>
    <title>${escapeHtml(item.node.detail)}</title>
  </g>`;
}

function countVisibleRows(nodes: ImpactTreeNode[]): number {
  return Math.max(1, countTreeNodes(nodes));
}

function maxDepth(nodes: ImpactTreeNode[]): number {
  if (nodes.length === 0) return 0;
  return 1 + Math.max(...nodes.map((node) => maxDepth(node.children)));
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function evidenceLabel(summary: string, quote?: string): string {
  const compactQuote = quote ? compactWhitespace(quote) : "";
  const value = compactQuote || summary;
  return truncateText(value, 72);
}

function findSampleWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.find((folder) =>
    folder.uri.fsPath.replaceAll("\\", "/").endsWith("examples/sample-project")
    || folder.name === "sample-project"
  );
}

function findMethodSelection(document: vscode.TextDocument, methodName: string): vscode.Selection | undefined {
  const text = document.getText();
  const methodIndex = text.indexOf(`${methodName}(`);
  if (methodIndex === -1) return undefined;
  const lineStart = text.lastIndexOf("\n", methodIndex) + 1;
  const start = document.positionAt(lineStart);
  const bodyStart = text.indexOf("{", methodIndex);
  if (bodyStart === -1) return undefined;
  return balancedBlockSelection(document, text, start, bodyStart);
}

function findClassSelection(document: vscode.TextDocument, className: string): vscode.Selection | undefined {
  const text = document.getText();
  const classIndex = text.indexOf(`class ${className}`);
  if (classIndex === -1) return undefined;
  const start = document.positionAt(classIndex);
  const bodyStart = text.indexOf("{", classIndex);
  if (bodyStart === -1) return undefined;
  return balancedBlockSelection(document, text, start, bodyStart);
}

function balancedBlockSelection(document: vscode.TextDocument, text: string, start: vscode.Position, bodyStart: number): vscode.Selection {
  let depth = 0;
  for (let index = bodyStart; index < text.length; index += 1) {
    const char = text[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return new vscode.Selection(start, document.positionAt(index + 1));
  }
  return new vscode.Selection(start, document.positionAt(text.length));
}

function fullDocumentSelection(document: vscode.TextDocument): vscode.Selection {
  return new vscode.Selection(new vscode.Position(0, 0), document.lineAt(document.lineCount - 1).range.end);
}

async function symbolPositionForSelection(document: vscode.TextDocument, selection: vscode.Selection): Promise<vscode.Position> {
  const documentSymbolPosition = await documentSymbolPositionForSelection(document, selection);
  if (documentSymbolPosition) return documentSymbolPosition;

  const selectedText = document.getText(selection);
  const match = selectedText.match(/\b(?:class|function|const|let|var|interface|type)?\s*([A-Za-z_$][\w$]*)\s*(?:\(|\{|=|:)?/);
  if (!match?.[1]) return selection.start;
  const absoluteOffset = document.offsetAt(selection.start) + (match.index ?? 0) + match[0].indexOf(match[1]);
  return document.positionAt(absoluteOffset);
}

async function documentSymbolPositionForSelection(document: vscode.TextDocument, selection: vscode.Selection): Promise<vscode.Position | undefined> {
  const symbols = await vscode.commands.executeCommand<Array<vscode.DocumentSymbol | vscode.SymbolInformation>>(
    "vscode.executeDocumentSymbolProvider",
    document.uri
  ).then((result) => result ?? [], () => []);
  const candidates = flattenDocumentSymbols(symbols)
    .filter((symbol) => symbol.range.contains(selection.start) || symbol.selectionRange.contains(selection.start))
    .sort((left, right) => rangeSize(left.range) - rangeSize(right.range));
  const preferred = candidates.find((symbol) => isCallableSymbolKind(symbol.kind)) ?? candidates[0];
  return preferred?.selectionRange.start;
}

function flattenDocumentSymbols(symbols: Array<vscode.DocumentSymbol | vscode.SymbolInformation>): vscode.DocumentSymbol[] {
  const result: vscode.DocumentSymbol[] = [];
  for (const symbol of symbols) {
    if (symbol instanceof vscode.DocumentSymbol) {
      result.push(symbol);
      result.push(...flattenDocumentSymbols(symbol.children));
    }
  }
  return result;
}

function rangeSize(range: vscode.Range): number {
  return range.end.line - range.start.line + (range.end.character - range.start.character) / 1000;
}

function isCallableSymbolKind(kind: vscode.SymbolKind): boolean {
  return kind === vscode.SymbolKind.Method
    || kind === vscode.SymbolKind.Function
    || kind === vscode.SymbolKind.Constructor
    || kind === vscode.SymbolKind.Class
    || kind === vscode.SymbolKind.Interface
    || kind === vscode.SymbolKind.Object;
}

function createRootImpactNode(document: vscode.TextDocument, selection: vscode.Selection, symbolPosition: vscode.Position): ImpactTreeNode {
  const symbol = wordAt(document, symbolPosition) ?? "当前选区";
  return {
    id: "root",
    label: symbol,
    detail: `${relativePath(document.uri.fsPath)}:${selection.start.line + 1}`,
    filePath: document.uri.fsPath,
    line: symbolPosition.line,
    character: symbolPosition.character,
    children: []
  };
}

function callHierarchyNode(item: vscode.CallHierarchyItem, range: vscode.Range): ImpactTreeNode {
  return {
    id: `${item.uri.fsPath}:${range.start.line}:${range.start.character}:${item.name}`,
    label: item.name,
    detail: `${relativePath(item.uri.fsPath)}:${range.start.line + 1}`,
    filePath: item.uri.fsPath,
    line: range.start.line,
    character: range.start.character,
    children: []
  };
}

function outgoingCallNode(caller: vscode.CallHierarchyItem, call: vscode.CallHierarchyOutgoingCall): ImpactTreeNode {
  const range = call.fromRanges[0] ?? call.to.selectionRange;
  const uri = call.fromRanges[0] ? caller.uri : call.to.uri;
  return {
    id: `${uri.fsPath}:${range.start.line}:${range.start.character}:calls:${call.to.name}`,
    label: call.to.name,
    detail: `调用处 ${relativePath(uri.fsPath)}:${range.start.line + 1}`,
    filePath: uri.fsPath,
    line: range.start.line,
    character: range.start.character,
    children: []
  };
}

function locationNode(id: string, uri: vscode.Uri, position: vscode.Position, label: string): ImpactTreeNode {
  const fileName = uri.fsPath.split(/[\\/]/).pop() ?? uri.fsPath;
  return {
    id,
    label: `${label}: ${fileName}`,
    detail: `${relativePath(uri.fsPath)}:${position.line + 1}`,
    filePath: uri.fsPath,
    line: position.line,
    character: position.character,
    children: []
  };
}

function wordAt(document: vscode.TextDocument, position: vscode.Position): string | undefined {
  const range = document.getWordRangeAtPosition(position);
  return range ? document.getText(range) : undefined;
}

function nodeKey(node: ImpactTreeNode): string {
  return `${node.filePath}:${node.line}:${node.character}:${node.label}`;
}

function relativePath(filePath: string): string {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
  return folder ? vscode.workspace.asRelativePath(filePath, false) : filePath;
}

function createTestPlanMarkdown(insight: LatestInsight): string {
  const { report, projectContext } = insight;
  const target = report.selectedTarget.targetName ?? projectContext.selectedSymbol ?? "当前选区";
  const candidate = normalizePath(relative(report.selectedTarget.workspaceRoot, projectContext.testCoverage.candidateTestPath));
  const modules = projectContext.matchingModules.map((module) => module.title).join("、") || "尚未稳定映射";
  return [
    `# 为 ${target} 创建测试`,
    "",
    "## 当前判断",
    "",
    `- 测试覆盖：${projectContext.testCoverage.summary}`,
    `- 候选测试文件：\`${candidate}\``,
    `- 关联功能模块：${modules}`,
    "",
    "## 建议测试",
    "",
    "1. 先固定当前选区的外部可观察行为，不测试私有实现细节。",
    "2. 如果当前代码职责过载，优先写主路径行为测试，再拆分职责。",
    "3. 对硬件、数据库、UI、协议等外部协作者使用 mock / fake / port，避免测试依赖真实设施。",
    "4. 至少覆盖成功路径和一个失败 / 边界路径。",
    "",
    "## 生成要求",
    "",
    "- 新测试应该靠近被测代码或进入项目既有 test 目录。",
    "- 测试名必须说明业务行为，不只复述函数名。",
    "- 测试创建前先确认规格覆盖；如果没有规格，先补规格草案。"
  ].join("\n") + "\n";
}

function functionModuleSpecTemplate(insight: LatestInsight, module: FunctionModuleSpec | undefined): string {
  const { report, projectContext } = insight;
  const targetModule = module ?? projectContext.matchingModules[0];
  const title = targetModule?.title ?? (report.selectedTarget.targetName ?? projectContext.selectedSymbol ?? "未命名功能模块");
  const files = targetModule?.files ?? [report.selectedTarget.filePath];
  return [
    `# ${title}`,
    "",
    "## 状态",
    "",
    "- status: draft",
    "- confidence: low",
    "- source: Distinction Architecture Tips",
    "",
    "## 功能意图",
    "",
    "请在这里描述这个功能模块要稳定什么用户/系统行为。",
    "",
    "## 行为规格",
    "",
    "- Given ...",
    "- When ...",
    "- Then ...",
    "",
    "## 关联代码",
    "",
    ...files.slice(0, 10).map((file) => `- \`${normalizePath(relative(report.selectedTarget.workspaceRoot, file))}\``),
    "",
    "## 边界约束",
    "",
    "- 不把数据库表、UI 状态、协议 packet 或硬件 driver 直接提升为功能真相。",
    "- 修改本模块前，先确认测试覆盖和调用影响图。",
    "",
    "## 待确认",
    "",
    "- 这个模块名称是否准确？",
    "- 这个模块是否应该拆成多个功能模块？",
    "- 当前选区是否确实由本规格驱动？"
  ].join("\n") + "\n";
}

function correctionPlanMarkdown(report: ArchitectureInsightReport, risk: CouplingRisk | undefined): string {
  const title = risk ? riskCopyForTips(risk).title : "职责拆分与代码质量改良方案";
  const target = report.selectedTarget.targetName ?? "代码选区";
  const lines = [
    `# ${title}`,
    "",
    "## 目标",
    "",
    `- 选中目标：${target}`,
    `- 文件：\`${report.selectedTarget.filePath}\``,
    "",
    "## 当前判断",
    "",
    risk ? `当前主要问题是「${riskCopyForTips(risk).title}」。${riskCopyForTips(risk).why}` : responsibilityPlanCurrentJudgement(report),
    "",
    "## 优化方案",
    "",
    ...(risk ? correctionStepsForRisk(risk, report) : responsibilityCorrectionSteps(report)),
    "",
    "## 是否执行",
    "",
    "这份方案目前只是草稿。请人工确认后，再决定是否让 AI 执行代码改动。"
  ];
  return `${lines.join("\n")}\n`;
}

function correctionStepsForRisk(risk: CouplingRisk, report: ArchitectureInsightReport): string[] {
  if (risk.type === "APPLICATION_HARDWARE_COUPLING") {
    return [
      "1. 为应用层定义表达业务意图的端口，例如 `MessageRadioPort`。",
      "2. 把硬件发送移到硬件 / 基础设施适配器。",
      "3. 应用服务只调用端口，不知道具体芯片、driver、GPIO 或 packet 发送细节。",
      "4. 为应用服务补一条端口 mock 测试，确认业务编排不依赖真实硬件。"
    ];
  }
  if (risk.type === "RESPONSIBILITY_OVERLOAD") {
    return responsibilityCorrectionSteps(report);
  }
  return [
    `1. 先确认「${riskCopyForTips(risk).title}」是否由事实证据支持，而不是单纯命名推断。`,
    "2. 明确这个问题应该归属到哪个最终 owner。",
    "3. 给出不改变外部行为的小步重构方案。",
    "4. 补测试后再执行。"
  ];
}

function riskCopyForTips(risk: CouplingRisk): { title: string; why: string } {
  const copies: Record<string, { title: string; why: string }> = {
    APPLICATION_HARDWARE_COUPLING: {
      title: "应用层直接耦合硬件",
      why: "应用服务直接触碰硬件 / driver 细节，后续改硬件会反向冲击业务编排。"
    },
    UI_DOMAIN_COUPLING: {
      title: "UI 与领域行为耦合",
      why: "展示需求可能正在反向塑造领域语义。"
    },
    DOMAIN_PERSISTENCE_REPRESENTATION: {
      title: "领域层泄漏持久化表示",
      why: "数据库表、列或 ORM 形状可能被误当成领域真相。"
    },
    DOMAIN_TRANSPORT_DTO_LEAKAGE: {
      title: "领域层泄漏传输 DTO",
      why: "外部协议 / API 返回结构可能污染核心领域模型。"
    },
    PROTOCOL_USECASE_MIXING: {
      title: "协议处理与用例编排混合",
      why: "协议 handler 可能正在承载业务流程。"
    },
    RESPONSIBILITY_OVERLOAD: {
      title: "职责过载",
      why: "同一片段承载多类独立职责，继续在原地补丁会放大质量问题。"
    }
  };
  return copies[risk.type] ?? { title: risk.type, why: risk.whyUnreasonable };
}

function riskLevelText(report: ArchitectureInsightReport): string {
  if (report.unreasonableCouplingPoints.some((risk) => risk.severity === "error")) return "高风险";
  if (report.unreasonableCouplingPoints.some((risk) => risk.severity === "warning")) return "中风险";
  return "未发现明显风险";
}

function riskBadgeColor(report: ArchitectureInsightReport): string {
  if (report.unreasonableCouplingPoints.some((risk) => risk.severity === "error")) return "#c53030";
  if (report.unreasonableCouplingPoints.some((risk) => risk.severity === "warning")) return "#b7791f";
  return "#2f855a";
}

function qualityScoreFor(report: ArchitectureInsightReport): { text: string; card: string } {
  const riskCount = report.unreasonableCouplingPoints.length;
  if (riskCount >= 2) return { text: "需要改良：存在多个结构风险，建议先从职责拆分开始。", card: "red" };
  if (riskCount === 1) return { text: "存在风险：建议生成优化方案后再决定是否改动。", card: "amber" };
  return { text: "暂未发现明显结构风险，但仍需要测试和重复代码证据。", card: "green" };
}

function scopeText(report: ArchitectureInsightReport): string {
  return `当前选区主要被识别为 ${layerText(report.architectureRole.primaryLayer)}，目标是 ${report.selectedTarget.targetName ?? "代码片段"}。`;
}

function impactTreeSummary(tree: ImpactTree): string {
  const incoming = countTreeNodes(tree.incoming);
  const outgoing = countTreeNodes(tree.outgoing);
  const provider = tree.provider === "call-hierarchy" ? "Call Hierarchy" : tree.provider === "references" ? "References" : "无 IDE 调用数据";
  return `${provider}：${incoming} 个上游节点，${outgoing} 个下游节点。${tree.truncated ? "结果已截断。" : ""}`;
}

function featureModulesSummaryText(context: ProjectInsightContext): string {
  if (context.matchingModules.length === 0) return `已扫描 ${context.functionModules.length} 个候选模块，当前选区尚未稳定映射。`;
  return context.matchingModules.map((module) => module.title).join("、");
}

function testCoverageCard(coverage: TestCoverage): { text: string; card: string } {
  return coverage.covered
    ? { text: coverage.summary, card: "green" }
    : { text: `${coverage.summary} 可生成测试创建方案。`, card: "amber" };
}

function specCoverageCard(coverage: SpecCoverage): { text: string; card: string } {
  return coverage.covered
    ? { text: coverage.summary, card: "green" }
    : { text: `${coverage.summary} 可补功能规格草案。`, card: "purple" };
}

function duplicateStatusText(): { text: string; card: string } {
  return {
    text: "当前版本尚未接入跨文件相似代码索引，不能确认是否重复。建议后续接入文本相似度 provider。",
    card: "amber"
  };
}

function responsibilitySummaryText(report: ArchitectureInsightReport): string {
  const count = report.responsibilityBreakdown.length;
  if (report.responsibilityOverload) return `检测到 ${count} 类职责，已构成职责过载。`;
  if (count > 1) return `检测到 ${count} 类职责，需要确认主职责与拆分边界。`;
  if (count === 1) return `检测到 1 类主职责：${responsibilityText(report.responsibilityBreakdown[0].kind)}。`;
  return "暂未识别明确职责。";
}

function responsibilityAssessmentStatus(report: ArchitectureInsightReport): { title: string; summary: string; badge: string; color: string } {
  const count = report.responsibilityBreakdown.length;
  if (report.responsibilityOverload) {
    return {
      title: `检测到 ${count} 类职责，存在职责过载`,
      summary: "这个选区正在同时承载多种独立变化原因。继续在原地补丁，会让 AI 更容易把适配、展示、协议或持久化细节误当成业务事实。",
      badge: "需要拆分",
      color: "#c53030"
    };
  }
  if (count > 1) {
    return {
      title: `检测到 ${count} 类职责，需要人工确认边界`,
      summary: "这不一定已经是错误，但它说明当前选区不应只被一句“是否单一”概括。需要确认哪个是主职责，哪些只是协作者或应该外移的适配细节。",
      badge: "需确认",
      color: "#b7791f"
    };
  }
  if (count === 1) {
    return {
      title: "当前只检测到 1 类主要职责",
      summary: "当前证据支持相对集中的职责判断。仍建议结合调用图和测试证据确认它没有隐藏其它变化原因。",
      badge: "相对集中",
      color: "#2f855a"
    };
  }
  return {
    title: "职责证据不足",
    summary: "当前选区太小或证据太少，无法稳定判断职责。建议选择完整函数、类或模块入口后重新分析。",
    badge: "证据不足",
    color: "#b7791f"
  };
}

function responsibilityAssessmentNeedsAction(report: ArchitectureInsightReport): boolean {
  return Boolean(report.responsibilityOverload) || report.responsibilityBreakdown.length > 1;
}

function responsibilityDescriptionText(responsibility: Responsibility): string {
  const descriptions: Record<string, string> = {
    "application-service": "负责表达应用层服务入口，把外部请求转成用例调用。",
    "usecase-orchestration": "负责编排一个用例完成所需的步骤和协作者。",
    "hardware-driver": "负责触碰硬件、driver、芯片、GPIO 或设备发送细节。",
    "persistence-representation": "负责数据库、表、记录、Repository 或存储表示。",
    "protocol-handling": "负责协议编码、packet/frame 构造或传输格式处理。",
    "ui-presentation": "负责 UI 状态、展示状态或界面反馈。",
    "domain-model": "负责领域对象及其稳定语义。",
    "domain-behavior": "负责业务规则和领域行为。",
    "transport-dto": "负责请求、响应、DTO 或外部传输结构。",
    "platform-adapter": "负责平台 API、运行环境或外部系统适配。",
    "test-or-smoke": "负责测试、冒烟验证或行为样例。",
    "documentation": "负责说明性文档或协作知识。"
  };
  return descriptions[responsibility.kind] ?? responsibility.description;
}

function responsibilityReasonText(responsibility: Responsibility): string {
  const evidence = responsibility.evidence ?? [];
  const quote = evidence.find((item) => item.quote)?.quote;
  if (quote) return `证据中出现了「${compactWhitespace(quote)}」。`;
  const summary = evidence[0]?.summary;
  if (summary) return summary;
  return "当前判断来自路径、命名、import 或文本 token 的组合证据。";
}

function responsibilitySplitAdvice(kind: string): { owner: string; advice: string; reason: string } {
  const adviceByKind: Record<string, { owner: string; advice: string; reason: string }> = {
    "application-service": {
      owner: "application / usecase 层",
      advice: "保留业务意图和用例入口，不直接包含硬件、UI、数据库或协议细节。",
      reason: "应用层应该稳定表达“要完成什么”，避免被具体技术实现牵着变化。"
    },
    "usecase-orchestration": {
      owner: "application / workflow 层",
      advice: "只负责编排步骤，把具体执行动作交给端口或适配器。",
      reason: "编排代码应当可测试、可替换协作者，而不是直接绑定具体设施。"
    },
    "hardware-driver": {
      owner: "infrastructure / hardware adapter",
      advice: "抽到硬件适配器或端口实现中，应用层只依赖意图级接口。",
      reason: "硬件型号、GPIO、driver API 的变化不应反向冲击用例流程。"
    },
    "persistence-representation": {
      owner: "infrastructure / persistence adapter",
      advice: "把 sqlite、表结构、Repository 细节放在持久化适配器，向上暴露语义化查询/保存端口。",
      reason: "数据库表示是实现形态，不应变成领域或应用层的事实来源。"
    },
    "protocol-handling": {
      owner: "protocol / codec",
      advice: "把 encode/decode、packet/frame 构造集中在协议 codec，业务流程只处理语义对象。",
      reason: "协议格式变化频繁，和用例编排混在一起会让修改影响面扩大。"
    },
    "ui-presentation": {
      owner: "ui / presentation store",
      advice: "把界面状态更新移到 UI store 或 presenter，用事件或结果状态连接应用层。",
      reason: "展示反馈不应反向决定业务流程，否则 UI 需求会污染核心语义。"
    },
    "domain-model": {
      owner: "domain / model",
      advice: "保留稳定领域概念，隔离 DTO、数据库行和界面状态。",
      reason: "领域模型应该解释业务世界，而不是复刻外部表示。"
    },
    "domain-behavior": {
      owner: "domain / policy",
      advice: "把业务规则放回领域策略或实体方法，应用层只编排调用。",
      reason: "业务规则如果散落在服务、UI 或适配器里，会导致重复和语义漂移。"
    },
    "transport-dto": {
      owner: "transport / adapter",
      advice: "把 request/response/DTO 映射放到传输适配层，核心层只接收语义命令或值对象。",
      reason: "外部 API 形状是边界协议，不应定义内部核心模型。"
    },
    "platform-adapter": {
      owner: "infrastructure / platform adapter",
      advice: "把平台能力封装成端口实现，不让核心代码直接依赖运行环境 API。",
      reason: "平台 API 是可替换设施，直接进入核心会降低迁移与测试自由度。"
    },
    "test-or-smoke": {
      owner: "test / smoke",
      advice: "保留为验证入口，不要让测试辅助逻辑进入生产路径。",
      reason: "测试代码表达验证意图，和生产职责混在一起会制造误导。"
    }
  };
  return adviceByKind[kind] ?? {
    owner: "needs-human-decision",
    advice: "先由工程师确认最终 owner，再决定是否拆分。",
    reason: "当前职责类型还没有足够稳定的归属规则，不能让 AI 自动裁决。"
  };
}

function responsibilityPlanCurrentJudgement(report: ArchitectureInsightReport): string {
  const responsibilities = report.responsibilityBreakdown.map((item, index) => `${index + 1}. ${responsibilityText(item.kind)}`).join("；");
  return responsibilities
    ? `当前检测到这些职责：${responsibilities}。需要先确认主职责，再把其它变化原因移到各自 owner。`
    : "当前没有明确规则风险，但可以继续做职责、测试和重复代码检查。";
}

function responsibilityCorrectionSteps(report: ArchitectureInsightReport): string[] {
  const responsibilities = report.responsibilityBreakdown;
  if (responsibilities.length === 0) {
    return [
      "1. 先扩大选区到完整函数、类或模块入口，避免基于碎片做结构判断。",
      "2. 补充调用图和测试证据后，再决定是否需要拆分。",
      "3. 如果仍然证据不足，不要让 AI 直接重构。"
    ];
  }
  const primary = responsibilities.find((item) => item.kind === "application-service" || item.kind === "usecase-orchestration") ?? responsibilities[0];
  const secondary = responsibilities.filter((item) => item !== primary);
  return [
    `1. 先把主职责固定为「${responsibilityText(primary.kind)}」，它留在 ${responsibilitySplitAdvice(primary.kind).owner}。`,
    ...secondary.slice(0, 5).map((item, index) => `${index + 2}. 将「${responsibilityText(item.kind)}」迁移到 ${responsibilitySplitAdvice(item.kind).owner}：${responsibilitySplitAdvice(item.kind).advice}`),
    `${Math.min(secondary.length, 5) + 2}. 为拆分后的主路径补测试，确认外部行为没有改变。`,
    `${Math.min(secondary.length, 5) + 3}. 重新运行架构洞察，确认职责数量和耦合风险下降。`
  ];
}

function layerText(value: string): string {
  const labels: Record<string, string> = {
    ui: "UI / 展示层",
    application: "应用层",
    domain: "领域层",
    infrastructure: "基础设施层",
    hardware: "硬件层",
    persistence: "持久化层",
    transport: "传输层",
    protocol: "协议层",
    unknown: "未知层"
  };
  return labels[value] ?? value;
}

function responsibilityText(value: string): string {
  const labels: Record<string, string> = {
    "application-service": "应用服务",
    "usecase-orchestration": "用例编排",
    "hardware-driver": "硬件驱动",
    "persistence-representation": "持久化表示",
    "protocol-handling": "协议处理",
    "ui-presentation": "UI 状态 / 展示",
    "domain-model": "领域模型",
    "domain-behavior": "领域行为",
    "transport-dto": "传输 DTO",
    "platform-adapter": "平台适配"
  };
  return labels[value] ?? value;
}

function severityText(value: string): string {
  if (value === "error") return "高";
  if (value === "warning") return "中";
  return "低";
}

function confidenceText(value: string): string {
  if (value === "high") return "高";
  if (value === "medium") return "中";
  return "低";
}

function inferSelectedSymbol(text: string): string | undefined {
  const patterns = [
    /\bclass\s+([A-Za-z_$][\w$]*)/,
    /\bfunction\s+([A-Za-z_$][\w$]*)/,
    /\b([A-Za-z_$][\w$]*)\s*\(/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function moduleKeyFromPath(relativePathValue: string): string {
  const parts = normalizePath(relativePathValue).split("/");
  const srcIndex = parts.indexOf("src");
  const significant = srcIndex >= 0 ? parts.slice(srcIndex + 1) : parts;
  const withoutFile = significant.slice(0, -1);
  const fileBase = basename(significant.at(-1) ?? "module", extname(significant.at(-1) ?? ""));
  const raw = withoutFile.length >= 2
    ? withoutFile.slice(0, 2).join("-")
    : withoutFile.length === 1
      ? `${withoutFile[0]}-${fileBase}`
      : fileBase;
  return slugify(raw || "module");
}

function tokensFromPath(value: string): string[] {
  return normalizePath(value)
    .split(/[\/._-]+/)
    .flatMap(wordsFromIdentifier)
    .filter((token) => token.length > 1 && !["src", "test", "spec"].includes(token));
}

function symbolsFromText(text: string): string[] {
  const result = new Set<string>();
  const patterns = [
    /\b(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:export\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /\b([A-Za-z_$][\w$]*)\s*\(/g
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1] && !["if", "for", "while", "switch", "return"].includes(match[1])) result.add(match[1]);
    }
  }
  return Array.from(result).slice(0, 40);
}

function wordsFromIdentifier(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((item) => item.toLowerCase())
    .filter((item) => item.length > 1);
}

function titleFromModuleId(id: string): string {
  return id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function summaryForModule(id: string, files: string[]): string {
  if (id.includes("application")) return "应用流程 / 用例入口候选模块";
  if (id.includes("ui")) return "界面交互 / 展示状态候选模块";
  if (id.includes("persistence")) return "持久化读写候选模块";
  if (id.includes("hardware")) return "硬件适配候选模块";
  if (id.includes("protocol")) return "协议编码候选模块";
  if (id.includes("cli")) return "命令行入口候选模块";
  return `由 ${files.length} 个文件推断出的功能模块候选`;
}

function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "module";
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function lineNumberAt(text: string, offset: number): number {
  return text.slice(0, Math.max(0, offset)).split(/\r?\n/).length;
}

function fileExistsSyncLike(filePath: string): boolean {
  return existsSync(filePath);
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function countTreeNodes(nodes: ImpactTreeNode[]): number {
  let total = 0;
  for (const node of nodes) total += 1 + countTreeNodes(node.children);
  return total;
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function createNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let index = 0; index < 32; index += 1) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
