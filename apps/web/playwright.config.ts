import { config as loadEnv } from "dotenv";
import { defineConfig } from "@playwright/test";

// ローカル E2E: .env.local（無ければ .env）から設定を読み込み、実行時の export を不要にする。
// 既に設定済みの環境変数は上書きしない（CI 等での注入を尊重）。
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

/**
 * 実 AWS 接続 E2E。
 * - E2E_BASE_URL を指定すると既存サーバ（Vercel 等）に対して実行
 * - 未指定なら `pnpm start`（要 build 済み・実 env）でローカル起動して実行
 * 事前に e2e/global-setup.ts が Cognito にテストユーザーを作成する。
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
