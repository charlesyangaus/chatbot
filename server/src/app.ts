import cors from "cors";
import express from "express";
import { openAiChat } from "./openai/chat.js";
import { mockAssistantReply } from "./mockAssistantReply.js";
import { isRagConfigured } from "./rag/config.js";
import { ingestKnowledge } from "./rag/ingest.js";
import { buildRagSystemPrompt, formatRagContext } from "./rag/prompt.js";
import { retrieveContext } from "./rag/retrieve.js";
import { countDocuments } from "./rag/supabase.js";
import type { ChatMessage } from "./types.js";

function defaultSystemPrompt(): string {
  return (
    process.env.ASSISTANT_SYSTEM_PROMPT ??
    "You are a helpful, concise customer support assistant for a SaaS product. Be polite, accurate, and never invent policies. If you do not know something, say so and offer to escalate to human support."
  );
}

function lastUserMessage(messages: ChatMessage[]): string | null {
  const last = [...messages].reverse().find((m) => m.role === "user");
  return last?.content?.trim() || null;
}

async function chatWithOptionalRag(messages: ChatMessage[]): Promise<string> {
  const basePrompt = defaultSystemPrompt();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing");
  }

  if (!isRagConfigured()) {
    return openAiChat(messages, basePrompt);
  }

  const query = lastUserMessage(messages);
  if (!query) {
    return openAiChat(messages, basePrompt);
  }

  try {
    const chunks = await retrieveContext(query);
    const context = formatRagContext(chunks);
    const systemContent = buildRagSystemPrompt(basePrompt, context);
    return openAiChat(messages, systemContent);
  } catch (err) {
    console.warn("[rag] retrieval failed, falling back without context:", err);
    return openAiChat(messages, basePrompt);
  }
}

function ingestAuthorized(req: express.Request): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return true;
  const header = req.header("x-ingest-secret");
  return header === secret;
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(",") ?? ["http://localhost:5173"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "256kb" }));

  app.post("/api/chat", async (req, res) => {
    try {
      const raw = req.body?.messages;
      if (!Array.isArray(raw) || raw.length === 0) {
        res.status(400).json({ error: "messages must be a non-empty array" });
        return;
      }

      const messages: ChatMessage[] = raw
        .filter(
          (m: unknown) =>
            m &&
            typeof m === "object" &&
            "role" in m &&
            "content" in m &&
            (m as { role: string }).role !== "system",
        )
        .map((m: { role: string; content: unknown }) => ({
          role: m.role as ChatMessage["role"],
          content: String(m.content ?? "").slice(0, 8000),
        }))
        .filter((m) => m.role === "user" || m.role === "assistant");

      if (messages.length === 0) {
        res.status(400).json({ error: "no valid user/assistant messages" });
        return;
      }

      const last20 = messages.slice(-20);

      let reply: string;
      if (process.env.OPENAI_API_KEY) {
        reply = await chatWithOptionalRag(last20);
      } else {
        reply = mockAssistantReply(last20);
      }

      res.json({ message: { role: "assistant" as const, content: reply } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[/api/chat]", msg);
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/admin/ingest", async (req, res) => {
    try {
      if (!ingestAuthorized(req)) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }

      if (!isRagConfigured()) {
        res.status(503).json({
          error: "RAG not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)",
        });
        return;
      }

      if (!process.env.OPENAI_API_KEY) {
        res.status(503).json({ error: "OPENAI_API_KEY required for embeddings" });
        return;
      }

      const clearExisting = req.body?.clear !== false;
      const result = await ingestKnowledge({ clearExisting });
      res.json({ ok: true, ...result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[/api/admin/ingest]", msg);
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/health", async (_req, res) => {
    const ragConfigured = isRagConfigured();
    const ragEnabled = ragConfigured && Boolean(process.env.OPENAI_API_KEY);
    let documentCount: number | null = null;

    if (ragEnabled) {
      documentCount = await countDocuments();
    }

    res.json({
      ok: true,
      mode: process.env.OPENAI_API_KEY ? "openai" : "demo",
      rag: {
        enabled: ragEnabled,
        configured: ragConfigured,
        documents: documentCount,
      },
    });
  });

  return app;
}
