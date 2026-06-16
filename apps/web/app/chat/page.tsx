"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parseSseEvents } from "@/lib/sse-parse";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionId = useRef<string>(crypto.randomUUID());

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: prompt }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sessionId: sessionId.current }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !res.body) {
        appendToLast("（エラーが発生しました）");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseEvents(buffer);
        buffer = rest;
        for (const ev of events) {
          if (ev.type === "delta") {
            appendToLast(ev.text);
          } else if (ev.type === "error") {
            appendToLast(`（エラー: ${ev.message}）`);
          }
        }
      }
    } catch {
      appendToLast("（通信エラー）");
    } finally {
      setBusy(false);
    }
  }

  function appendToLast(text: string) {
    setMessages((m) => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        next[next.length - 1] = { ...last, content: last.content + text };
      }
      return next;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 18 }}>evo chat</h1>
        <button onClick={logout} style={{ background: "none", border: "1px solid #333", color: "#e8e8ea", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
          ログアウト
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", display: "grid", gap: 12, padding: "12px 0" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            data-testid={m.role === "assistant" ? "assistant-msg" : "user-msg"}
            style={{
              justifySelf: m.role === "user" ? "end" : "start",
              maxWidth: "80%",
              background: m.role === "user" ? "#5b8cff" : "#16161c",
              color: m.role === "user" ? "#fff" : "#e8e8ea",
              padding: "8px 12px",
              borderRadius: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content || "…"}
          </div>
        ))}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: 8, paddingTop: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #333", background: "#16161c", color: "#e8e8ea" }}
        />
        <button type="submit" disabled={busy} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#5b8cff", color: "#fff", cursor: "pointer" }}>
          送信
        </button>
      </form>
    </main>
  );
}
