import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { formatJst } from "@evo/shared";
import { serverEnv } from "./env";

const PREFIX = "incidents/";

export type IncidentSummary = {
  /** S3 オブジェクトキー（incidents/ を除いたファイル名）。 */
  name: string;
  /** 表示用ラベル（latest は『最新』、それ以外は JST 日時 + アラーム名）。 */
  label: string;
  /** アラーム名（抽出できた場合）。 */
  alarmName: string;
  /** 最終更新（ISO 文字列）。 */
  updatedAt: string;
};

type RawObject = { key: string; lastModified?: string };

/** ファイル名（incidents/ 除去後）から表示ラベルとアラーム名を作る。 */
export function incidentLabel(name: string): { label: string; alarmName: string } {
  const rest = name.replace(/\.md$/, "");
  if (rest === "latest") {
    return { label: "最新", alarmName: "" };
  }
  // 2026-06-21T033714Z-<alarm-slug>
  const m = rest.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})Z-(.+)$/);
  if (!m) {
    return { label: rest, alarmName: rest };
  }
  const alarmName = m[5] ?? "";
  const jst = formatJst(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
  return { label: `${jst}　${alarmName}`, alarmName };
}

/**
 * S3 オブジェクト一覧を、latest 先頭・以降は新しい順に整形する。
 */
export function toIncidentList(objects: RawObject[]): IncidentSummary[] {
  const items = objects
    .map((o) => ({ name: o.key.slice(PREFIX.length), updatedAt: o.lastModified ?? "" }))
    .filter((o) => o.name.endsWith(".md"));

  const isLatest = (n: string) => n === "latest.md";
  const sorted = [...items].sort((a, b) => {
    if (isLatest(a.name) !== isLatest(b.name)) return isLatest(a.name) ? -1 : 1;
    return b.name.localeCompare(a.name); // 名前(=日時)降順
  });
  return sorted.map((o) => {
    const { label, alarmName } = incidentLabel(o.name);
    return { name: o.name, label, alarmName, updatedAt: o.updatedAt };
  });
}

function client(): { s3: S3Client; bucket: string } {
  const env = serverEnv();
  return {
    s3: new S3Client({ region: env.AWS_REGION }),
    bucket: env.INCIDENTS_BUCKET,
  };
}

/** インシデント一覧を返す。 */
export async function listIncidents(): Promise<IncidentSummary[]> {
  const { s3, bucket } = client();
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, MaxKeys: 300 }),
  );
  const objects = (res.Contents ?? []).map((c) => ({
    key: c.Key ?? "",
    lastModified:
      c.LastModified instanceof Date ? c.LastModified.toISOString() : "",
  }));
  return toIncidentList(objects.filter((o) => o.key.length > PREFIX.length));
}

/** 指定インシデント(Markdown)を取得する。name は incidents/ を除いたファイル名。 */
export async function getIncident(name: string): Promise<string | null> {
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
