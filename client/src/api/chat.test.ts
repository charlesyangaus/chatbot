import { fetchHealth, sendChat, uid, type Message } from "./chat";

describe("uid", () => {
  it("returns unique string ids", () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^\d+-[a-z0-9]+$/);
  });
});

describe("fetchHealth", () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  afterEach(() => {
    mockFetch.mockReset();
  });

  it("returns health payload when ok", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mode: "demo" }),
    } as Response);

    await expect(fetchHealth()).resolves.toEqual({ mode: "demo" });
    expect(mockFetch).toHaveBeenCalledWith("/api/health");
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false } as Response);
    await expect(fetchHealth()).resolves.toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));
    await expect(fetchHealth()).resolves.toBeNull();
  });
});

describe("sendChat", () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  afterEach(() => {
    mockFetch.mockReset();
  });

  const messages: Message[] = [
    { id: "1", role: "user", content: "Hi" },
  ];

  it("returns assistant content on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "Hello!" } }),
    } as Response);

    await expect(sendChat(messages)).resolves.toBe("Hello!");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: "Hi" }] }),
      }),
    );
  });

  it("throws server error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "bad request" }),
    } as Response);

    await expect(sendChat(messages)).rejects.toThrow("bad request");
  });

  it("throws when reply content is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: {} }),
    } as Response);

    await expect(sendChat(messages)).rejects.toThrow("No reply from server");
  });
});
