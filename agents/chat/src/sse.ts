import type { AgentStreamEvent } from "@evo/shared";

/** Strands のストリームイベント（必要な部分のみ緩く型付け）。 */
type StrandsStreamEvent = {
  type?: string;
  delta?: { type?: string; text?: string };
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
  if (
    event.type === "modelContentBlockDeltaEvent" &&
    event.delta?.type === "textDelta" &&
    typeof event.delta.text === "string"
  ) {
    return { type: "delta", text: event.delta.text };
  }
  return null;
}
