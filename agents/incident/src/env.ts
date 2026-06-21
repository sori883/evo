import { parseEnv } from "@evo/shared";
import { z } from "zod";

/**
 * インシデント対処エージェントの環境変数。値はハードコードせず検証して取り出す。
 */
const envSchema = z.object({
  AWS_REGION: z.string().min(1),
  /** モデルID。既定は他エージェントと同じ jp Haiku（infra が注入）。 */
  INCIDENT_MODEL_ID: z.string().min(1),
  /** インシデント診断レポートを保存する S3 バケット。 */
  INCIDENTS_BUCKET: z.string().min(1),
  /** 共有 skill ストアの S3 バケット。 */
  SKILLS_BUCKET: z.string().min(1),
  /** 自分の skill namespace（= "incident"）。 */
  AGENT_ID: z.string().min(1),
  /** 監視対象を選ぶタグ（収集ツール用）。 */
  TARGET_TAG_KEY: z.string().min(1),
  TARGET_TAG_VALUE: z.string().min(1),
  /** PR 作成用 fine-grained PAT。空なら PR 機能オフ（diagnosis のみ）。 */
  EVO_GITHUB_PAT: z.string().default(""),
  /** 対象リポジトリ（owner/name）。 */
  GITHUB_REPO: z.string().default("sori883/evo"),
});

export type IncidentEnv = z.infer<typeof envSchema>;

export function loadEnv(): IncidentEnv {
  return parseEnv(envSchema);
}
