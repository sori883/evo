import { parseEnv } from "@evo/shared";
import { z } from "zod";

/** サーバ専用の環境変数（Route Handler / Server Component でのみ参照）。 */
const schema = z.object({
  AWS_REGION: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  AGENT_RUNTIME_URL: z.string().url(),
  /** チャット履歴を AgentCore Memory から引くための memoryId。 */
  MEMORY_ID: z.string().min(1),
});

export type ServerEnv = z.infer<typeof schema>;

export function serverEnv(): ServerEnv {
  return parseEnv(schema);
}
