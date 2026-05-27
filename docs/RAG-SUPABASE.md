# RAG with Supabase (pgvector)

This project stores knowledge chunks in **Supabase Postgres** with **pgvector**, then retrieves relevant chunks at chat time.

## 1. Run the SQL migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste and run `supabase/migrations/001_rag.sql`.

## 2. Configure server environment

In `server/.env`:

```env
SUPABASE_URL=https://hiqgklfgtomxackayukq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

OPENAI_API_KEY=your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# optional
RAG_MATCH_THRESHOLD=0.5
RAG_MATCH_COUNT=5
INGEST_SECRET=choose-a-secret
```

Get keys from **Project Settings → API**:
- **URL** → `SUPABASE_URL`
- **service_role** (secret) → `SUPABASE_SERVICE_ROLE_KEY` — server only, never expose to the browser.

## 3. Ingest knowledge

From repo root:

```bash
npm run ingest -w server
```

This reads `server/knowledge/*.md`, chunks text, embeds with OpenAI, and upserts into `documents`.

Or via HTTP (with server running):

```bash
curl -X POST http://localhost:3001/api/admin/ingest \
  -H "Content-Type: application/json" \
  -H "X-Ingest-Secret: your-secret-if-set"
```

## 4. Verify

```bash
curl http://localhost:3001/api/health
```

Expect:

```json
{
  "ok": true,
  "mode": "openai",
  "rag": { "enabled": true, "configured": true, "documents": 12 }
}
```

## 5. Chat

Ask questions like “How do refunds work?” or “How do I reset my password?” — answers should use `server/knowledge/` content.

## Customize knowledge

Add or edit Markdown files under `server/knowledge/`, then run ingest again.
