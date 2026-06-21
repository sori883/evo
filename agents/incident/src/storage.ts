import { type S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const PREFIX = "incidents/";

/** 安全なファイル名スラッグ（英数とハイフンのみ）。 */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "incident";
}

/** タイムスタンプ＋アラーム名の履歴キー。 */
export function incidentKey(generatedAt: string, alarmName: string): string {
  const safe = generatedAt.replace(/[:]/g, "").replace(/\.\d+Z$/, "Z");
  return `${PREFIX}${safe}-${slug(alarmName)}.md`;
}

/** 最新エイリアス。 */
export function latestKey(): string {
  return `${PREFIX}latest.md`;
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

/** インシデントレポートを履歴キー + latest に保存する。 */
export async function saveIncident(
  client: SendableS3,
  bucket: string,
  markdown: string,
  generatedAt: string,
  alarmName: string,
): Promise<{ key: string; latestKey: string }> {
  const key = incidentKey(generatedAt, alarmName);
  const lk = latestKey();
  await put(client, bucket, key, markdown);
  await put(client, bucket, lk, markdown);
  return { key, latestKey: lk };
}
