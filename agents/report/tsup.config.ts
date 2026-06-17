import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { defineConfig } from "tsup";

// chat と同方式: AgentCore CodeZip は node_modules 同梱方式。依存はバンドルせず
// external のままにし、実行時に同梱 node_modules から解決する（bedrock-agentcore
// /fastify の動的 require が単一バンドルで壊れるのを避ける）。同梱は pnpm deploy で行う。
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  // dist 直下にも ESM マーカーを置き CodeZip 構造に依存せず ESM 認識させる保険。
  onSuccess: async () => {
    await writeFile(
      path.join("dist", "package.json"),
      `${JSON.stringify({ type: "module" }, null, 2)}\n`,
    );
  },
});
