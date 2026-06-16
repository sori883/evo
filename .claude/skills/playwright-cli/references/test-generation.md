# テスト生成

ブラウザを操作しながら、Playwright のテストコードを自動的に生成します。

## 仕組み

`playwright-cli` で実行するすべてのアクションは、対応する Playwright の TypeScript コードを生成します。
このコードは出力に表示され、そのままテストファイルにコピーできます。

## ワークフロー例

```bash
# セッションを開始する
playwright-cli open https://example.com/login

# スナップショットを取得して要素を確認する
playwright-cli snapshot
# 出力例: e1 [textbox "Email"], e2 [textbox "Password"], e3 [button "Sign In"]

# フォームフィールドを入力する - コードが自動的に生成される
playwright-cli fill e1 "user@example.com"
# 実行された Playwright コード:
# await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');

playwright-cli fill e2 "password123"
# 実行された Playwright コード:
# await page.getByRole('textbox', { name: 'Password' }).fill('password123');

playwright-cli click e3
# 実行された Playwright コード:
# await page.getByRole('button', { name: 'Sign In' }).click();
```

## テストファイルの構築

生成されたコードを Playwright のテストにまとめます:

```typescript
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  // playwright-cli セッションから生成されたコード:
  await page.goto('https://example.com/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // アサーションを追加する
  await expect(page).toHaveURL(/.*dashboard/);
});
```

## ベストプラクティス

### 1. セマンティックなロケーターを使う

生成されるコードは可能な限り role ベースのロケーターを使用し、これはより堅牢です:

```typescript
// 生成されたもの（良い - セマンティック）
await page.getByRole('button', { name: 'Submit' }).click();

// 避けるべきもの（脆い - CSS セレクター）
await page.locator('#submit-btn').click();
```

### 2. 記録する前に探索する

アクションを記録する前に、スナップショットを取得してページ構造を把握します:

```bash
playwright-cli open https://example.com
playwright-cli snapshot
# 要素の構造を確認する
playwright-cli click e5
```

### 3. アサーションは手動で追加する

生成されるコードはアクションを捕捉しますが、アサーションは捕捉しません。推奨されるマッチャーのいずれかを使って、テストに期待値を追加してください:

- `toBeVisible()` — 要素がレンダリングされ、表示されている
- `toHaveText(text)` — 要素のテキスト内容が一致する
- `toHaveValue(value) / toBeEmpty()` — input/select の値が一致する
- `toBeChecked() / toBeUnchecked()` — チェックボックスの状態が一致する
- `toMatchAriaSnapshot(snapshot)` — ページ（またはロケーター）が部分的なアクセシビリティスナップショットに一致する

アサーション用のロケーター式を生成するには `playwright-cli generate-locator <target>` を使い、期待値を捕捉するには snapshot/eval コマンドを使います。

テキスト内容をアサートする場合、生成されるロケーターに要素自体のテキストが含まれないようにしてください。`getByTestId()` や `getByLabel()` はテキストのアサーションでうまく機能することが多いです。ロケーターがテキストベースの場合は、代わりに `toBeVisible()` を使うことを推奨します。

一致させるスナップショットはすべての情報を含む必要はありません。アサーションに必要なものだけを捕捉してください。不安定な値には正規表現を使用できます。

```bash
# アサーションで使う、要素 ref に対する安定したロケーターを取得する
playwright-cli --raw generate-locator e5
# getByRole('button', { name: 'Submit' })

# toHaveText 用に期待するテキスト内容を捕捉する
playwright-cli --raw eval "el => el.textContent" e5

# toHaveValue/toBeEmpty 用に期待する input の値を捕捉する
playwright-cli --raw eval "el => el.value" e5

# toMatchAriaSnapshot/toBeChecked 用に期待する aria スナップショットを捕捉する
# （ページ全体、または ref を使って特定の領域にスコープする）
playwright-cli --raw snapshot
playwright-cli --raw snapshot e5
```

```typescript
// 生成されたアクション
await page.getByRole('button', { name: 'Submit' }).click();

// 上記の出力を使った手動のアサーション:
await expect(page.getByRole('alert', { name: 'Success' })).toBeVisible();
await expect(page.getByTestId('main-header')).toHaveText('Welcome, user');
await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('user@example.com');
await expect(page.getByRole('checkbox', { name: 'Enable notifications' })).toBeChecked();

// ページ全体に対する toMatchAriaSnapshot は、一致する領域を見つける
await expect(page).toMatchAriaSnapshot(`
  - heading "Welcome, user"
  - link /\\d+ new messages?/
  - button "Sign out"
`);

// 特定の領域にスコープした toMatchAriaSnapshot
await expect(page.getByRole('navigation')).toMatchAriaSnapshot(`
  - link "Home"
  - link /\\d+ new messages?/
  - link "Profile"
`);
```
