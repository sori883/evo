# カスタム Playwright コードの実行

CLI コマンドではカバーされない高度なシナリオに対して、任意の Playwright コードを実行するには `run-code` を使用します。

## 構文

```bash
playwright-cli run-code "async page => {
  // ここに Playwright コードを記述
  // ブラウザコンテキストの操作には page.context() を使用
}"
```

関数をファイルから読み込むこともできます:

```bash
playwright-cli run-code --filename=./my-script.js
```


コードは単一の関数式である必要があり、`(...)` で囲まれて評価されます。
import/export/require 構文はサポートされていません。

## 位置情報 (Geolocation)

```bash
# 位置情報の権限を付与して位置を設定
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 37.7749, longitude: -122.4194 });
}"

# 位置をロンドンに設定
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 51.5074, longitude: -0.1278 });
}"

# 位置情報のオーバーライドをクリア
playwright-cli run-code "async page => {
  await page.context().clearPermissions();
}"
```

## 権限 (Permissions)

```bash
# 複数の権限を付与
playwright-cli run-code "async page => {
  await page.context().grantPermissions([
    'geolocation',
    'notifications',
    'camera',
    'microphone'
  ]);
}"

# 特定のオリジンに対して権限を付与
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['clipboard-read'], {
    origin: 'https://example.com'
  });
}"
```

## メディアエミュレーション (Media Emulation)

```bash
# ダークカラースキームをエミュレート
playwright-cli run-code "async page => {
  await page.emulateMedia({ colorScheme: 'dark' });
}"

# ライトカラースキームをエミュレート
playwright-cli run-code "async page => {
  await page.emulateMedia({ colorScheme: 'light' });
}"

# モーション軽減をエミュレート
playwright-cli run-code "async page => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}"

# 印刷メディアをエミュレート
playwright-cli run-code "async page => {
  await page.emulateMedia({ media: 'print' });
}"
```

## 待機戦略 (Wait Strategies)

```bash
# ネットワークアイドルを待機
playwright-cli run-code "async page => {
  await page.waitForLoadState('networkidle');
}"

# 特定の要素を待機
playwright-cli run-code "async page => {
  await page.locator('.loading').waitFor({ state: 'hidden' });
}"

# 関数が true を返すまで待機
playwright-cli run-code "async page => {
  await page.waitForFunction(() => window.appReady === true);
}"

# タイムアウト付きで待機
playwright-cli run-code "async page => {
  await page.locator('.result').waitFor({ timeout: 10000 });
}"
```

## フレームと iframe (Frames and Iframes)

```bash
# iframe を操作
playwright-cli run-code "async page => {
  const frame = page.locator('iframe#my-iframe').contentFrame();
  await frame.locator('button').click();
}"

# すべてのフレームを取得
playwright-cli run-code "async page => {
  const frames = page.frames();
  return frames.map(f => f.url());
}"
```

## ファイルのダウンロード (File Downloads)

```bash
# ファイルのダウンロードを処理
playwright-cli run-code "async page => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download' }).click();
  const download = await downloadPromise;
  await download.saveAs('./downloaded-file.pdf');
  return download.suggestedFilename();
}"
```

## クリップボード (Clipboard)

```bash
# クリップボードを読み取る（権限が必要）
playwright-cli run-code "async page => {
  await page.context().grantPermissions(['clipboard-read']);
  return await page.evaluate(() => navigator.clipboard.readText());
}"

# クリップボードに書き込む
playwright-cli run-code "async page => {
  await page.evaluate(text => navigator.clipboard.writeText(text), 'Hello clipboard!');
}"
```

## ページ情報 (Page Information)

```bash
# ページタイトルを取得
playwright-cli run-code "async page => {
  return await page.title();
}"

# 現在の URL を取得
playwright-cli run-code "async page => {
  return page.url();
}"

# ページコンテンツを取得
playwright-cli run-code "async page => {
  return await page.content();
}"

# ビューポートサイズを取得
playwright-cli run-code "async page => {
  return page.viewportSize();
}"
```

## JavaScript の実行 (JavaScript Execution)

```bash
# JavaScript を実行して結果を返す
playwright-cli run-code "async page => {
  return await page.evaluate(() => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled
    };
  });
}"

# evaluate に引数を渡す
playwright-cli run-code "async page => {
  const multiplier = 5;
  return await page.evaluate(m => document.querySelectorAll('li').length * m, multiplier);
}"
```

## エラーハンドリング (Error Handling)

```bash
# run-code 内での try-catch
playwright-cli run-code "async page => {
  try {
    await page.getByRole('button', { name: 'Submit' }).click({ timeout: 1000 });
    return 'clicked';
  } catch (e) {
    return 'element not found';
  }
}"
```

## 複雑なワークフロー (Complex Workflows)

```bash
# ログインして状態を保存
playwright-cli run-code "async page => {
  await page.goto('https://example.com/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('user@example.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
  await page.context().storageState({ path: 'auth.json' });
  return 'Login successful';
}"

# 複数ページからデータをスクレイピング
playwright-cli run-code "async page => {
  const results = [];
  for (let i = 1; i <= 3; i++) {
    await page.goto(\`https://example.com/page/\${i}\`);
    const items = await page.locator('.item').allTextContents();
    results.push(...items);
  }
  return results;
}"
```
