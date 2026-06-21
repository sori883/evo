import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { defineConfig } from "tsup";

// report/chat と同方式: AgentCore CodeZip は node_modules 同梱方式。依存はバンドル
// せず external のままにし、実行時に同梱 node_modules から解決する。同梱は pnpm
// deploy で行う。dist 直下にも ESM マーカーを置き ESM 認識させる保険。
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  clean: true,
  onSuccess: async () => {
    await writeFile(
      path.join("dist", "package.json"),
      `${JSON.stringify({ type: "module" }, null, 2)}\n`,
    );
  },
});
