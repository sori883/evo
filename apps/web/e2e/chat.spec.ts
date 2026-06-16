import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL ?? "";
const password = process.env.E2E_USER_PASSWORD ?? "";

test.describe("対話エージェント E2E（実 AWS 接続）", () => {
  test("ログイン→チャット→ストリーミング応答を受け取る", async ({ page }) => {
    // ログイン
    await page.goto("/login");
    await page.getByPlaceholder("メールアドレス").fill(email);
    await page.getByPlaceholder(/パスワード/).fill(password);
    await page.getByRole("button", { name: "ログイン" }).click();

    // /chat へ遷移
    await page.waitForURL("**/chat");

    // メッセージ送信
    await page.getByPlaceholder("メッセージを入力").fill("自己紹介してください");
    await page.getByRole("button", { name: "送信" }).click();

    // アシスタント応答がストリーミングで埋まる（プレースホルダ "…" でなくなる）
    const assistant = page.getByTestId("assistant-msg").last();
    await expect
      .poll(async () => (await assistant.textContent())?.trim() ?? "", {
        timeout: 45_000,
      })
      .not.toBe("…");
    await expect(assistant).not.toBeEmpty();
  });

  test("未ログインで /chat にアクセスするとログインへ戻る", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/chat");
    await page.waitForURL("**/login");
    await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
  });
});
