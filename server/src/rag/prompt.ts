import type { MatchedChunk } from "./types.js";

export function formatRagContext(chunks: MatchedChunk[]): string {
  if (chunks.length === 0) return "";

  return chunks
    .map((chunk, i) => {
      const source = chunk.metadata.source ?? "unknown";
      const title = chunk.metadata.title ? ` — ${chunk.metadata.title}` : "";
      const score = chunk.similarity.toFixed(3);
      return `[${i + 1}] (${source}${title}, score ${score})\n${chunk.content}`;
    })
    .join("\n\n");
}

export function buildRagSystemPrompt(basePrompt: string, context: string): string {
  if (!context.trim()) {
    return `${basePrompt}

No relevant knowledge base excerpts were found for this question. If you cannot answer from general support guidance, say you are not sure and offer to escalate to human support.`;
  }

  return `${basePrompt}

Answer using the knowledge base excerpts below. If the answer is not supported by the excerpts, say you do not know and offer to escalate to human support. Do not invent policies, prices, or features.

Knowledge base excerpts:
---
${context}
---`;
}
