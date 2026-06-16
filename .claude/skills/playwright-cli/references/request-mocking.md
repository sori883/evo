# Request Mocking

ネットワークリクエストの傍受、モック、変更、ブロックを行います。

## CLI Route Commands

```bash
# カスタムステータスでモック
playwright-cli route "**/*.jpg" --status=404

# JSON ボディでモック
playwright-cli route "**/api/users" --body='[{"id":1,"name":"Alice"}]' --content-type=application/json

# カスタムヘッダーでモック
playwright-cli route "**/api/data" --body='{"ok":true}' --header="X-Custom: value"

# リクエストからヘッダーを削除
playwright-cli route "**/*" --remove-header=cookie,authorization

# 有効なルートを一覧表示
playwright-cli route-list

# 特定のルートまたはすべてのルートを削除
playwright-cli unroute "**/*.jpg"
playwright-cli unroute
```

## URL Patterns

```
**/api/users           - パスの完全一致
**/api/*/details       - パス中のワイルドカード
**/*.{png,jpg,jpeg}    - ファイル拡張子のマッチ
**/search?q=*          - クエリパラメータのマッチ
```

## Advanced Mocking with run-code

条件付きレスポンス、リクエストボディの検査、レスポンスの変更、遅延を行う場合:

### Conditional Response Based on Request

```bash
playwright-cli run-code "async page => {
  await page.route('**/api/login', route => {
    const body = route.request().postDataJSON();
    if (body.username === 'admin') {
      route.fulfill({ body: JSON.stringify({ token: 'mock-token' }) });
    } else {
      route.fulfill({ status: 401, body: JSON.stringify({ error: 'Invalid' }) });
    }
  });
}"
```

### 実際のレスポンスを変更

```bash
playwright-cli run-code "async page => {
  await page.route('**/api/user', async route => {
    const response = await route.fetch();
    const json = await response.json();
    json.isPremium = true;
    await route.fulfill({ response, json });
  });
}"
```

### ネットワーク障害をシミュレート

```bash
playwright-cli run-code "async page => {
  await page.route('**/api/offline', route => route.abort('internetdisconnected'));
}"
# オプション: connectionrefused, timedout, connectionreset, internetdisconnected
```

### 遅延レスポンス

```bash
playwright-cli run-code "async page => {
  await page.route('**/api/slow', async route => {
    await new Promise(r => setTimeout(r, 3000));
    route.fulfill({ body: JSON.stringify({ data: 'loaded' }) });
  });
}"
```
