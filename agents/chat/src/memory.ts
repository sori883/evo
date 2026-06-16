import {
  type BedrockAgentCoreClient,
  CreateEventCommand,
  RetrieveMemoryRecordsCommand,
} from "@aws-sdk/client-bedrock-agentcore";

/** CreateEvent に渡す会話ペイロード。 */
export type ConversationPayload = Array<{
  conversational: { content: { text: string }; role: "USER" | "ASSISTANT" };
}>;

/** ユーザー発話とアシスタント応答を AgentCore Memory の会話ペイロードに整形する。 */
export function buildConversationPayload(
  user: string,
  assistant: string,
): ConversationPayload {
  return [
    { conversational: { content: { text: user }, role: "USER" } },
    { conversational: { content: { text: assistant }, role: "ASSISTANT" } },
  ];
}

type MemoryRecordLike = { content?: { text?: string } };

/** 取得した記憶レコードを、プロンプトに注入する箇条書きテキストへ整形する。 */
export function formatMemoryContext(records: MemoryRecordLike[]): string {
  const texts = records
    .map((r) => r.content?.text)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
  return texts.map((t) => `- ${t}`).join("\n");
}

/** send だけを使う最小インターフェース（テストで DI 可能にする）。 */
type SendableClient = Pick<BedrockAgentCoreClient, "send">;

/**
 * AgentCore Memory(マネージド)への薄いラッパ。
 * 記憶ロジック（要約・嗜好抽出・セマンティック検索）は Memory 側が担い、
 * 本クラスは CreateEvent(保存) / RetrieveMemoryRecords(取得) を呼ぶだけ。
 */
export class MemoryStore {
  constructor(
    private readonly client: SendableClient,
    private readonly memoryId: string,
    private readonly namespacePrefix = "/strategies",
  ) {}

  private namespace(actorId: string): string {
    return `${this.namespacePrefix}/${actorId}`;
  }

  /** actorId に紐づく関連記憶を取得し、注入用テキストにして返す。 */
  async retrieve(actorId: string, query: string, topK = 5): Promise<string> {
    const res = await this.client.send(
      new RetrieveMemoryRecordsCommand({
        memoryId: this.memoryId,
        namespace: this.namespace(actorId),
        searchCriteria: { searchQuery: query, topK },
        maxResults: topK,
      }),
    );
    return formatMemoryContext(res.memoryRecordSummaries ?? []);
  }

  /** 1 ターンの会話(USER/ASSISTANT)をイベントとして保存する。 */
  async save(
    actorId: string,
    sessionId: string,
    user: string,
    assistant: string,
  ): Promise<void> {
    await this.client.send(
      new CreateEventCommand({
        memoryId: this.memoryId,
        actorId,
        sessionId,
        eventTimestamp: new Date(),
        payload: buildConversationPayload(user, assistant),
      }),
    );
  }
}
