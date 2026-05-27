import type { ChatMessage } from "../types.js";

export async function openAiChat(
  messages: ChatMessage[],
  systemContent?: string,
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const system: ChatMessage = {
    role: "system",
    content:
      systemContent ??
      process.env.ASSISTANT_SYSTEM_PROMPT ??
      "You are a helpful, concise customer support assistant for a SaaS product. Be polite, accurate, and never invent policies. If you do not know something, say so and offer to escalate to human support.",
  };

  const body = {
    model,
    messages: [system, ...messages.filter((m) => m.role !== "system")],
    temperature: 0.4,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty completion from OpenAI");
  return text;
}
