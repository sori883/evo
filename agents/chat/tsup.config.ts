import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { defineConfig } from "tsup";

// AgentCore Runtime の CodeZip は「node_modules 同梱」方式でパッケージングする。
// bedrock-agentcore(fastify) は @fastify/sse 等を動的 require するため、単一バンドル
// にすると実行時に "Cannot find module" で起動失敗する（→ Runtime init timeout）。
// そこで依存はバンドルせず external のままにし、実行時に同梱 node_modules から解決する。
// 同梱は `pnpm deploy`（symlink を実体化した自己完結 node_modules を生成）で行う。
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  // dist 直下にも ESM マーカーを置き、CodeZip 構造に依存せず ESM 認識させる保険。
  onSuccess: async () => {
    await writeFile(
      path.join("dist", "package.json"),
      `${JSON.stringify({ type: "module" }, null, 2)}\n`,
    );
  },
});
