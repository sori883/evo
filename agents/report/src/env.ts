import { parseEnv } from "@evo/shared";
import { z } from "zod";

/**
 * レポートエージェントの環境変数。値はハードコードせず検証して取り出す。
 */
const envSchema = z.object({
  AWS_REGION: z.string().min(1),
  BEDROCK_MODEL_ID: z.string().min(1),
  /** レポート Markdown を保存する S3 バケット。 */
  REPORTS_BUCKET: z.string().min(1),
  /** 共有 skill ストアの S3 バケット。 */
  SKILLS_BUCKET: z.string().min(1),
  /** 自分の skill namespace（= "report"）。 */
  AGENT_ID: z.string().min(1),
  /** 会話由来の改善 overlay を読む DynamoDB テーブル。 */
  SHARED_TABLE_NAME: z.string().min(1),
  /** 監視対象を選ぶタグ（既定 evo-target=true）。 */
  TARGET_TAG_KEY: z.string().min(1),
  TARGET_TAG_VALUE: z.string().min(1),
});

export type ReportEnv = z.infer<typeof envSchema>;

export function loadEnv(): ReportEnv {
  return parseEnv(envSchema);
}
