import { type S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { ReportKind } from "./report.js";

/** S3 オブジェクトキー（種別 + タイムスタンプ別の履歴）。 */
export function reportKey(kind: ReportKind, generatedAt: string): string {
  const safe = generatedAt.replace(/[:]/g, "").replace(/\.\d+Z$/, "Z");
  return `reports/${kind}-${safe}.md`;
}

/** 最新エイリアスのキー。 */
export function latestKey(kind: ReportKind): string {
  return `reports/${kind}-latest.md`;
}

type SendableS3 = Pick<S3Client, "send">;

async function put(
  client: SendableS3,
  bucket: string,
  key: string,
  markdown: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: new TextEncoder().encode(markdown),
      ContentType: "text/markdown; charset=utf-8",
    }),
  );
}

/** 1 種別のレポートを履歴キー + latest に保存する。 */
export async function saveReport(
  client: SendableS3,
  bucket: string,
  kind: ReportKind,
  markdown: string,
  generatedAt: string,
): Promise<{ key: string; latestKey: string }> {
  const key = reportKey(kind, generatedAt);
  const lk = latestKey(kind);
  await put(client, bucket, key, markdown);
  await put(client, bucket, lk, markdown);
  return { key, latestKey: lk };
}
