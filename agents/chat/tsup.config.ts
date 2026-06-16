import { defineConfig } from "tsup";

// Strands 等が動的 import する optional 依存（未使用パスのため bundle しない）。
const OPTIONAL_EXTERNALS = [
  "@aws-sdk/client-s3",
  "@aws/bedrock-token-generator",
  "@opentelemetry/resources",
  "@opentelemetry/sdk-metrics",
];

// AgentCore Runtime の CodeZip 用に、依存を含めた自己完結 ESM バンドルを生成する。
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  noExternal: [/.*/],
  clean: true,
  esbuildPlugins: [
    {
      name: "externalize-optional",
      setup(build) {
        const escaped = OPTIONAL_EXTERNALS.map((s) =>
          s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        );
        const filter = new RegExp(`^(${escaped.join("|")})(/|$)`);
        build.onResolve({ filter }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
  ],
});
