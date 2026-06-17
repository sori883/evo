import { describe, it, expect } from "vitest";
import { type ChatDeps, type SseChunk, runChat } from "./handler.js";

/** Strands の textDelta イベント（toAgentStreamEvent が認識する形）。 */
function textDelta(text: string) {
  return {
    type: "modelStreamUpdateEvent",
    event: {
      type: "modelContentBlockDeltaEvent",
      delta: { type: "textDelta", text },
    },
  };
}

async function collect(gen: AsyncGenerator<SseChunk>): Promise<SseChunk[]> {
  const out: SseChunk[] = [];
  for await (const c of gen) out.push(c);
  return out;
}

const input = { prompt: "こんにちは", sessionId: "sess-1" };

describe("runChat", () => {
  it("正常時: delta を流し save して done を返す", async () => {
    const saved: unknown[] = [];
    const deps: ChatDeps = {
      getActorId: async () => "actor-1",
      retrieve: async () => "",
      stream: async function* () {
        yield textDelta("やあ");
        yield textDelta("ソリさん");
      },
      save: async (a, s, u, ass) => {
        saved.push({ a, s, u, ass });
      },
    };

    const events = await collect(runChat(deps, input, {}));
    expect(events).toEqual([
      { event: "message", data: { type: "delta", text: "やあ" } },
      { event: "message", data: { type: "delta", text: "ソリさん" } },
      { event: "done", data: { type: "done", sessionId: "sess-1" } },
    ]);
    expect(saved).toEqual([
      { a: "actor-1", s: "sess-1", u: "こんにちは", ass: "やあソリさん" },
    ]);
  });

  it("応答が空なら save を呼ばない", async () => {
    let saveCalled = false;
    const deps: ChatDeps = {
      getActorId: async () => "actor-1",
      retrieve: async () => "",
      stream: async function* () {},
      save: async () => {
        saveCalled = true;
      },
    };
    const events = await collect(runChat(deps, input, {}));
    expect(saveCalled).toBe(false);
    expect(events).toEqual([
      { event: "done", data: { type: "done", sessionId: "sess-1" } },
    ]);
  });

  it("例外時: 伝播させず type:error を yield する", async () => {
    const deps: ChatDeps = {
      getActorId: async () => {
        throw new Error("認証エラー");
      },
      retrieve: async () => "",
      stream: async function* () {},
      save: async () => {},
    };
    const events = await collect(runChat(deps, input, {}));
    expect(events).toEqual([
      { event: "message", data: { type: "error", message: "認証エラー" } },
    ]);
  });

  it("ストリーム途中の例外でも error イベントを返す", async () => {
    const deps: ChatDeps = {
      getActorId: async () => "actor-1",
      retrieve: async () => "",
      stream: async function* () {
        yield textDelta("途中");
        throw new Error("stream 失敗");
      },
      save: async () => {},
    };
    const events = await collect(runChat(deps, input, {}));
    expect(events).toEqual([
      { event: "message", data: { type: "delta", text: "途中" } },
      { event: "message", data: { type: "error", message: "stream 失敗" } },
    ]);
  });
});
