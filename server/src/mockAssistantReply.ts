import type { ChatMessage } from "./types.js";

export function mockAssistantReply(messages: ChatMessage[]): string {
  const last = messages.filter((m) => m.role === "user").pop()?.content?.trim();
  if (!last) {
    return "Hi! I am your assistant. How can I help you today?";
  }
  const lower = last.toLowerCase();
  if (/(hello|hi|hey)\b/.test(lower)) {
    return "Hello! I am here to answer questions about our products and your account. What would you like to know?";
  }
  if (/(help|support)/.test(lower)) {
    return "I can help with common questions, billing basics, and how to use our service. For sensitive account changes, I will guide you to our secure support form.";
  }
  if (/(thank|thanks)/.test(lower)) {
    return "You are welcome. Is there anything else I can help with?";
  }
  return `Thanks for your message. This is a demo response (no API key configured).\n\nYou asked: "${last.slice(0, 200)}${last.length > 200 ? "…" : ""}"\n\nTo enable real AI replies, set OPENAI_API_KEY on the server and restart.`;
}
