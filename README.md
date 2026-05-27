# Chatbot (React + Node + Supabase RAG)

A simple full‑stack chatbot:

- **Client**: React + Vite (TypeScript)
- **Server**: Node + Express (TypeScript)
- **LLM**: OpenAI chat completions
- **RAG**: Supabase Postgres + pgvector (documents in `server/knowledge/*.md`)

The client talks to the server via `/api/*`. In **demo mode** (no OpenAI key), the server returns rule‑based mock replies. With OpenAI + Supabase configured, it uses **retrieval‑augmented generation** to answer from your knowledge base.

---

## 1. Prerequisites

- Node 20+ (or 22+)
- npm
- An OpenAI API key
- A Supabase project with pgvector enabled  
  (Project URL will look like `https://hiqgklfgtomxackayukq.supabase.co`)

---

## 2. Install dependencies

From the repo root:

```bash
npm install
```

This installs deps for both `server` and `client` workspaces.

---

## 3. Environment configuration

### 3.1 Server (`server/.env`)

Start from the example:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

SUPABASE_URL=https://hiqgklfgtomxackayukq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

RAG_MATCH_THRESHOLD=0.3
RAG_MATCH_COUNT=5
RAG_FALLBACK_MIN_SIMILARITY=0.2

# Optional: protects POST /api/admin/ingest
INGEST_SECRET=some-long-random-string
```

> **Important**: `SUPABASE_SERVICE_ROLE_KEY` is sensitive. Never expose it to the client or commit it.

### 3.2 Client (`client/.env`)

Example:

```bash
cp client/.env.example client/.env
```

By default the client dev server runs on `5173` and proxies `/api` to `http://localhost:3001`.

---

## 4. Supabase pgvector migration

Run the SQL in `supabase/migrations/001_rag.sql`:

1. Go to Supabase Dashboard → your project → **SQL Editor**
2. Paste the contents of `supabase/migrations/001_rag.sql`
3. Run it

This creates:

- `documents` table (text + `vector(1536)` embedding)
- `match_documents(query_embedding, match_threshold, match_count)` RPC

---

## 5. Ingest knowledge for RAG

Knowledge lives in Markdown under:

- `server/knowledge/billing.md`
- `server/knowledge/faq.md`
- `server/knowledge/getting-started.md`

You can edit these or add new `.md` files.

Then ingest:

```bash
npm run ingest -w server
```

or, with the server running:

```bash
curl -X POST http://localhost:3001/api/admin/ingest \
  -H "Content-Type: application/json" \
  -H "X-Ingest-Secret: $INGEST_SECRET"
```

---

## 6. Running the app in development

From the repo root:

```bash
# start server + client together
npm run dev
```

This runs:

- **server**: `tsx watch src/index.ts` on `http://localhost:3001`
- **client**: Vite dev on `http://localhost:5173`

Open:

- `http://localhost:5173` — chat UI

Health check:

```bash
curl http://localhost:3001/api/health
```

Example response:

```json
{
  "ok": true,
  "mode": "openai",
  "rag": { "enabled": true, "configured": true, "documents": 18 }
}
```

If `OPENAI_API_KEY` is not set, `mode` will be `"demo"` and the server uses mock replies (no RAG).

---

## 7. Tests

Run server + client tests:

```bash
npm test
```

- Server: Jest + ts-jest + Supertest
- Client: Jest + React Testing Library

---

## 8. Debugging the server (optional)

There is a VS Code / Cursor debug config in `.vscode/launch.json`:

- **Debug server** — builds the server and runs `dist/index.js` under Node’s inspector

You can set breakpoints in `server/src/*.ts` and use the chat UI or curl to hit `/api/chat`.

---

## 9. Docker (optional)

`docker-compose.yml` defines a production-style stack:

- `client` — built React app served by nginx
- `server` — Node API

Build and run:

```bash
docker compose up --build
```

The nginx container serves the SPA and proxies `/api` to the API server.

---

## 10. RAG behavior overview

When `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are set and documents are ingested:

1. User sends a question.
2. Server embeds the **last user message** with OpenAI embeddings.
3. Calls Supabase `match_documents` to fetch relevant chunks from `documents`.
4. Builds a system prompt including those chunks.
5. Calls OpenAI chat completions.

If retrieval fails or returns nothing above the minimum similarity, the server falls back to a plain LLM call (no context).

