import { FormEvent, useEffect, useRef, useState } from "react";
import { fetchHealth, sendChat, uid, type Message } from "./api/chat";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      content:
        "Hello! I am your virtual assistant. Ask me anything about our product, billing, or getting started.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverMode, setServerMode] = useState<string | null>(null);
  const [ragEnabled, setRagEnabled] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchHealth().then((h) => {
      if (h?.mode) setServerMode(h.mode);
      setRagEnabled(Boolean(h?.rag?.enabled));
    });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function submitChat() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: uid(), role: "user", content: text };
    setInput("");
    setError(null);
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const reply = await sendChat(nextHistory);
      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submitChat();
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="brand">
          <span className="logo" aria-hidden />
          <div>
            <h1 className="title">Support</h1>
            <p className="subtitle">We typically reply in seconds</p>
          </div>
        </div>
        <div className="badges">
          {serverMode && (
            <span className={`badge ${serverMode === "openai" ? "badge-live" : "badge-demo"}`}>
              {serverMode === "openai" ? "AI enabled" : "Demo mode"}
            </span>
          )}
          {ragEnabled && <span className="badge badge-rag">RAG</span>}
        </div>
      </header>

      <main className="chat-shell">
        <div className="messages" ref={listRef} role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((m) => (
            <div key={m.id} className={`row ${m.role === "user" ? "row-user" : "row-assistant"}`}>
              <div className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-assistant"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="row row-assistant">
              <div className="bubble bubble-assistant typing" aria-busy>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="banner-error" role="alert">
            {error}
          </div>
        )}

        <form className="composer" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="msg">
            Message
          </label>
          <textarea
            id="msg"
            className="input"
            rows={1}
            placeholder="Type your message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitChat();
              }
            }}
            disabled={loading}
          />
          <button type="submit" className="send" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
