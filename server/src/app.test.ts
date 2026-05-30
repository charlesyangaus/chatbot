import { afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";

const countDocumentsMock = jest.fn<() => Promise<number | null>>();

jest.unstable_mockModule("./rag/supabase.js", () => ({
  countDocuments: () => countDocumentsMock(),
  getSupabase: jest.fn(),
}));

const { createApp } = await import("./app.js");

function restoreEnv(
  key: string,
  original: string | undefined,
): void {
  if (original === undefined) delete process.env[key];
  else process.env[key] = original;
}

describe("createApp", () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    restoreEnv("OPENAI_API_KEY", originalKey);
    restoreEnv("SUPABASE_URL", originalSupabaseUrl);
    restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalSupabaseKey);
    countDocumentsMock.mockReset();
  });

  it("GET /api/health reports demo mode without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

    const app = createApp();
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      mode: "demo",
      rag: { enabled: false, configured: true, documents: null },
    });
    expect(countDocumentsMock).not.toHaveBeenCalled();
  });

  it("GET /api/health reports openai mode when API key is set", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    countDocumentsMock.mockResolvedValue(18);

    const app = createApp();
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      mode: "openai",
      rag: { enabled: true, configured: true, documents: 18 },
    });
    expect(countDocumentsMock).toHaveBeenCalled();
  });

  it("POST /api/chat rejects empty messages", async () => {
    delete process.env.OPENAI_API_KEY;
    const app = createApp();

    const res = await request(app).post("/api/chat").send({ messages: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non-empty array/);
  });

  it("POST /api/chat returns a demo assistant reply", async () => {
    delete process.env.OPENAI_API_KEY;
    const app = createApp();

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "user", content: "Hello" }] });

    expect(res.status).toBe(200);
    expect(res.body.message.role).toBe("assistant");
    expect(res.body.message.content).toMatch(/Hello! I am here/);
  });

  it("POST /api/chat ignores system messages", async () => {
    delete process.env.OPENAI_API_KEY;
    const app = createApp();

    const res = await request(app)
      .post("/api/chat")
      .send({
        messages: [
          { role: "system", content: "secret" },
          { role: "user", content: "Thanks" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.message.content).toMatch(/You are welcome/);
  });
});
