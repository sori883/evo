import { describe, it, expect } from "vitest";
import { parseSseEvents } from "./sse-parse";

describe("parseSseEvents", () => {
  it("完全な複数イベントをパースする", () => {
    const raw =
      'event: message\ndata: {"type":"delta","text":"こん"}\n\n' +
      'event: message\ndata: {"type":"delta","text":"にちは"}\n\n';
    const { events, rest } = parseSseEvents(raw);
    expect(events).toEqual([
      { type: "delta", text: "こん" },
      { type: "delta", text: "にちは" },
    ]);
    expect(rest).toBe("");
  });

  it("不完全な末尾ブロックは rest に残す", () => {
    const raw = 'data: {"type":"delta","text":"a"}\n\ndata: {"type":"de';
    const { events, rest } = parseSseEvents(raw);
    expect(events).toEqual([{ type: "delta", text: "a" }]);
    expect(rest).toContain('{"type":"de');
  });

  it("done イベントもパースする", () => {
    const raw = 'event: done\ndata: {"type":"done","sessionId":"s1"}\n\n';
    const { events } = parseSseEvents(raw);
    expect(events).toEqual([{ type: "done", sessionId: "s1" }]);
  });

  it("data 行の無いブロックは無視する", () => {
    const raw = ": comment\n\ndata: {\"type\":\"delta\",\"text\":\"x\"}\n\n";
    const { events } = parseSseEvents(raw);
    expect(events).toEqual([{ type: "delta", text: "x" }]);
  });
});
