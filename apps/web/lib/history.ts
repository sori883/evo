export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

/** AgentCore Memory の ListEvents が返す 1 イベント（必要部分のみ）。 */
export type MemoryEvent = {
  payload?: Array<{
    conversational?: {
      role?: string;
      content?: { text?: string };
    };
  }>;
};

/**
 * Memory の ListEvents 結果を表示用メッセージ配列（時系列昇順=古い→新しい）に変換する。
 * ListEvents は新しい順で返すため events を反転してから整形する。
 * USER/ASSISTANT の非空テキストのみ採用する。
 */
export function eventsToMessages(events: MemoryEvent[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const event of [...events].reverse()) {
    for (const item of event.payload ?? []) {
      const conv = item.conversational;
      const text = conv?.content?.text;
      if (typeof text !== "string" || text.length === 0) {
        continue;
      }
      if (conv?.role === "USER") {
        messages.push({ role: "user", content: text });
      } else if (conv?.role === "ASSISTANT") {
        messages.push({ role: "assistant", content: text });
      }
    }
  }
  return messages;
}

/** セッションのサイドバー表示用タイトル（最初のユーザー発話を要約）。 */
export function deriveSessionTitle(
  messages: ChatMessage[],
  fallback = "新しい会話",
): string {
  const firstUser = messages.find((m) => m.role === "user");
  const base = firstUser?.content ?? messages[0]?.content ?? "";
  const trimmed = base.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  return trimmed.length > 30 ? `${trimmed.slice(0, 30)}…` : trimmed;
}
