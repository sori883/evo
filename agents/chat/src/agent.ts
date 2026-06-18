import { Agent, BedrockModel } from "@strands-agents/sdk";
import type { AgentEnv } from "./env.js";
import { createReportTools } from "./report-tools.js";

const SYSTEM_PROMPT = [
  "あなたは親切で誠実な日本語アシスタントです。",
  "ユーザーの質問に簡潔かつ正確に答えてください。",
  "わからないことは推測せず、わからないと伝えてください。",
  "システムの稼働状況・構成・ログ/メトリクス/アラート/脆弱性について聞かれたら、",
  "get_latest_report ツールで最新の運用レポートを参照して答えてください。",
  "レポートの内容や作り方への要望（次回○○も載せて、構成の誤り指摘 等）があれば、",
  "request_report_change ツールで登録してください。",
].join("\n");

/**
 * Strands Agent を生成する。
 * 取得済みの記憶コンテキストがあれば systemPrompt に注入し、
 * 運用レポート連携ツール（参照 / 改善指示の登録）を付与する。
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
    tools: createReportTools(env),
  });
}
