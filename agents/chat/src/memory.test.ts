import { describe, it, expect, vi } from "vitest";
import {
  buildConversationPayload,
  formatMemoryContext,
  MemoryStore,
} from "./memory.js";

describe("buildConversationPayload", () => {
  it("USER/ASSISTANT の conversational payload を作る", () => {
    expect(buildConversationPayload("質問", "回答")).toEqual([
      { conversational: { content: { text: "質問" }, role: "USER" } },
      { conversational: { content: { text: "回答" }, role: "ASSISTANT" } },
    ]);
  });
});

describe("formatMemoryContext", () => {
  it("空配列は空文字", () => {
    expect(formatMemoryContext([])).toBe("");
  });

  it("record の text を整形して含める", () => {
    const out = formatMemoryContext([
      { content: { text: "fact1" } },
      { content: { text: "fact2" } },
    ]);
    expect(out).toContain("fact1");
    expect(out).toContain("fact2");
  });

  it("text の無い record は無視する", () => {
    const out = formatMemoryContext([{ content: {} }, { content: { text: "keep" } }]);
    expect(out).toContain("keep");
    expect(out).not.toContain("undefined");
  });
});

describe("MemoryStore", () => {
  it("retrieve は RetrieveMemoryRecords を送り、整形テキストを返す", async () => {
    const send = vi.fn().mockResolvedValue({
      memoryRecordSummaries: [{ content: { text: "pref: dark mode" } }],
    });
    const store = new MemoryStore({ send } as never, "mem-1");
    const ctx = await store.retrieve("actor-1", "hello");
    expect(send).toHaveBeenCalledOnce();
    expect(ctx).toContain("pref: dark mode");
  });

  it("retrieve は記憶が無ければ空文字", async () => {
    const send = vi.fn().mockResolvedValue({ memoryRecordSummaries: [] });
    const store = new MemoryStore({ send } as never, "mem-1");
    expect(await store.retrieve("actor-1", "hi")).toBe("");
  });

  it("save は CreateEvent を送る", async () => {
    const send = vi.fn().mockResolvedValue({});
    const store = new MemoryStore({ send } as never, "mem-1");
    await store.save("actor-1", "sess-1", "質問", "回答");
    expect(send).toHaveBeenCalledOnce();
  });
});
