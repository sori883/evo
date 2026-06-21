import { type SkillStorage } from "@evo/shared";
import { Agent, BedrockModel } from "@strands-agents/sdk";
import { AgentSkills } from "@strands-agents/sdk/vended-plugins/skills";
import type { AgentEnv } from "./env.js";
import { createIncidentTools } from "./incident-tools.js";
import { createReportTools } from "./report-tools.js";
import { createSkillTools } from "./skill-tools.js";

const SYSTEM_PROMPT = [
  "あなたは親切で誠実な日本語アシスタントです。",
  "ユーザーの質問に簡潔かつ正確に答えてください。",
  "わからないことは推測せず、わからないと伝えてください。",
  "システムについて聞かれたら get_latest_report で最新レポートを参照して答えてください。",
  "稼働状況・ログ・メトリクス・アラート・脆弱性は kind=operations(運用)、",
  "アーキテクチャ・リソース構成は kind=config(構成) を使います。",
  "レポートの内容や作り方への要望（次回○○も載せて、構成の誤り指摘 等）があれば、",
  "request_report_change ツールで登録してください。",
  "アラート・障害・インシデントの状況や対応要否・修正PRを聞かれたら、",
  "get_latest_incident で最新のインシデント診断を参照して答えてください。",
  "自分の応答手順を恒久的に改善したい場合は improve_skill ツールで skill を更新できます（次回起動から適用）。",
].join("\n");

export interface ChatAgentDeps {
  /** S3 から sync 済みの skill ディレクトリ群（chat はハブ=全 namespace）。 */
  skillDirs: string[];
  /** 自己改善ツールが書き込む skill ストレージ。 */
  storage: SkillStorage;
}

/**
 * Strands Agent を生成する。
 * 取得済みの記憶コンテキストがあれば systemPrompt に注入し、
 * 運用レポート連携ツール（参照 / 改善指示の登録）と自己改善ツールを付与する。
 * skill は起動時に共有ストアから sync 済みのものを使う。
 */
export function createAgent(
  env: AgentEnv,
  memoryContext: string,
  deps: ChatAgentDeps,
): Agent {
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
    tools: [
      ...createReportTools(env),
      ...createIncidentTools(env),
      ...createSkillTools(deps.storage, env.AGENT_ID),
    ],
    // sync した skill がある時だけ AgentSkills を有効化する（空でも起動可能に）。
    plugins:
      deps.skillDirs.length > 0
        ? [new AgentSkills({ skills: deps.skillDirs })]
        : [],
  });
}
