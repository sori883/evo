import { type S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/** S3 オブジェクトキー（タイムスタンプ別の履歴 + latest）。 */
export function reportKey(generatedAt: string): string {
  // コロンを除いた安全なキー（reports/2026-06-17T0000Z.md 風）
  const safe = generatedAt.replace(/[:]/g, "").replace(/\.\d+Z$/, "Z");
  return `reports/${safe}.md`;
}

type SendableS3 = Pick<S3Client, "send">;

/**
 * レポート Markdown を S3 に保存する（履歴キー + latest.md）。
 */
export async function saveReport(
  client: SendableS3,
  bucket: string,
  markdown: string,
  generatedAt: string,
): Promise<{ key: string; latestKey: string }> {
  const key = reportKey(generatedAt);
  const latestKey = "reports/latest.md";
  const body = new TextEncoder().encode(markdown);
  for (const Key of [key, latestKey]) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key,
        Body: body,
        ContentType: "text/markdown; charset=utf-8",
      }),
    );
  }
  return { key, latestKey };
}
