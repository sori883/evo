import { describe, it, expect } from "vitest";
import { toAgentStreamEvent } from "./sse.js";

describe("toAgentStreamEvent", () => {
  it("modelStreamUpdateEvent 内の textDelta を delta に変換する", () => {
    const ev = {
      type: "modelStreamUpdateEvent",
      event: {
        type: "modelContentBlockDeltaEvent",
        delta: { type: "textDelta", text: "こん" },
      },
    };
    expect(toAgentStreamEvent(ev)).toEqual({ type: "delta", text: "こん" });
  });

  it("textDelta 以外の内側イベントは null", () => {
    expect(
      toAgentStreamEvent({
        type: "modelStreamUpdateEvent",
        event: {
          type: "modelContentBlockDeltaEvent",
          delta: { type: "toolUseDelta" },
        },
      }),
    ).toBeNull();
  });

  it("modelStreamUpdateEvent 以外のトップレベルイベントは null", () => {
    expect(toAgentStreamEvent({ type: "contentBlockEvent" })).toBeNull();
    expect(
      toAgentStreamEvent({
        // 旧実装が誤検知していた「内側 type を外側に持つ」形は対象外
        type: "modelContentBlockDeltaEvent",
        delta: { type: "textDelta", text: "x" },
      } as unknown as Parameters<typeof toAgentStreamEvent>[0]),
    ).toBeNull();
  });
});
