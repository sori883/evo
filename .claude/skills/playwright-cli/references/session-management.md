# ブラウザセッション管理

状態を保持しつつ、複数の分離されたブラウザセッションを同時に実行します。

## 名前付きブラウザセッション

`-s` フラグを使ってブラウザコンテキストを分離します:

```bash
# ブラウザ1: 認証フロー
playwright-cli -s=auth open https://app.example.com/login

# ブラウザ2: 公開ブラウジング（cookie やストレージは別管理）
playwright-cli -s=public open https://example.com

# コマンドはブラウザセッションごとに分離される
playwright-cli -s=auth fill e1 "user@example.com"
playwright-cli -s=public snapshot
```

## ブラウザセッションの分離特性

各ブラウザセッションは以下を独立して持ちます:
- Cookie
- LocalStorage / SessionStorage
- IndexedDB
- Cache
- ブラウジング履歴
- 開いているタブ

## ブラウザセッションコマンド

```bash
# すべてのブラウザセッションを一覧表示
playwright-cli list

# ブラウザセッションを停止する（ブラウザを閉じる）
playwright-cli close                # デフォルトのブラウザを停止
playwright-cli -s=mysession close   # 名前付きブラウザを停止

# すべてのブラウザセッションを停止
playwright-cli close-all

# すべての daemon プロセスを強制終了する（古い／ゾンビプロセス対策）
playwright-cli kill-all

# ブラウザセッションのユーザーデータ（profile ディレクトリ）を削除
playwright-cli delete-data                # デフォルトのブラウザデータを削除
playwright-cli -s=mysession delete-data   # 名前付きブラウザのデータを削除
```

## 環境変数

環境変数でデフォルトのブラウザセッション名を設定します:

```bash
export PLAYWRIGHT_CLI_SESSION="mysession"
playwright-cli open example.com  # 自動的に "mysession" を使用する
```

## よくあるパターン

### 並列スクレイピング

```bash
#!/bin/bash
# 複数のサイトを並列にスクレイピングする

# すべてのブラウザを起動
playwright-cli -s=site1 open https://site1.com &
playwright-cli -s=site2 open https://site2.com &
playwright-cli -s=site3 open https://site3.com &
wait

# それぞれからスナップショットを取得
playwright-cli -s=site1 snapshot
playwright-cli -s=site2 snapshot
playwright-cli -s=site3 snapshot

# クリーンアップ
playwright-cli close-all
```

### A/B テストセッション

```bash
# 異なるユーザー体験をテストする
playwright-cli -s=variant-a open "https://app.com?variant=a"
playwright-cli -s=variant-b open "https://app.com?variant=b"

# 比較する
playwright-cli -s=variant-a screenshot
playwright-cli -s=variant-b screenshot
```

### 永続プロファイル

デフォルトでは、ブラウザの profile はメモリ上にのみ保持されます。`open` に `--persistent` フラグを付けると、ブラウザの profile をディスクに永続化できます:

```bash
# 永続プロファイルを使用する（場所は自動生成）
playwright-cli open https://example.com --persistent

# 永続プロファイルをカスタムディレクトリで使用する
playwright-cli open https://example.com --profile=/path/to/profile
```

## 実行中のブラウザへのアタッチ

新しいブラウザを起動する代わりに、すでに実行中のブラウザへ接続するには `attach` を使います。

### チャンネル名でアタッチ

実行中の Chrome または Edge インスタンスにチャンネル名で接続します。対象のブラウザでリモートデバッグが有効になっている必要があります。対象ブラウザで `chrome://inspect/#remote-debugging` を開き、"Allow remote debugging for this browser instance" をチェックしてください。

```bash
# Chrome にアタッチ
playwright-cli attach --cdp=chrome

# Chrome Canary にアタッチ
playwright-cli attach --cdp=chrome-canary

# Microsoft Edge にアタッチ
playwright-cli attach --cdp=msedge

# Edge Dev にアタッチ
playwright-cli attach --cdp=msedge-dev
```

サポートされているチャンネル: `chrome`, `chrome-beta`, `chrome-dev`, `chrome-canary`, `msedge`, `msedge-beta`, `msedge-dev`, `msedge-canary`。

`--session` を指定しない場合、セッションはチャンネル名に基づいて命名されます（例: `--cdp=msedge` は `msedge` という名前のセッションを作成）。これにより、Chrome と Edge への並列アタッチが `default` で衝突しません。上書きするには `--session=<name>` を渡してください。

### CDP エンドポイント経由でアタッチ

Chrome DevTools Protocol エンドポイントを公開しているブラウザに接続します:

```bash
playwright-cli attach --cdp=http://localhost:9222
```

### ブラウザ拡張機能経由でアタッチ

Playwright 拡張機能がインストールされたブラウザに接続します:

```bash
playwright-cli attach --extension
```

### デタッチ

外部ブラウザに影響を与えずに、アタッチしたセッションを破棄します:

```bash
# デフォルトのアタッチ済みセッションをデタッチ
playwright-cli detach

# 特定のアタッチ済みセッションをデタッチ
playwright-cli -s=msedge detach
```

`detach` は `attach` で作成したセッションに対してのみ機能します。`open` で作成したセッションには `close` を使ってください。

## デフォルトのブラウザセッション

`-s` を省略すると、コマンドはデフォルトのブラウザセッションを使用します:

```bash
# これらは同じデフォルトのブラウザセッションを使用する
playwright-cli open https://example.com
playwright-cli snapshot
playwright-cli close  # デフォルトのブラウザを停止する
```

## ブラウザセッションの設定

開くときに、特定の設定でブラウザセッションを構成します:

```bash
# config ファイルを指定して開く
playwright-cli open https://example.com --config=.playwright/my-cli.json

# 特定のブラウザで開く
playwright-cli open https://example.com --browser=firefox

# headed モードで開く
playwright-cli open https://example.com --headed

# 永続プロファイルで開く
playwright-cli open https://example.com --persistent
```

## ベストプラクティス

### 1. ブラウザセッションには意味のある名前を付ける

```bash
# GOOD: 目的が明確
playwright-cli -s=github-auth open https://github.com
playwright-cli -s=docs-scrape open https://docs.example.com

# AVOID: 汎用的な名前
playwright-cli -s=s1 open https://github.com
```

### 2. 必ずクリーンアップする

```bash
# 終わったらブラウザを停止する
playwright-cli -s=auth close
playwright-cli -s=scrape close

# あるいは一括ですべて停止する
playwright-cli close-all

# ブラウザが応答しなくなったり、ゾンビプロセスが残ったりした場合
playwright-cli kill-all
```

### 3. 古いブラウザデータを削除する

```bash
# 古いブラウザデータを削除してディスク容量を解放する
playwright-cli -s=oldsession delete-data
```
