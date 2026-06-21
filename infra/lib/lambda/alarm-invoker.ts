import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

const client = new BedrockAgentCoreClient({});

/**
 * EventBridge の CloudWatch アラームイベントを受け、incident Runtime を
 * SigV4 で InvokeAgentRuntime する薄い中継 Lambda。
 * EventBridge Rule は AgentCore Runtime を直接ターゲットにできないため経由する。
 */
export async function handler(event: unknown): Promise<{ ok: boolean }> {
  const arn = process.env.AGENT_RUNTIME_ARN;
  if (!arn) {
    throw new Error("AGENT_RUNTIME_ARN is not set");
  }

  // runtimeSessionId は 33-128 文字。アラーム単位で適度に分散させる。
  const detail =
    (event as { detail?: { alarmName?: string } } | null)?.detail ?? {};
  const base = `incident-${detail.alarmName ?? "alarm"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`.replace(/[^A-Za-z0-9_-]/g, "-");
  const sessionId = base.padEnd(33, "0").slice(0, 64);

  await client.send(
    new InvokeAgentRuntimeCommand({
      agentRuntimeArn: arn,
      runtimeSessionId: sessionId,
      qualifier: "DEFAULT",
      contentType: "application/json",
      payload: new TextEncoder().encode(JSON.stringify(event ?? {})),
    }),
  );

  return { ok: true };
}
