import { embedQuery } from "./embeddings.js";
import { ragFallbackMinSimilarity, ragMatchCount, ragMatchThreshold } from "./config.js";
import { getSupabase } from "./supabase.js";
import type { DocumentMetadata, MatchedChunk } from "./types.js";

type MatchRow = {
  id: string;
  content: string;
  metadata: DocumentMetadata | null;
  similarity: number;
};

function mapRows(rows: MatchRow[]): MatchedChunk[] {
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    metadata: row.metadata ?? { source: "unknown" },
    similarity: row.similarity,
  }));
}

async function matchWithThreshold(
  embedding: number[],
  threshold: number,
  count: number,
): Promise<MatchRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: count,
  });

  if (error) {
    throw new Error(`Supabase match_documents failed: ${error.message}`);
  }

  return (data ?? []) as MatchRow[];
}

export async function retrieveContext(query: string): Promise<MatchedChunk[]> {
  const embedding = await embedQuery(query);
  const threshold = ragMatchThreshold();
  const count = ragMatchCount();

  let rows = await matchWithThreshold(embedding, threshold, count);

  if (rows.length === 0) {
    const fallbackMin = ragFallbackMinSimilarity();
    const candidates = await matchWithThreshold(embedding, 0, count);
    rows = candidates.filter((row) => row.similarity >= fallbackMin);

    if (rows.length > 0) {
      console.log(
        `[rag] no matches above ${threshold}; using top-${rows.length} fallback (best=${rows[0]?.similarity.toFixed(3)})`,
      );
    }
  } else {
    console.log(
      `[rag] retrieved ${rows.length} chunk(s), best=${rows[0]?.similarity.toFixed(3)}`,
    );
  }

  return mapRows(rows);
}
