import "dotenv/config";
import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { EvoStack } from "../lib/evo-stack";

const region = process.env.AWS_REGION ?? "ap-northeast-1";
const modelId = process.env.BEDROCK_MODEL_ID;
if (!modelId) {
  throw new Error("BEDROCK_MODEL_ID is required (.env を設定してください)");
}

const app = new cdk.App();
new EvoStack(app, "EvoStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
  modelId,
  agentRuntimeName: process.env.AGENT_RUNTIME_NAME ?? "evo_chat",
  // CfnRuntime の Runtime enum は NODE_22（NODEJS_22 ではない）
  managedRuntime: process.env.AGENT_MANAGED_RUNTIME ?? "NODE_22",
  // `pnpm deploy` 生成の自己完結パッケージ(dist + node_modules)を CodeZip 化する
  agentCodePath: path.join(__dirname, "..", "..", "agents", "chat", "deploy"),
  reportCodePath: path.join(__dirname, "..", "..", "agents", "report", "deploy"),
  reportRuntimeName: process.env.REPORT_RUNTIME_NAME ?? "evo_report",
  reportScheduleExpression:
    process.env.REPORT_SCHEDULE_EXPRESSION ?? "rate(1 day)",
  // base skill のシード元（リポジトリ直下 skills/）
  skillsSeedPath: path.join(__dirname, "..", "..", "skills"),
  // incident エージェント（CodeZip / モデル / GitHub）
  incidentCodePath: path.join(__dirname, "..", "..", "agents", "incident", "deploy"),
  // CI の未設定変数は空文字になるため、既定値には || を使う。
  incidentRuntimeName: process.env.INCIDENT_RUNTIME_NAME || "evo_incident",
  // 既定は共通モデル（Haiku）。INCIDENT_MODEL_ID で上位モデルに切替可。
  incidentModelId: process.env.INCIDENT_MODEL_ID || modelId,
  githubToken: process.env.EVO_GITHUB_PAT ?? "",
  githubRepo: process.env.GITHUB_REPO || "sori883/evo",
});
