export type Role = "user" | "assistant";

export type Message = { id: string; role: Role; content: string };

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type HealthInfo = {
  mode: string;
  rag?: { enabled: boolean; configured?: boolean; documents?: number | null };
};

export async function fetchHealth(): Promise<HealthInfo | null> {
  try {
    const r = await fetch("/api/health");
    if (!r.ok) return null;
    return (await r.json()) as HealthInfo;
  } catch {
    return null;
  }
}

export async function sendChat(messages: Message[]): Promise<string> {
  const payload = {
    messages: messages.map(({ role, content }) => ({ role, content })),
  };
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { message?: { content?: string }; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  const text = data.message?.content;
  if (!text) throw new Error("No reply from server");
  return text;
}
