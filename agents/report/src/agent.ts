import { type SkillStorage } from "@evo/shared";
import { Agent, BedrockModel } from "@strands-agents/sdk";
import { AgentSkills } from "@strands-agents/sdk/vended-plugins/skills";
import { createCollectionTools } from "@evo/agent-tools";
import type { ReportEnv } from "./env.js";
import { reportSchema } from "./report.js";
import { createSkillTools } from "./skill-tools.js";

const SYSTEM_PROMPT = [
  "あなたは AWS の運用レポートを作成する SRE エージェントです。",
  "report-generation スキルの手順に従い、与えられたツールで read-only に情報を収集し、",
  "事実に基づく運用レポートを構造化スキーマで出力してください。",
  "確認できないことは断定せず、取得できた事実に基づいて記述します。",
  "手順を恒久的に改善したい場合は improve_skill ツールで skill を更新できます（次回起動から適用）。",
].join("\n");

export interface ReportAgentDeps {
  /** S3 から sync 済みの skill ディレクトリ群（AgentSkills に渡す）。 */
  skillDirs: string[];
  /** 自己改善ツールが書き込む skill ストレージ。 */
  storage: SkillStorage;
}

/** レポート生成用 Strands エージェント（skill + 収集ツール + 構造化出力）。 */
export function createReportAgent(env: ReportEnv, deps: ReportAgentDeps): Agent {
  return new Agent({
    model: new BedrockModel({
      modelId: env.BEDROCK_MODEL_ID,
      region: env.AWS_REGION,
    }),
    systemPrompt: SYSTEM_PROMPT,
    tools: [
      ...createCollectionTools(env),
      ...createSkillTools(deps.storage, env.AGENT_ID),
    ],
    // sync した skill がある時だけ AgentSkills を有効化する（空でも起動可能に）。
    plugins:
      deps.skillDirs.length > 0
        ? [new AgentSkills({ skills: deps.skillDirs })]
        : [],
    structuredOutputSchema: reportSchema,
  });
}
