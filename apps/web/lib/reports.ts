import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { serverEnv } from "./env";

const PREFIX = "reports/";

export type ReportKind = "config" | "operations";

export type ReportSummary = {
  /** S3 オブジェクトキー（reports/ を除いたファイル名）。 */
  name: string;
  /** レポート種別。 */
  kind: ReportKind;
  /** 表示用ラベル（latest は『最新』、それ以外は日時）。 */
  label: string;
  /** 最終更新（ISO 文字列）。 */
  updatedAt: string;
};

type RawObject = { key: string; lastModified?: string };

/** ファイル名から種別を判定する。`<kind>-...md` 形式。 */
export function parseKind(name: string): ReportKind | null {
  if (name.startsWith("config-")) return "config";
  if (name.startsWith("operations-")) return "operations";
  return null;
}

/** S3 キー名から表示用ラベルを作る。 */
export function reportLabel(name: string): string {
  const rest = name.replace(/^(config|operations)-/, "").replace(/\.md$/, "");
  if (rest === "latest") {
    return "最新";
  }
  // 2026-06-18T010259Z → 2026-06-18 01:02:59 UTC
  const m = rest.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return m ? `${m[1]} ${m[2]}:${m[3]}:${m[4]} UTC` : rest;
}

/**
 * S3 のオブジェクト一覧を、種別ごとに latest を先頭・以降は新しい順に並べた
 * 表示用リストへ整形する（種別不明=旧統合レポートは除外）。
 */
export function toReportList(objects: RawObject[]): ReportSummary[] {
  const items = objects
    .map((o) => ({ name: o.key.slice(PREFIX.length), updatedAt: o.lastModified ?? "" }))
    .filter((o) => o.name.endsWith(".md"))
    .map((o) => ({ ...o, kind: parseKind(o.name) }))
    .filter((o): o is typeof o & { kind: ReportKind } => o.kind !== null);

  const isLatest = (n: string) => n.endsWith("-latest.md");
  const sorted = [...items].sort((a, b) => {
    // latest を先頭、以降は名前（=日時）降順
    if (isLatest(a.name) !== isLatest(b.name)) return isLatest(a.name) ? -1 : 1;
    return b.name.localeCompare(a.name);
  });
  return sorted.map((o) => ({
    name: o.name,
    kind: o.kind,
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
    new ListObjectsV2Command({ Bucket: bucket, Prefix: PREFIX, MaxKeys: 200 }),
  );
  const objects = (res.Contents ?? []).map((c) => ({
    key: c.Key ?? "",
    lastModified:
      c.LastModified instanceof Date ? c.LastModified.toISOString() : "",
  }));
  return toReportList(objects.filter((o) => o.key.length > PREFIX.length));
}

/**
 * レポート Runtime を SigV4 で invoke してオンデマンド生成する（~35s 同期）。
 * AWS 認証は標準チェーン（ローカル=AWS_PROFILE / 本番=Vercel の IAM）。
 */
export async function generateReport(
  kind: ReportKind,
): Promise<{ ok: boolean }> {
  const env = serverEnv();
  const client = new BedrockAgentCoreClient({ region: env.AWS_REGION });
  const sessionId = `ondemand-${Date.now()}-${Math.random().toString(36).slice(2, 10)}padpadpadpadpadpadpad`.slice(
    0,
    64,
  );
  const res = await client.send(
    new InvokeAgentRuntimeCommand({
      agentRuntimeArn: env.REPORT_RUNTIME_ARN,
      runtimeSessionId: sessionId,
      qualifier: "DEFAULT",
      contentType: "application/json",
      payload: new TextEncoder().encode(JSON.stringify({ kinds: [kind] })),
    }),
  );
  const body = (await res.response?.transformToString()) ?? "{}";
  try {
    const parsed = JSON.parse(body) as { ok?: boolean };
    return { ok: parsed.ok === true };
  } catch {
    return { ok: false };
  }
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
