import request from "supertest";
import { createApp } from "./app";

describe("createApp", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it("GET /api/health reports demo mode without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const app = createApp();

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      mode: "demo",
      rag: { enabled: false, configured: false, documents: null },
    });
  });

  it("GET /api/health reports openai mode when API key is set", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const app = createApp();

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      mode: "openai",
      rag: { enabled: false, configured: false, documents: null },
    });
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
