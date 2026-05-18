import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { localKnowledgeFiles } from "./templates.js";

export async function writeLatestSelectionInsight(workspaceRoot: string, markdown: string): Promise<string> {
  const target = join(workspaceRoot, ".distinction", localKnowledgeFiles.latestSelectionInsight);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, markdown, "utf8");
  return target;
}
