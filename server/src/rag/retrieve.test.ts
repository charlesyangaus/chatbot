import { jest } from "@jest/globals";

const embedQueryMock = jest.fn<(query: string) => Promise<number[]>>();
const rpcMock = jest.fn<
  (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
>();

jest.unstable_mockModule("./embeddings.js", () => ({
  embedQuery: embedQueryMock,
}));

jest.unstable_mockModule("./supabase.js", () => ({
  getSupabase: () => ({ rpc: rpcMock }),
}));

const { retrieveContext } = await import("./retrieve");

const sampleRow = {
  id: "doc-1",
  content: "Refunds within 14 days.",
  metadata: { source: "faq.md", title: "Refunds" },
  similarity: 0.82,
};

describe("retrieveContext", () => {
  const originalThreshold = process.env.RAG_MATCH_THRESHOLD;
  const originalCount = process.env.RAG_MATCH_COUNT;
  const originalFallback = process.env.RAG_FALLBACK_MIN_SIMILARITY;
  let logSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    delete process.env.RAG_MATCH_THRESHOLD;
    delete process.env.RAG_MATCH_COUNT;
    delete process.env.RAG_FALLBACK_MIN_SIMILARITY;

    embedQueryMock.mockReset();
    rpcMock.mockReset();
    embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3]);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    if (originalThreshold === undefined) delete process.env.RAG_MATCH_THRESHOLD;
    else process.env.RAG_MATCH_THRESHOLD = originalThreshold;

    if (originalCount === undefined) delete process.env.RAG_MATCH_COUNT;
    else process.env.RAG_MATCH_COUNT = originalCount;

    if (originalFallback === undefined) delete process.env.RAG_FALLBACK_MIN_SIMILARITY;
    else process.env.RAG_FALLBACK_MIN_SIMILARITY = originalFallback;
  });

  it("returns matched chunks when similarity is above the threshold", async () => {
    rpcMock.mockResolvedValueOnce({ data: [sampleRow], error: null });

    const chunks = await retrieveContext("refund policy");

    expect(embedQueryMock).toHaveBeenCalledWith("refund policy");
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("match_documents", {
      query_embedding: [0.1, 0.2, 0.3],
      match_threshold: 0.3,
      match_count: 5,
    });
    expect(chunks).toEqual([
      {
        id: "doc-1",
        content: "Refunds within 14 days.",
        metadata: { source: "faq.md", title: "Refunds" },
        similarity: 0.82,
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[rag] retrieved 1 chunk(s), best=0.820"),
    );
  });

  it("uses fallback matches when nothing clears the primary threshold", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          { ...sampleRow, similarity: 0.25 },
          { ...sampleRow, id: "doc-2", similarity: 0.15 },
        ],
        error: null,
      });

    const chunks = await retrieveContext("billing");

    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[1]).toEqual([
      "match_documents",
      {
        query_embedding: [0.1, 0.2, 0.3],
        match_threshold: 0,
        match_count: 5,
      },
    ]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.id).toBe("doc-1");
    expect(chunks[0]?.similarity).toBe(0.25);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("[rag] no matches above 0.3; using top-1 fallback"),
    );
  });

  it("returns an empty array when fallback candidates are below the minimum", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ ...sampleRow, similarity: 0.1 }],
        error: null,
      });

    const chunks = await retrieveContext("unknown topic");

    expect(chunks).toEqual([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("defaults missing metadata to source unknown", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ ...sampleRow, metadata: null }],
      error: null,
    });

    const chunks = await retrieveContext("refunds");

    expect(chunks[0]?.metadata).toEqual({ source: "unknown" });
  });

  it("throws when Supabase match_documents fails", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "rpc unavailable" },
    });

    await expect(retrieveContext("help")).rejects.toThrow(
      "Supabase match_documents failed: rpc unavailable",
    );
  });

  it("respects RAG env overrides for threshold, count, and fallback", async () => {
    process.env.RAG_MATCH_THRESHOLD = "0.6";
    process.env.RAG_MATCH_COUNT = "3";
    process.env.RAG_FALLBACK_MIN_SIMILARITY = "0.4";

    rpcMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          { ...sampleRow, similarity: 0.45 },
          { ...sampleRow, id: "doc-2", similarity: 0.35 },
        ],
        error: null,
      });

    const chunks = await retrieveContext("plans");

    expect(rpcMock.mock.calls[0]?.[1]).toMatchObject({
      match_threshold: 0.6,
      match_count: 3,
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.similarity).toBe(0.45);
  });
});
