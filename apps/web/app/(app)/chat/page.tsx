"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { parseSseEvents } from "@/lib/sse-parse";

type Message = { role: "user" | "assistant"; content: string };

// 履歴読込中のスケルトン。メッセージ領域と同じバブル構造で場所を占有し、
// 読込→表示の切替で高さが変動しない（レイアウトのガタつき防止）。
const SKELETON_ROWS: Array<{ side: "left" | "right"; width: string }> = [
  { side: "right", width: "w-40" },
  { side: "left", width: "w-64" },
  { side: "right", width: "w-28" },
  { side: "left", width: "w-72" },
];

function HistorySkeleton() {
  return (
    <ul className="space-y-4" aria-hidden>
      {SKELETON_ROWS.map((row, i) => (
        <li
          key={i}
          className={row.side === "right" ? "flex justify-end" : "flex justify-start"}
        >
          <div
            className={`h-10 max-w-[80%] ${row.width} animate-pulse rounded-2xl ${
              row.side === "right" ? "bg-accent/30" : "bg-surface"
            }`}
          />
        </li>
      ))}
    </ul>
  );
}

function ChatView() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionParam = params.get("session");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const sessionId = useRef<string>(sessionParam ?? crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  // セッション切替: URL の session が変わったら履歴を読み込む（無ければ新規）。
  useEffect(() => {
    if (!sessionParam) {
      sessionId.current = crypto.randomUUID();
      setMessages([]);
      return;
    }
    sessionId.current = sessionParam;
    setLoadingHistory(true);
    fetch(`/api/history/${encodeURIComponent(sessionParam)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d: { messages?: Message[] }) => setMessages(d.messages ?? []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false));
  }, [sessionParam]);

  // 末尾（最新）へスクロール。履歴読込直後はレイアウト確定後に確実に下げる。
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight });
    });
  }, [messages, loadingHistory]);

  const appendToLast = useCallback((text: string) => {
    setMessages((m) => {
      const next = [...m];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        next[next.length - 1] = { ...last, content: last.content + text };
      }
      return next;
    });
  }, []);

  async function submit() {
    const prompt = input.trim();
    if (!prompt || busy) return;
    const isNew = !sessionParam;
    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: prompt },
      { role: "assistant", content: "" },
    ]);

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
          if (ev.type === "delta") appendToLast(ev.text);
          else if (ev.type === "error") appendToLast(`（エラー: ${ev.message}）`);
        }
      }

      // 新規会話なら URL を確定させ、サイドバーへ反映を通知する。
      if (isNew) {
        router.replace(`/chat?session=${encodeURIComponent(sessionId.current)}`);
        window.dispatchEvent(new Event("evo:history-changed"));
      }
    } catch {
      appendToLast("（通信エラー）");
    } finally {
      setBusy(false);
    }
  }

  const empty = messages.length === 0 && !loadingHistory;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <h1 className="text-sm font-semibold">
          {sessionParam ? "会話" : "新しい会話"}
        </h1>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {loadingHistory ? (
            <HistorySkeleton />
          ) : empty ? (
            <div className="grid place-items-center py-24 text-center">
              <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-accent/15 text-xl font-bold text-accent">
                e
              </span>
              <p className="text-lg font-medium">何でも聞いてください</p>
              <p className="mt-1 text-sm text-muted">
                メッセージを送ると AgentCore が応答します。
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m, i) => {
                const streaming =
                  busy && i === messages.length - 1 && m.role === "assistant";
                return (
                  <li
                    key={i}
                    className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      data-testid={m.role === "assistant" ? "assistant-msg" : "user-msg"}
                      className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-accent text-accent-fg"
                          : "bg-surface text-fg"
                      } ${streaming && m.content.length === 0 ? "evo-caret" : ""}`}
                    >
                      {m.content || (m.role === "assistant" && !streaming ? "…" : "")}
                      {streaming && m.content.length > 0 ? (
                        <span className="evo-caret" />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="mx-auto flex w-full max-w-3xl items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // IME 変換中（日本語変換の確定 Enter など）は何もしない＝誤送信防止。
              if (e.nativeEvent.isComposing) return;
              // 送信は Cmd+Enter / Alt+Enter のみ。Enter 単体は既定の改行。
              if (e.key === "Enter" && (e.metaKey || e.altKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder="メッセージを入力（⌘+Enter で送信）"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || input.trim().length === 0}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition-opacity disabled:opacity-40"
            aria-label="送信"
          >
            {busy ? "…" : "↑"}
          </button>
        </form>
        <p className="mx-auto mt-1.5 w-full max-w-3xl px-1 text-xs text-muted">
          Enter で改行 / ⌘+Enter（または Alt+Enter）で送信
        </p>
      </div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <ChatView />
    </Suspense>
  );
}
