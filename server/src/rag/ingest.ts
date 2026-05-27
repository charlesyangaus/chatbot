import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chunkMarkdown } from "./chunk.js";
import { embedTexts } from "./embeddings.js";
import { getSupabase } from "./supabase.js";
import type { IngestResult } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const defaultKnowledgeDir = path.resolve(__dirname, "../../knowledge");

export type IngestOptions = {
  knowledgeDir?: string;
  clearExisting?: boolean;
};

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => path.join(dir, e.name));
}

export async function ingestKnowledge(options: IngestOptions = {}): Promise<IngestResult> {
  const knowledgeDir = options.knowledgeDir ?? defaultKnowledgeDir;
  const supabase = getSupabase();

  let deleted = 0;
  if (options.clearExisting !== false) {
    const { error: deleteError, count } = await supabase
      .from("documents")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      throw new Error(`Failed to clear documents: ${deleteError.message}`);
    }
    deleted = count ?? 0;
  }

  const files = await listMarkdownFiles(knowledgeDir);
  if (files.length === 0) {
    return { files: 0, chunks: 0, deleted };
  }

  const rows: Array<{
    content: string;
    metadata: { source: string; title: string; chunkIndex: number };
    embedding: number[];
  }> = [];

  for (const filePath of files) {
    const source = path.basename(filePath);
    const raw = await readFile(filePath, "utf8");
    const titleMatch = raw.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() ?? source.replace(/\.md$/, "");
    const chunks = chunkMarkdown(raw);

    if (chunks.length === 0) continue;

    const embeddings = await embedTexts(chunks);
    chunks.forEach((content, chunkIndex) => {
      rows.push({
        content,
        metadata: { source, title, chunkIndex },
        embedding: embeddings[chunkIndex]!,
      });
    });
  }

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("documents").insert(batch);
    if (error) {
      throw new Error(`Failed to insert documents: ${error.message}`);
    }
  }

  return { files: files.length, chunks: rows.length, deleted };
}
