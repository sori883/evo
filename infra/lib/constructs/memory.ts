import * as agentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface MemoryConstructProps {
  /** イベント保持期間（日）。既定 30 日。 */
  eventExpiryDays?: number;
}

/**
 * AgentCore Memory（マネージド）。
 * semantic 戦略の namespace を agents/chat の MemoryStore と一致させる
 * （`/strategies/{actorId}`）。要約・嗜好は別 namespace。
 */
export class MemoryConstruct extends Construct {
  readonly memory: agentcore.CfnMemory;
  readonly executionRole: iam.Role;

  constructor(scope: Construct, id: string, props: MemoryConstructProps = {}) {
    super(scope, id);

    this.executionRole = new iam.Role(this, "MemoryRole", {
      assumedBy: new iam.ServicePrincipal("bedrock-agentcore.amazonaws.com"),
    });
    // 長期記憶の抽出に使う Bedrock 呼び出し権限
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      }),
    );

    const expiryDays = props.eventExpiryDays ?? 30;
    this.memory = new agentcore.CfnMemory(this, "Memory", {
      name: "evo_chat_memory",
      eventExpiryDuration: expiryDays * 24 * 60 * 60,
      memoryExecutionRoleArn: this.executionRole.roleArn,
      memoryStrategies: [
        {
          semanticMemoryStrategy: {
            name: "semantic",
            namespaceTemplates: ["/strategies/{actorId}"],
          },
        },
        {
          summaryMemoryStrategy: {
            name: "summary",
            namespaceTemplates: ["/summaries/{actorId}/{sessionId}"],
          },
        },
        {
          userPreferenceMemoryStrategy: {
            name: "preferences",
            namespaceTemplates: ["/preferences/{actorId}"],
          },
        },
      ],
    });
  }
}
