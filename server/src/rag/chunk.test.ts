import { chunkMarkdown, chunkText } from "./chunk";

describe("chunkText", () => {
  it("splits long text into multiple chunks", () => {
    const text = "a".repeat(2000);
    const chunks = chunkText(text, { maxChars: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 500)).toBe(true);
  });

  it("keeps short paragraphs as one chunk", () => {
    const text = "# Title\n\nShort paragraph.\n\nAnother one.";
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("splits markdown on h2 sections", () => {
    const text = "# Billing\n\n## Plans\n\n$9 plan.\n\n## Refunds\n\n14 days.";
    const chunks = chunkMarkdown(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});
