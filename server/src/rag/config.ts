export const EMBEDDING_DIMENSIONS = 1536;

export function isRagConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function ragMatchThreshold(): number {
  const n = Number(process.env.RAG_MATCH_THRESHOLD);
  return Number.isFinite(n) ? n : 0.3;
}

/** Minimum similarity when using top-k fallback (no matches above threshold). */
export function ragFallbackMinSimilarity(): number {
  const n = Number(process.env.RAG_FALLBACK_MIN_SIMILARITY);
  return Number.isFinite(n) ? n : 0.2;
}

export function ragMatchCount(): number {
  const n = Number(process.env.RAG_MATCH_COUNT);
  return Number.isFinite(n) ? Math.min(Math.max(1, Math.floor(n)), 20) : 5;
}

export function embeddingModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
}
