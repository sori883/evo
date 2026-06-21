import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

/**
 * EventBridge の CloudWatch アラームイベントを受け、incident Runtime を
 * SigV4 で InvokeAgentRuntime する薄い中継 Lambda。
 * EventBridge Rule は AgentCore Runtime を直接ターゲットにできないため経由する。
 *
 * 時間窓 dedup: 専用 DynamoDB に条件付き Put し、窓内の同一アラーム再発は skip
 * （TTL 遅延に依存しないよう expiresAt を条件式で判定する）。
 */

export interface AlarmDeps {
  agentRuntimeArn: string;
  /** dedup 用 DynamoDB テーブル名（未設定なら dedup しない）。 */
  dedupTable?: string;
  /** dedup の窓（秒）。 */
  windowSec: number;
  /** 現在時刻(ms)。 */
  now: number;
  ddbSend: (cmd: PutItemCommand) => Promise<unknown>;
  agentSend: (cmd: InvokeAgentRuntimeCommand) => Promise<unknown>;
  /** runtimeSessionId のランダム成分。 */
  rand: string;
}

/** イベントからアラーム名を取り出す。 */
export function alarmNameOf(event: unknown): string {
  const d = (event as { detail?: { alarmName?: unknown } } | null)?.detail;
  return typeof d?.alarmName === "string" && d.alarmName
    ? d.alarmName
    : "unknown-alarm";
}

/** runtimeSessionId（33-128 文字）を作る。 */
export function sessionIdFor(
  alarmName: string,
  now: number,
  rand: string,
): string {
  const base = `incident-${alarmName}-${now}-${rand}`.replace(
    /[^A-Za-z0-9_-]/g,
    "-",
  );
  return base.padEnd(33, "0").slice(0, 64);
}

/**
 * dedup を通過したら incident Runtime を invoke する。
 * 窓内の重複は {skipped:true} で invoke しない。
 */
export async function handleAlarm(
  deps: AlarmDeps,
  event: unknown,
): Promise<{ ok: boolean; skipped?: boolean; alarmName: string }> {
  const alarmName = alarmNameOf(event);

  if (deps.dedupTable) {
    const nowSec = Math.floor(deps.now / 1000);
    try {
      await deps.ddbSend(
        new PutItemCommand({
          TableName: deps.dedupTable,
          Item: {
            alarmName: { S: alarmName },
            expiresAt: { N: String(nowSec + deps.windowSec) },
          },
          // 既存が無い、または前回の窓が過ぎている時のみ通す。
          ConditionExpression:
            "attribute_not_exists(alarmName) OR expiresAt < :now",
          ExpressionAttributeValues: { ":now": { N: String(nowSec) } },
        }),
      );
    } catch (e) {
      if ((e as { name?: string })?.name === "ConditionalCheckFailedException") {
        return { ok: true, skipped: true, alarmName };
      }
      throw e;
    }
  }

  await deps.agentSend(
    new InvokeAgentRuntimeCommand({
      agentRuntimeArn: deps.agentRuntimeArn,
      runtimeSessionId: sessionIdFor(alarmName, deps.now, deps.rand),
      qualifier: "DEFAULT",
      contentType: "application/json",
      payload: new TextEncoder().encode(JSON.stringify(event ?? {})),
    }),
  );
  return { ok: true, alarmName };
}

const ddb = new DynamoDBClient({});
const agent = new BedrockAgentCoreClient({});

export async function handler(
  event: unknown,
): Promise<{ ok: boolean; skipped?: boolean }> {
  const arn = process.env.AGENT_RUNTIME_ARN;
  if (!arn) {
    throw new Error("AGENT_RUNTIME_ARN is not set");
  }
  return handleAlarm(
    {
      agentRuntimeArn: arn,
      dedupTable: process.env.DEDUP_TABLE_NAME || undefined,
      windowSec: Number(process.env.DEDUP_WINDOW_SECONDS || "900"),
      now: Date.now(),
      rand: Math.random().toString(36).slice(2),
      ddbSend: (c) => ddb.send(c),
      agentSend: (c) => agent.send(c),
    },
    event,
  );
}
