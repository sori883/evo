import { createCollectionTools } from "@evo/agent-tools";
import { type SkillStorage } from "@evo/shared";
import { Agent, BedrockModel, type tool } from "@strands-agents/sdk";
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
  "対応が必要(needsAction=true)で原因がコード/設定に起因する場合は、",
  "read_repo_file / search_repo_code でコードを確認し、最小限の修正を施した上で",
  "open_fix_pr で Pull Request を作成してください（承認はレビュー/マージで行われます）。",
  "AWS リソースの変更が必要な場合も直接操作せず CDK の差分として PR にします。",
  "手順を恒久的に改善したい場合は improve_skill ツールで skill を更新できます。",
].join("\n");

export interface IncidentAgentDeps {
  /** S3 から sync 済みの skill ディレクトリ群。 */
  skillDirs: string[];
  /** 自己改善ツールが書き込む skill ストレージ。 */
  storage: SkillStorage;
  /** コード対処（PR 作成）ツール。PAT 未設定時は空。 */
  githubTools?: ReturnType<typeof tool>[];
}

/** インシデント診断/対処用 Strands エージェント（収集 + skill + (PR) + 構造化出力）。 */
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
      ...(deps.githubTools ?? []),
    ],
    plugins:
      deps.skillDirs.length > 0
        ? [new AgentSkills({ skills: deps.skillDirs })]
        : [],
    structuredOutputSchema: triageSchema,
  });
}
