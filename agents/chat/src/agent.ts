import { Agent, BedrockModel } from "@strands-agents/sdk";
import type { AgentEnv } from "./env.js";

const SYSTEM_PROMPT = [
  "あなたは親切で誠実な日本語アシスタントです。",
  "ユーザーの質問に簡潔かつ正確に答えてください。",
  "わからないことは推測せず、わからないと伝えてください。",
].join("\n");

/**
 * Strands Agent を生成する。
 * 取得済みの記憶コンテキストがあれば systemPrompt に注入する。
 */
export function createAgent(env: AgentEnv, memoryContext: string): Agent {
  const systemPrompt =
    memoryContext.length > 0
      ? `${SYSTEM_PROMPT}\n\n# ユーザーに関する記憶\n${memoryContext}`
      : SYSTEM_PROMPT;

  return new Agent({
    model: new BedrockModel({
      modelId: env.BEDROCK_MODEL_ID,
      region: env.AWS_REGION,
    }),
    systemPrompt,
  });
}
