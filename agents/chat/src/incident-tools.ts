import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import type { AgentEnv } from "./env.js";

/**
 * chat エージェント用のインシデント参照ツール（read のみ）。
 * - get_latest_incident: 最新のインシデント診断レポート(Markdown)を S3 から読む。
 * AWS リソースは変更しない。
 */
export function createIncidentTools(env: AgentEnv) {
  const s3 = new S3Client({ region: env.AWS_REGION });

  const getLatestIncident = tool({
    name: "get_latest_incident",
    description:
      "最新のインシデント診断レポート(Markdown)を取得する。アラート・障害・インシデントの状況や、対応要否・作成された修正 PR について聞かれたときに使う。",
    inputSchema: z.object({}),
    callback: async () => {
      try {
        const res = await s3.send(
          new GetObjectCommand({
            Bucket: env.INCIDENTS_BUCKET,
            Key: "incidents/latest.md",
          }),
        );
        const body = await res.Body?.transformToString();
        return body && body.length > 0
          ? body
          : "まだインシデントはありません。";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // 未発生（NoSuchKey）も含めて穏当に返す
        return /NoSuchKey|NotFound/.test(msg)
          ? "まだインシデントはありません。"
          : `インシデントを取得できませんでした: ${msg}`;
      }
    },
  });

  return [getLatestIncident];
}
