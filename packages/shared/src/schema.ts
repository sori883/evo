import { z } from "zod";

/** 会話メッセージの役割。AgentCore Memory の Role と対応する。 */
export const messageRoleSchema = z.enum(["user", "assistant"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

/** チャットの 1 メッセージ。 */
export const chatMessageSchema = z.object({
  role: messageRoleSchema,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Web(BFF) -> AgentCore Runtime への呼び出しペイロード。
 * sessionId は会話の継続単位(= AgentCore Memory の sessionId)。
 */
export const invokeRequestSchema = z.object({
  prompt: z.string().min(1),
  sessionId: z.string().min(1),
});
export type InvokeRequest = z.infer<typeof invokeRequestSchema>;

/**
 * Runtime が SSE で返すイベント。
 * - delta: 生成テキストの差分
 * - done : 応答完了(sessionId を返す)
 * - error: エラー通知
 */
export const agentStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("done"), sessionId: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type AgentStreamEvent = z.infer<typeof agentStreamEventSchema>;

/**
 * 将来のイベント駆動(ambient)エージェントが生成し、DynamoDB に格納する
 * 共有データの型。対話エージェントはこれをツール経由で読み出して回答に利用する。
 *
 * DynamoDB 単一テーブル設計:
 *   PK = USER#<userId>
 *   SK = DATA#<source>#<id>
 */
export const sharedDataItemSchema = z.object({
  userId: z.string(),
  source: z.string(), // 生成元 ambient エージェント識別子
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(), // ISO8601
});
export type SharedDataItem = z.infer<typeof sharedDataItemSchema>;
