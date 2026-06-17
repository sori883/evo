import type { AgentStreamEvent, InvokeRequest } from "@evo/shared";
import { toAgentStreamEvent } from "./sse.js";

/** SSE として yield する 1 イベント。 */
export type SseChunk = { event: string; data: AgentStreamEvent };

/** チャット処理の協調オブジェクト（テストで差し替え可能にするため DI）。 */
export type ChatDeps = {
  /** リクエストヘッダから actorId(= Cognito sub) を得る（JWT 検証含む）。 */
  getActorId(headers: Record<string, string | undefined>): Promise<string>;
  /** actorId に紐づく関連記憶を取得（systemPrompt 注入用テキスト）。 */
  retrieve(actorId: string, prompt: string): Promise<string>;
  /** モデルのストリーム（Strands の生イベント列）。 */
  stream(memoryContext: string, prompt: string): AsyncIterable<unknown>;
  /** 1 ターンの会話を記憶に保存。 */
  save(
    actorId: string,
    sessionId: string,
    user: string,
    assistant: string,
  ): Promise<void>;
};

/**
 * チャット 1 リクエストを処理し SSE イベントを yield する。
 * 例外は runtime に伝播させず、型付き error イベント({type:"error"})として送出する
 * （クライアントの SSE パーサが認識して表示できる）。
 */
export async function* runChat(
  deps: ChatDeps,
  input: InvokeRequest,
  headers: Record<string, string | undefined>,
): AsyncGenerator<SseChunk> {
  try {
    const actorId = await deps.getActorId(headers);
    const memoryContext = await deps.retrieve(actorId, input.prompt);

    let assistant = "";
    for await (const streamEvent of deps.stream(memoryContext, input.prompt)) {
      const out = toAgentStreamEvent(streamEvent as never);
      if (out) {
        assistant += out.text;
        yield { event: "message", data: out };
      }
    }

    // CreateEvent は空テキストを拒否するため、応答が空なら保存しない。
    if (assistant.length > 0) {
      await deps.save(actorId, input.sessionId, input.prompt, assistant);
    }
    yield {
      event: "done",
      data: { type: "done", sessionId: input.sessionId },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "内部エラーが発生しました";
    yield { event: "message", data: { type: "error", message } };
  }
}
