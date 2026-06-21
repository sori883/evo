import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import {
  SKILLS_ROOT,
  type SkillStorage,
  materializeSkills,
  resolveSkillKeys,
} from "@evo/shared";

type SendableS3 = Pick<S3Client, "send">;

/**
 * 共有 skill ストア(S3)を {@link SkillStorage} として扱うアダプタ。
 * 純ロジック(@evo/shared)に S3 I/O を注入する。
 */
export function createS3SkillStorage(
  s3: SendableS3,
  bucket: string,
): SkillStorage {
  const root = `${SKILLS_ROOT}/`;
  return {
    async listNamespaces() {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: root,
          Delimiter: "/",
        }),
      );
      return (res.CommonPrefixes ?? [])
        .map((p) => (p.Prefix ?? "").slice(root.length).replace(/\/$/, ""))
        .filter((n) => n.length > 0);
    },
    async listKeys(namespace) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const res = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `${root}${namespace}/`,
            ContinuationToken: token,
          }),
        );
        for (const o of res.Contents ?? []) {
          if (o.Key?.endsWith("/SKILL.md")) keys.push(o.Key);
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
      return keys;
    },
    async get(key) {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      return (await res.Body?.transformToString()) ?? "";
    },
    async put(key, body) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: new TextEncoder().encode(body),
          ContentType: "text/markdown; charset=utf-8",
        }),
      );
    },
  };
}

/**
 * 自分が読める skill を S3 から `destRoot` 配下へ materialize し、
 * AgentSkills に渡す skill ディレクトリ群を返す（起動時に1回実行する想定）。
 */
export async function syncSkills(
  storage: SkillStorage,
  agentId: string,
  destRoot: string,
): Promise<string[]> {
  const keys = await resolveSkillKeys(storage, agentId);
  return materializeSkills(storage, destRoot, keys, async (absPath, content) => {
    await mkdir(path.dirname(absPath), { recursive: true });
    await writeFile(absPath, content, "utf8");
  });
}
