import {
  BedrockAgentCoreClient,
  ListEventsCommand,
  ListSessionsCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { serverEnv } from "./env";
import type { MemoryEvent } from "./history";

export type SessionSummary = {
  sessionId: string;
  /** 作成時刻（ISO 文字列、無ければ空）。新しい順に並べる基準。 */
  createdAt: string;
};

/**
 * AgentCore Memory のデータプレーン（読み取り）ラッパ。
 * BFF から actorId(= Cognito sub) のセッション/イベントを引くために使う。
 * AWS 認証は標準チェーン（ローカル=AWS_PROFILE / 本番=IAM ロール）。
 */
export class MemoryReader {
  private readonly client: BedrockAgentCoreClient;
  private readonly memoryId: string;

  constructor() {
    const env = serverEnv();
    this.client = new BedrockAgentCoreClient({ region: env.AWS_REGION });
    this.memoryId = env.MEMORY_ID;
  }

  /** actorId のセッション一覧（新しい順）。 */
  async listSessions(actorId: string, max = 30): Promise<SessionSummary[]> {
    const res = await this.client.send(
      new ListSessionsCommand({
        memoryId: this.memoryId,
        actorId,
        maxResults: max,
      }),
    );
    const summaries = (res.sessionSummaries ?? [])
      .map((s) => ({
        sessionId: s.sessionId ?? "",
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : "",
      }))
      .filter((s) => s.sessionId.length > 0);
    // API のデフォルト順序に依存せず、作成時刻の新しい順に明示ソートする。
    summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return summaries;
  }

  /** あるセッションの会話イベント（古い→新しい順）。 */
  async listEvents(
    actorId: string,
    sessionId: string,
    max = 100,
  ): Promise<MemoryEvent[]> {
    const res = await this.client.send(
      new ListEventsCommand({
        memoryId: this.memoryId,
        actorId,
        sessionId,
        maxResults: max,
      }),
    );
    return (res.events ?? []) as MemoryEvent[];
  }
}
