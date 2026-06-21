import { createCollectionTools } from "@evo/agent-tools";
import { type SkillStorage } from "@evo/shared";
import { Agent, BedrockModel } from "@strands-agents/sdk";
import { AgentSkills } from "@strands-agents/sdk/vended-plugins/skills";
import type { IncidentEnv } from "./env.js";
import { createSkillTools } from "./skill-tools.js";
import { triageSchema } from "./triage.js";

const SYSTEM_PROMPT = [
  "あなたは AWS の SRE インシデント対応エージェントです。",
  "CloudWatch アラームを起点に、与えられた read-only ツールでログ・メトリクス・",
  "アラーム・構成を調べ、根本原因を推定します。AWS リソースは一切変更しません。",
  "incident-response スキルの手順に従い、事実に基づいて『対応要否』を判定し、",
  "構造化スキーマ(triageSchema)で出力してください。確認できないことは断定しません。",
  "手順を恒久的に改善したい場合は improve_skill ツールで skill を更新できます。",
].join("\n");

export interface IncidentAgentDeps {
  /** S3 から sync 済みの skill ディレクトリ群。 */
  skillDirs: string[];
  /** 自己改善ツールが書き込む skill ストレージ。 */
  storage: SkillStorage;
}

/** インシデント診断用 Strands エージェント（収集ツール + skill + 構造化出力）。 */
export function createIncidentAgent(
  env: IncidentEnv,
  deps: IncidentAgentDeps,
): Agent {
  return new Agent({
    model: new BedrockModel({
      modelId: env.INCIDENT_MODEL_ID,
      region: env.AWS_REGION,
    }),
    systemPrompt: SYSTEM_PROMPT,
    tools: [
      ...createCollectionTools(env),
      ...createSkillTools(deps.storage, env.AGENT_ID),
    ],
    plugins:
      deps.skillDirs.length > 0
        ? [new AgentSkills({ skills: deps.skillDirs })]
        : [],
    structuredOutputSchema: triageSchema,
  });
}
