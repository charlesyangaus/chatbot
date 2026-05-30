import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { openAiChat } from "./chat.js";
import type { ChatMessage } from "../types.js";

const mockFetch = jest.fn<typeof fetch>();

const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_MODEL;

function mockFetchJson(body: unknown, ok = true, status = 200, errText = "") {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    text: async () => errText,
    json: async () => body,
  } as Response);
}

describe("openAiChat", () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch as typeof fetch;
    mockFetch.mockReset();
    process.env.OPENAI_API_KEY = "test_api_key";
    process.env.OPENAI_MODEL = "gpt-4o-mini";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;

    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    await expect(openAiChat([{ role: "user", content: "Hello!" }])).rejects.toThrow(
      "OPENAI_API_KEY missing",
    );
  });

  it("returns a response from OpenAI API", async () => {
    mockFetchJson({
      choices: [{ message: { content: "Hello, how can I help you?" } }],
    });

    const messages: ChatMessage[] = [{ role: "user", content: "Hello!" }];
    const response = await openAiChat(messages);

    expect(response).toBe("Hello, how can I help you?");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer test_api_key",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("throws when the OpenAI API responds with an error", async () => {
    mockFetchJson({}, false, 500, "Internal Server Error");

    const messages: ChatMessage[] = [{ role: "user", content: "Hello!" }];
    await expect(openAiChat(messages)).rejects.toThrow(
      "OpenAI error 500: Internal Server Error",
    );
  });

  it("throws when the completion content is empty", async () => {
    mockFetchJson({ choices: [{}] });

    const messages: ChatMessage[] = [{ role: "user", content: "Hello!" }];
    await expect(openAiChat(messages)).rejects.toThrow("Empty completion from OpenAI");
  });

  it("throws when message content is missing", async () => {
    mockFetchJson({ choices: [{ message: {} }] });

    const messages: ChatMessage[] = [{ role: "user", content: "Hello!" }];
    await expect(openAiChat(messages)).rejects.toThrow("Empty completion from OpenAI");
  });
});
