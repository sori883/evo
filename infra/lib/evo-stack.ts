import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AgentConstruct } from "./constructs/agent";
import { AuthConstruct } from "./constructs/auth";
import { DataConstruct } from "./constructs/data";
import { MemoryConstruct } from "./constructs/memory";

export interface EvoStackProps extends cdk.StackProps {
  /** Bedrock モデルID（jp.* 推論プロファイル）。env 由来。 */
  modelId: string;
  agentRuntimeName: string;
  managedRuntime: string;
  /** agents/chat のビルド成果物(dist)ディレクトリ。 */
  agentCodePath: string;
}

/**
 * 単一スタック。Auth / Memory / Data / Agent の各 Construct をまとめる。
 */
export class EvoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EvoStackProps) {
    super(scope, id, props);

    const auth = new AuthConstruct(this, "Auth");
    const memory = new MemoryConstruct(this, "Memory");
    const data = new DataConstruct(this, "Data");
    const agent = new AgentConstruct(this, "Agent", {
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      memory: memory.memory,
      table: data.table,
      modelId: props.modelId,
      agentRuntimeName: props.agentRuntimeName,
      managedRuntime: props.managedRuntime,
      codePath: props.agentCodePath,
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: auth.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: auth.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "MemoryId", { value: memory.memory.attrMemoryId });
    new cdk.CfnOutput(this, "AgentRuntimeArn", {
      value: agent.runtime.attrAgentRuntimeArn,
    });
    new cdk.CfnOutput(this, "SharedTableName", { value: data.table.tableName });
  }
}
