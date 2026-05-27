import "dotenv/config";
import { isRagConfigured } from "../src/rag/config.js";
import { ingestKnowledge } from "../src/rag/ingest.js";

async function main() {
  if (!isRagConfigured()) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY in server/.env (required for embeddings)");
    process.exit(1);
  }

  console.log("Ingesting knowledge base into Supabase...");
  const result = await ingestKnowledge({ clearExisting: true });
  console.log(
    `Done. Files: ${result.files}, chunks: ${result.chunks}, removed: ${result.deleted}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
