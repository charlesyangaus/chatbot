import "dotenv/config";
import { embedQuery } from "../src/rag/embeddings.js";
import { retrieveContext } from "../src/rag/retrieve.js";
import { getSupabase } from "../src/rag/supabase.js";
import { ragMatchThreshold } from "../src/rag/config.js";

async function main() {
  const q = process.argv.slice(2).join(" ") || "may i know the plan price?";
  console.log("Query:", q);
  console.log("Threshold:", ragMatchThreshold());

  const emb = await embedQuery(q);
  const sb = getSupabase();

  const { data, error } = await sb.rpc("match_documents", {
    query_embedding: emb,
    match_threshold: 0,
    match_count: 5,
  });

  if (error) {
    console.error("RPC error:", error.message);
    process.exit(1);
  }

  console.log("\nTop matches (threshold 0):");
  for (const row of data ?? []) {
    console.log(`- similarity=${row.similarity?.toFixed(4)} source=${row.metadata?.source}`);
  }

  const chunks = await retrieveContext(q);
  console.log(`\nretrieveContext returned ${chunks.length} chunk(s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
