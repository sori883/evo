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
 * - request_report_change: 次回レポートの振る舞いへの追加指示を DynamoDB overlay に積む。
 * いずれも read / overlay 追記のみで、AWS リソースは変更しない。
 */
export function createReportTools(env: AgentEnv, nowIso: () => string = () => new Date().toISOString()) {
  const s3 = new S3Client({ region: env.AWS_REGION });
  const ddb = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: env.AWS_REGION }),
  );

  const getLatestReport = tool({
    name: "get_latest_report",
    description:
      "監視対象システムの最新の運用レポート(Markdown)を取得する。システムの状況・構成・ログ/メトリクス/アラート/脆弱性についてユーザーが尋ねたら使う。",
    inputSchema: z.object({}),
    callback: async () => {
      try {
        const res = await s3.send(
          new GetObjectCommand({
            Bucket: env.REPORTS_BUCKET,
            Key: "reports/latest.md",
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

  return [getLatestReport, requestReportChange];
}
