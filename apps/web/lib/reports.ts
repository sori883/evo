import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { serverEnv } from "./env";

const PREFIX = "reports/";

export type ReportSummary = {
  /** S3 オブジェクトキー（reports/ を除いたファイル名）。 */
  name: string;
  /** 表示用ラベル（latest は別扱い、それ以外は日時）。 */
  label: string;
  /** 最終更新（ISO 文字列）。 */
  updatedAt: string;
};

type RawObject = { key: string; lastModified?: string };

/** S3 キー(reports/<name>)から表示用ラベルを作る。 */
export function reportLabel(name: string): string {
  if (name === "latest.md") {
    return "最新";
  }
  // 2026-06-18T010259Z.md → 2026-06-18 01:02:59 UTC
  const m = name.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})Z\.md$/,
  );
  if (m) {
    return `${m[1]} ${m[2]}:${m[3]}:${m[4]} UTC`;
  }
  return name.replace(/\.md$/, "");
}

/**
 * S3 のオブジェクト一覧を、latest を先頭・以降は新しい順に並べた表示用リストへ整形する。
 */
export function toReportList(objects: RawObject[]): ReportSummary[] {
  const items = objects
    .map((o) => ({ name: o.key.slice(PREFIX.length), updatedAt: o.lastModified ?? "" }))
    .filter((o) => o.name.endsWith(".md"));
  const latest = items.filter((o) => o.name === "latest.md");
  const history = items
    .filter((o) => o.name !== "latest.md")
    .sort((a, b) => b.name.localeCompare(a.name));
  return [...latest, ...history].map((o) => ({
    name: o.name,
    label: reportLabel(o.name),
    updatedAt: o.updatedAt,
  }));
}

function client(): { s3: S3Client; bucket: string } {
  const env = serverEnv();
  return {
    s3: new S3Client({ region: env.AWS_REGION }),
    bucket: env.REPORTS_BUCKET,
  };
}

/** レポート一覧を返す。 */
export async function listReports(): Promise<ReportSummary[]> {
  const { s3, bucket } = client();
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, MaxKeys: 100 }),
  );
  const objects = (res.Contents ?? []).map((c) => ({
    key: c.Key ?? "",
    lastModified:
      c.LastModified instanceof Date ? c.LastModified.toISOString() : "",
  }));
  return toReportList(objects.filter((o) => o.key.length > PREFIX.length));
}

/** 指定レポート(Markdown)を取得する。name は reports/ を除いたファイル名。 */
export async function getReport(name: string): Promise<string | null> {
  // パストラバーサル防止: ファイル名のみ許可。
  if (!/^[A-Za-z0-9._:-]+\.md$/.test(name)) {
    return null;
  }
  const { s3, bucket } = client();
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: `${PREFIX}${name}` }),
    );
    return (await res.Body?.transformToString()) ?? null;
  } catch {
    return null;
  }
}
