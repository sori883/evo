import { z } from "zod";

/**
 * 環境変数を Zod スキーマで検証して取り出すヘルパ。
 * 設定値(モデルID・リージョン・各種リソースID)はコードにハードコードせず、
 * 必ず環境変数経由で注入する方針。未設定や不正値は起動時に即座に失敗させる。
 */
export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
