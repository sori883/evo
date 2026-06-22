import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { buildOverlayItem } from "@evo/shared";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import type { AgentEnv } from "./env.js";

/**
 * chat エージェント用の運用レポート連携ツール。
 * - get_latest_report: 最新の運用レポート(Markdown)を S3 から読む。
 * - generate_report: report エージェントに生成を依頼し、生成後の本文を返す。
 * - request_report_change: 次回レポートの振る舞いへの追加指示を DynamoDB overlay に積む。
 * read / overlay 追記 / 他エージェント起動のみで、AWS リソースは変更しない。
 */
export function createReportTools(env: AgentEnv, nowIso: () => string = () => new Date().toISOString()) {
  const s3 = new S3Client({ region: env.AWS_REGION });
  const agentcore = new BedrockAgentCoreClient({ region: env.AWS_REGION });
  const ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: env.AWS_REGION }),
  );

  const getLatestReport = tool({
    name: "get_latest_report",
    description:
      "監視対象システムの最新レポート(Markdown)を取得する。kind=config は構成（アーキテクチャ/リソース）、kind=operations は運用（ログ/メトリクス/アラート/脆弱性/推奨）。状況を聞かれたら operations、構成を聞かれたら config を使う。",
    inputSchema: z.object({
      kind: z
        .enum(["config", "operations"])
        .default("operations")
        .describe("config=構成 / operations=運用"),
    }),
    callback: async (input) => {
      try {
        const res = await s3.send(
          new GetObjectCommand({
            Bucket: env.REPORTS_BUCKET,
            Key: `reports/${input.kind}-latest.md`,
          }),
        );
        const body = await res.Body?.transformToString();
        return body && body.length > 0
          ? body
          : "まだレポートがありません（生成前）。";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `レポートを取得できませんでした: ${msg}`;
      }
    },
  });

  const generateReport = tool({
    name: "generate_report",
    description:
      "レポートエージェントに依頼してレポートを今すぐ生成し、生成後の最新本文(Markdown)を返す。kind=operations（運用）/ config（構成）。『レポートを作って/最新にして』『まだレポートが無い』ときに使う。生成に最大1分ほどかかる。",
    inputSchema: z.object({
      kind: z
        .enum(["config", "operations"])
        .default("operations")
        .describe("config=構成 / operations=運用"),
    }),
    callback: async (input) => {
      try {
        const sessionId =
          `chat-gen-${Date.now()}-${Math.random().toString(36).slice(2)}padpadpadpadpadpad`.slice(
            0,
            64,
          );
        // report エージェントを起動して生成（指定 kind のみ）。
        await agentcore.send(
          new InvokeAgentRuntimeCommand({
            agentRuntimeArn: env.REPORT_RUNTIME_ARN,
            runtimeSessionId: sessionId,
            qualifier: "DEFAULT",
            contentType: "application/json",
            payload: new TextEncoder().encode(
              JSON.stringify({ kinds: [input.kind] }),
            ),
          }),
        );
        // 生成後の最新を読んで本文を返す（chat が回答に含める）。
        const res = await s3.send(
          new GetObjectCommand({
            Bucket: env.REPORTS_BUCKET,
            Key: `reports/${input.kind}-latest.md`,
          }),
        );
        const body = await res.Body?.transformToString();
        return body && body.length > 0
          ? `生成しました。\n\n${body}`
          : "生成を依頼しましたが、本文を取得できませんでした。";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `レポート生成を依頼できませんでした: ${msg}`;
      }
    },
  });

  const requestReportChange = tool({
    name: "request_report_change",
    description:
      "次回以降の運用レポートに反映してほしい追加指示（章の追加、観点の追加、構成の誤り指摘など）を登録する。ユーザーがレポートの内容や作り方を変えたいときに使う。",
    inputSchema: z.object({
      instruction: z
        .string()
        .min(1)
        .describe("次回レポートに反映する具体的な指示"),
    }),
    callback: async (input) => {
      try {
        const item = buildOverlayItem(input.instruction, nowIso());
        await ddb.send(
          new PutCommand({ TableName: env.SHARED_TABLE_NAME, Item: item }),
        );
        return `登録しました。次回のレポート生成時に反映されます: 「${item.instruction}」`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `登録に失敗しました: ${msg}`;
      }
    },
  });

  return [getLatestReport, generateReport, requestReportChange];
}
