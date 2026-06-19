import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { SKILLS_ROOT, type SkillTier, parseSkillKey } from "@evo/shared";
import { serverEnv } from "./env";

const PREFIX = `${SKILLS_ROOT}/`;

export type SkillSummary = {
  /** S3 オブジェクトキー（skills/<ns>/<tier>/<skill>/SKILL.md）。 */
  key: string;
  namespace: string;
  tier: SkillTier;
  skill: string;
  /** 最終更新（ISO 文字列）。 */
  updatedAt: string;
};

type RawObject = { key: string; lastModified?: string };

/**
 * S3 オブジェクト一覧を、namespace 昇順 → base→dynamic → skill 昇順に並べた
 * 表示用リストへ整形する（skills/<ns>/<tier>/<skill>/SKILL.md 以外は除外）。
 */
export function toSkillList(objects: RawObject[]): SkillSummary[] {
  const items = objects
    .map((o) => ({ parsed: parseSkillKey(o.key), o }))
    .filter(
      (x): x is { parsed: NonNullable<typeof x.parsed>; o: RawObject } =>
        x.parsed !== null,
    )
    .map(({ parsed, o }) => ({
      key: o.key,
      namespace: parsed.namespace,
      tier: parsed.tier,
      skill: parsed.skill,
      updatedAt: o.lastModified ?? "",
    }));

  const tierRank = (t: SkillTier) => (t === "base" ? 0 : 1);
  return items.sort(
    (a, b) =>
      a.namespace.localeCompare(b.namespace) ||
      tierRank(a.tier) - tierRank(b.tier) ||
      a.skill.localeCompare(b.skill),
  );
}

function client(): { s3: S3Client; bucket: string } {
  const env = serverEnv();
  return {
    s3: new S3Client({ region: env.AWS_REGION }),
    bucket: env.SKILLS_BUCKET,
  };
}

/** skill 一覧を返す（全 namespace / base+dynamic）。 */
export async function listSkills(): Promise<SkillSummary[]> {
  const { s3, bucket } = client();
  const out: RawObject[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PREFIX,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const c of res.Contents ?? []) {
      out.push({
        key: c.Key ?? "",
        lastModified:
          c.LastModified instanceof Date ? c.LastModified.toISOString() : "",
      });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return toSkillList(out);
}

/** 指定 skill(SKILL.md) の本文を取得する。key は厳格に検証する。 */
export async function getSkill(key: string): Promise<string | null> {
  // parseSkillKey が構造とパストラバーサル（".." 等）を弾く。
  if (!parseSkillKey(key)) {
    return null;
  }
  const { s3, bucket } = client();
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    return (await res.Body?.transformToString()) ?? null;
  } catch {
    return null;
  }
}
