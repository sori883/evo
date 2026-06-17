import type { AgentStreamEvent } from "@evo/shared";

/**
 * Strands(@strands-agents/sdk v1.6) の stream イベント（必要部分のみ緩く型付け）。
 * agent.stream() はトップレベルに hook event を yield する。テキスト差分は
 * `modelStreamUpdateEvent` の内側 `event`(ModelContentBlockDeltaEvent) の
 * `delta`(TextDelta) に入る。
 */
type StrandsStreamEvent = {
  type?: string;
  event?: {
    type?: string;
    delta?: { type?: string; text?: string };
  };
};

/** delta イベントのみを表す型（agentStreamEvent の delta メンバ）。 */
type DeltaEvent = Extract<AgentStreamEvent, { type: "delta" }>;

/**
 * Strands の stream イベントを、BFF/フロントへ流す agentStreamEvent(delta) に変換する。
 * テキスト差分(textDelta)以外は null を返す（送出対象外）。
 */
export function toAgentStreamEvent(
  event: StrandsStreamEvent,
): DeltaEvent | null {
  if (event.type !== "modelStreamUpdateEvent") {
    return null;
  }
  const inner = event.event;
  if (
    inner?.type === "modelContentBlockDeltaEvent" &&
    inner.delta?.type === "textDelta" &&
    typeof inner.delta.text === "string"
  ) {
    return { type: "delta", text: inner.delta.text };
  }
  return null;
}
