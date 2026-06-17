import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, BedrockModel } from "@strands-agents/sdk";
import { AgentSkills } from "@strands-agents/sdk/vended-plugins/skills";
import { createCollectionTools } from "./collect.js";
import type { ReportEnv } from "./env.js";
import { reportSchema } from "./report.js";

// skill は CodeZip 同梱の skills/report-generation を dist からの相対で解決する
// （pnpm deploy はパッケージ配下を同梱するため deploy/skills に置かれる）。
const skillDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "skills",
  "report-generation",
);

const SYSTEM_PROMPT = [
  "あなたは AWS の運用レポートを作成する SRE エージェントです。",
  "report-generation スキルの手順に従い、与えられたツールで read-only に情報を収集し、",
  "事実に基づく運用レポートを構造化スキーマで出力してください。",
  "確認できないことは断定せず、取得できた事実に基づいて記述します。",
].join("\n");

/** レポート生成用 Strands エージェント（skill + 収集ツール + 構造化出力）。 */
export function createReportAgent(env: ReportEnv): Agent {
  return new Agent({
    model: new BedrockModel({
      modelId: env.BEDROCK_MODEL_ID,
      region: env.AWS_REGION,
    }),
    systemPrompt: SYSTEM_PROMPT,
    tools: createCollectionTools(env),
    plugins: [new AgentSkills({ skills: [skillDir] })],
    structuredOutputSchema: reportSchema,
  });
}
