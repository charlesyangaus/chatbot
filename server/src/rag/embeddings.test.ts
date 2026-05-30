import { jest } from "@jest/globals";
import { EMBEDDING_DIMENSIONS } from "./config";

const mockFetch = jest.fn<typeof fetch>();
globalThis.fetch = mockFetch as typeof fetch;

const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_EMBEDDING_MODEL;

function mockFetchResponse(body: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response);
}

describe("embedTexts", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.OPENAI_EMBEDDING_MODEL;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;

    if (originalModel === undefined) delete process.env.OPENAI_EMBEDDING_MODEL;
    else process.env.OPENAI_EMBEDDING_MODEL = originalModel;
  });

  it("returns an empty array when given no texts", async () => {
    const { embedTexts } = await import("./embeddings.js");

    await expect(embedTexts([])).resolves.toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns embeddings for given input", async () => {
    mockFetchResponse({
      data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
    });

    const { embedTexts } = await import("./embeddings.js");
    const input = ["Sample text 1", "Sample text 2"];
    const result = await embedTexts(input);

    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(result).toHaveLength(input.length);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input,
          dimensions: EMBEDDING_DIMENSIONS,
        }),
      }),
    );
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const { embedTexts } = await import("./embeddings.js");

    await expect(embedTexts(["hello"])).rejects.toThrow(
      "OPENAI_API_KEY missing (required for embeddings)",
    );
  });

  it("throws when the OpenAI API responds with an error", async () => {
    mockFetchResponse({ error: "rate limited" }, false, 429);

    const { embedTexts } = await import("./embeddings.js");

    await expect(embedTexts(["hello"])).rejects.toThrow(
      "OpenAI embeddings error 429:",
    );
  });

  it("throws when the response has fewer vectors than inputs", async () => {
    mockFetchResponse({ data: [{ embedding: [0.1] }] });

    const { embedTexts } = await import("./embeddings.js");

    await expect(embedTexts(["a", "b"])).rejects.toThrow(
      "Unexpected embeddings response from OpenAI",
    );
  });
});

describe("embedQuery", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("returns the first embedding vector for a single query", async () => {
    mockFetchResponse({ data: [{ embedding: [0.5, 0.6, 0.7] }] });

    const { embedQuery } = await import("./embeddings.js");
    await expect(embedQuery("billing question")).resolves.toEqual([0.5, 0.6, 0.7]);
  });
});
