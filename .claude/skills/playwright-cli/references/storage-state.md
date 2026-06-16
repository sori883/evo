# ストレージ管理

cookie、localStorage、sessionStorage、およびブラウザのストレージ状態を管理します。

## ストレージ状態 (Storage State)

cookie とストレージを含むブラウザの完全な状態を保存・復元します。

### ストレージ状態を保存する

```bash
# 自動生成されるファイル名で保存する (storage-state-{timestamp}.json)
playwright-cli state-save

# 指定したファイル名で保存する
playwright-cli state-save my-auth-state.json
```

### ストレージ状態を復元する

```bash
# ファイルからストレージ状態を読み込む
playwright-cli state-load my-auth-state.json

# cookie を反映させるためページを再読み込みする
playwright-cli open https://example.com
```

### ストレージ状態ファイルのフォーマット

保存されるファイルには以下が含まれます:

```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "abc123",
      "domain": "example.com",
      "path": "/",
      "expires": 1735689600,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": [
        { "name": "theme", "value": "dark" },
        { "name": "user_id", "value": "12345" }
      ]
    }
  ]
}
```

## Cookie

### すべての cookie を一覧表示する

```bash
playwright-cli cookie-list
```

### ドメインで cookie をフィルタする

```bash
playwright-cli cookie-list --domain=example.com
```

### パスで cookie をフィルタする

```bash
playwright-cli cookie-list --path=/api
```

### 特定の cookie を取得する

```bash
playwright-cli cookie-get session_id
```

### cookie を設定する

```bash
# 基本的な cookie
playwright-cli cookie-set session abc123

# オプション付きの cookie
playwright-cli cookie-set session abc123 --domain=example.com --path=/ --httpOnly --secure --sameSite=Lax

# 有効期限付きの cookie (Unix タイムスタンプ)
playwright-cli cookie-set remember_me token123 --expires=1735689600
```

### cookie を削除する

```bash
playwright-cli cookie-delete session_id
```

### すべての cookie をクリアする

```bash
playwright-cli cookie-clear
```

### 応用: 複数の cookie やカスタムオプション

一度に複数の cookie を追加するような複雑なシナリオでは `run-code` を使用します:

```bash
playwright-cli run-code "async page => {
  await page.context().addCookies([
    { name: 'session_id', value: 'sess_abc123', domain: 'example.com', path: '/', httpOnly: true },
    { name: 'preferences', value: JSON.stringify({ theme: 'dark' }), domain: 'example.com', path: '/' }
  ]);
}"
```

## Local Storage

### すべての localStorage 項目を一覧表示する

```bash
playwright-cli localstorage-list
```

### 単一の値を取得する

```bash
playwright-cli localstorage-get token
```

### 値を設定する

```bash
playwright-cli localstorage-set theme dark
```

### JSON 値を設定する

```bash
playwright-cli localstorage-set user_settings '{"theme":"dark","language":"en"}'
```

### 単一の項目を削除する

```bash
playwright-cli localstorage-delete token
```

### すべての localStorage をクリアする

```bash
playwright-cli localstorage-clear
```

### 応用: 複数の操作

一度に複数の値を設定するような複雑なシナリオでは `run-code` を使用します:

```bash
playwright-cli run-code "async page => {
  await page.evaluate(() => {
    localStorage.setItem('token', 'jwt_abc123');
    localStorage.setItem('user_id', '12345');
    localStorage.setItem('expires_at', Date.now() + 3600000);
  });
}"
```

## Session Storage

### すべての sessionStorage 項目を一覧表示する

```bash
playwright-cli sessionstorage-list
```

### 単一の値を取得する

```bash
playwright-cli sessionstorage-get form_data
```

### 値を設定する

```bash
playwright-cli sessionstorage-set step 3
```

### 単一の項目を削除する

```bash
playwright-cli sessionstorage-delete step
```

### sessionStorage をクリアする

```bash
playwright-cli sessionstorage-clear
```

## IndexedDB

### データベースを一覧表示する

```bash
playwright-cli run-code "async page => {
  return await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return databases;
  });
}"
```

### データベースを削除する

```bash
playwright-cli run-code "async page => {
  await page.evaluate(() => {
    indexedDB.deleteDatabase('myDatabase');
  });
}"
```

## よくあるパターン

### 認証状態の再利用

```bash
# ステップ 1: ログインして状態を保存する
playwright-cli open https://app.example.com/login
playwright-cli snapshot
playwright-cli fill e1 "user@example.com"
playwright-cli fill e2 "password123"
playwright-cli click e3

# 認証済みの状態を保存する
playwright-cli state-save auth.json

# ステップ 2: 後で状態を復元してログインをスキップする
playwright-cli state-load auth.json
playwright-cli open https://app.example.com/dashboard
# すでにログイン済み!
```

### 保存と復元のラウンドトリップ

```bash
# 認証状態を設定する
playwright-cli open https://example.com
playwright-cli eval "() => { document.cookie = 'session=abc123'; localStorage.setItem('user', 'john'); }"

# 状態をファイルに保存する
playwright-cli state-save my-session.json

# ... 後で、新しいセッションで ...

# 状態を復元する
playwright-cli state-load my-session.json
playwright-cli open https://example.com
# cookie と localStorage が復元される!
```

## セキュリティに関する注意

- 認証トークンを含むストレージ状態ファイルは絶対にコミットしないこと
- `.gitignore` に `*.auth-state.json` を追加すること
- 自動化が完了したら状態ファイルを削除すること
- 機密データには環境変数を使用すること
- デフォルトでは、セッションはインメモリモードで実行され、機密性の高い操作にとってより安全です
