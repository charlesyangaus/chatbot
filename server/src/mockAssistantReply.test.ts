import { mockAssistantReply } from "./mockAssistantReply";
import type { ChatMessage } from "./types";

describe("mockAssistantReply", () => {
  it("returns a greeting when there are no user messages", () => {
    expect(mockAssistantReply([])).toMatch(/Hi! I am your assistant/);
  });

  it("responds to hello", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "Hello there" }];
    expect(mockAssistantReply(messages)).toMatch(/Hello! I am here/);
  });

  it("responds to help requests", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "I need help" }];
    expect(mockAssistantReply(messages)).toMatch(/billing basics/);
  });

  it("responds to thanks", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "Thanks!" }];
    expect(mockAssistantReply(messages)).toMatch(/You are welcome/);
  });

  it("uses the last user message for generic replies", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "first" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "What is pricing?" },
    ];
    const reply = mockAssistantReply(messages);
    expect(reply).toContain("What is pricing?");
    expect(reply).toContain("demo response");
  });

  it("truncates long messages in the echo", () => {
    const long = "x".repeat(250);
    const reply = mockAssistantReply([{ role: "user", content: long }]);
    expect(reply).toContain("…");
    expect(reply).not.toContain("x".repeat(250));
  });
});
