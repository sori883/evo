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
});
