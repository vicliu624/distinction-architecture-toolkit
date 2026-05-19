import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  configTemplate,
  correctionMemoryTemplate,
  couplingRisksTemplate,
  latestSelectionInsightTemplate,
  functionModulesTemplate,
  specManifestTemplate,
  localKnowledgeFiles,
  constructionRulesTemplate,
  sessionLogTemplate
} from "./templates.js";

export interface InitLocalKnowledgeResult {
  root: string;
  createdFiles: string[];
}

export async function initLocalKnowledge(workspaceRoot: string): Promise<InitLocalKnowledgeResult> {
  const root = join(workspaceRoot, ".distinction");
  const files: Array<[string, string]> = [
    [localKnowledgeFiles.config, configTemplate()],
    [localKnowledgeFiles.correctionMemory, correctionMemoryTemplate()],
    [localKnowledgeFiles.constructionRules, constructionRulesTemplate()],
    [localKnowledgeFiles.couplingRisks, couplingRisksTemplate()],
    [localKnowledgeFiles.sessionLog, sessionLogTemplate()],
    [localKnowledgeFiles.specManifest, specManifestTemplate()],
    [localKnowledgeFiles.functionModules, functionModulesTemplate()],
    [localKnowledgeFiles.latestSelectionInsight, latestSelectionInsightTemplate()]
  ];

  const createdFiles: string[] = [];
  await mkdir(root, { recursive: true });
  for (const [relativePath, content] of files) {
    const target = join(root, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" }).then(
      () => createdFiles.push(target),
      (error: unknown) => {
        if (isAlreadyExists(error)) return;
        throw error;
      }
    );
  }

  return { root, createdFiles };
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
