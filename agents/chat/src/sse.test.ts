import { describe, it, expect } from "vitest";
import { toAgentStreamEvent } from "./sse.js";

describe("toAgentStreamEvent", () => {
  it("textDelta イベントを delta に変換する", () => {
    const ev = {
      type: "modelContentBlockDeltaEvent",
      delta: { type: "textDelta", text: "こん" },
    };
    expect(toAgentStreamEvent(ev)).toEqual({ type: "delta", text: "こん" });
  });

  it("textDelta 以外のイベントは null", () => {
    expect(toAgentStreamEvent({ type: "modelContentBlockStartEvent" })).toBeNull();
    expect(
      toAgentStreamEvent({
        type: "modelContentBlockDeltaEvent",
        delta: { type: "toolUseDelta" },
      }),
    ).toBeNull();
  });
});
