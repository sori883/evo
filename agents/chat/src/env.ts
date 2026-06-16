import { parseEnv } from "@evo/shared";
import { z } from "zod";

/**
 * エージェント実行に必要な環境変数。
 * モデルID・リージョン・リソースIDはハードコードせず、ここで検証して取り出す。
 */
const envSchema = z.object({
  AWS_REGION: z.string().min(1),
  BEDROCK_MODEL_ID: z.string().min(1),
  MEMORY_ID: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
});

export type AgentEnv = z.infer<typeof envSchema>;

export function loadEnv(): AgentEnv {
  return parseEnv(envSchema);
}
