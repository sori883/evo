import { agentStreamEventSchema, type AgentStreamEvent } from "@evo/shared";

/**
 * SSE のテキストチャンクから agentStreamEvent を取り出す。
 * 不完全な末尾ブロックは rest として次回に持ち越す。
 */
export function parseSseEvents(raw: string): {
  events: AgentStreamEvent[];
  rest: string;
} {
  const parts = raw.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: AgentStreamEvent[] = [];

  for (const block of parts) {
    const dataLine = block
      .split("\n")
      .find((line) => line.startsWith("data:"));
    if (!dataLine) continue;
    const json = dataLine.slice("data:".length).trim();
    if (!json) continue;
    try {
      const parsed = agentStreamEventSchema.safeParse(JSON.parse(json));
      if (parsed.success) {
        events.push(parsed.data);
      }
    } catch {
      // 不正/不完全な JSON は無視
    }
  }

  return { events, rest };
}
