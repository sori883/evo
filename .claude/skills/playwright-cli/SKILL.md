---
name: playwright-cli
description: ブラウザ操作の自動化、Web ページのテスト、Playwright テストの実行を行う。
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---

# playwright-cli によるブラウザ自動化

## クイックスタート

```bash
# 新しいブラウザを開く
playwright-cli open
# ページに移動する
playwright-cli goto https://playwright.dev
# snapshot の ref を使ってページを操作する
playwright-cli click e15
playwright-cli type "page.click"
playwright-cli press Enter
# スクリーンショットを撮る（snapshot のほうが一般的なため、ほとんど使わない）
playwright-cli screenshot
# ブラウザを閉じる
playwright-cli close
```

## コマンド

### 基本

```bash
playwright-cli open
# 開いてすぐに移動する
playwright-cli open https://example.com/
playwright-cli goto https://playwright.dev
playwright-cli type "search query"
playwright-cli click e3
playwright-cli dblclick e7
# --submit は要素への入力後に Enter を押す
playwright-cli fill e5 "user@example.com"  --submit
playwright-cli drag e2 e8
# 要素にファイルやデータをドロップする（ページの外部から）
playwright-cli drop e4 --path=./image.png
playwright-cli drop e4 --data="text/plain=hello world"
playwright-cli hover e4
playwright-cli select e9 "option-value"
playwright-cli upload ./document.pdf
playwright-cli check e12
playwright-cli uncheck e12
playwright-cli snapshot
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" e5
# snapshot には表示されない id、class、その他の属性を取得する
playwright-cli eval "el => el.id" e5
playwright-cli eval "el => el.getAttribute('data-testid')" e5
playwright-cli dialog-accept
playwright-cli dialog-accept "confirmation text"
playwright-cli dialog-dismiss
playwright-cli resize 1920 1080
playwright-cli close
```

### ナビゲーション

```bash
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

### キーボード

```bash
playwright-cli press Enter
playwright-cli press ArrowDown
playwright-cli keydown Shift
playwright-cli keyup Shift
```

### マウス

```bash
playwright-cli mousemove 150 300
playwright-cli mousedown
playwright-cli mousedown right
playwright-cli mouseup
playwright-cli mouseup right
playwright-cli mousewheel 0 100
```

### 保存

```bash
playwright-cli screenshot
playwright-cli screenshot e5
playwright-cli screenshot --filename=page.png
playwright-cli pdf --filename=page.pdf
```

### タブ

```bash
playwright-cli tab-list
playwright-cli tab-new
playwright-cli tab-new https://example.com/page
playwright-cli tab-close
playwright-cli tab-close 2
playwright-cli tab-select 0
```

### ストレージ

```bash
playwright-cli state-save
playwright-cli state-save auth.json
playwright-cli state-load auth.json

# Cookie
playwright-cli cookie-list
playwright-cli cookie-list --domain=example.com
playwright-cli cookie-get session_id
playwright-cli cookie-set session_id abc123
playwright-cli cookie-set session_id abc123 --domain=example.com --httpOnly --secure
playwright-cli cookie-delete session_id
playwright-cli cookie-clear

# LocalStorage
playwright-cli localstorage-list
playwright-cli localstorage-get theme
playwright-cli localstorage-set theme dark
playwright-cli localstorage-delete theme
playwright-cli localstorage-clear

# SessionStorage
playwright-cli sessionstorage-list
playwright-cli sessionstorage-get step
playwright-cli sessionstorage-set step 3
playwright-cli sessionstorage-delete step
playwright-cli sessionstorage-clear
```

### ネットワーク

```bash
playwright-cli route "**/*.jpg" --status=404
playwright-cli route "https://api.example.com/**" --body='{"mock": true}'
playwright-cli route-list
playwright-cli unroute "**/*.jpg"
playwright-cli unroute
```

### DevTools

```bash
playwright-cli console
playwright-cli console warning
playwright-cli requests
playwright-cli request 5
playwright-cli run-code "async page => await page.context().grantPermissions(['geolocation'])"
playwright-cli run-code --filename=script.js
playwright-cli tracing-start
playwright-cli tracing-stop
playwright-cli video-start video.webm
playwright-cli video-chapter "Chapter Title" --description="Details" --duration=2000
playwright-cli video-stop

# ユーザーに入力を求めるための注釈プロンプト付きでダッシュボードを起動する
playwright-cli show --annotate

# 要素の ref またはセレクタから Playwright locator を生成する
playwright-cli generate-locator e5 --raw

# 要素に対して永続的なハイライトオーバーレイを表示する（任意でカスタムスタイルを指定可能）
playwright-cli highlight e5
playwright-cli highlight e5 --style="outline: 3px dashed red"
# 単一の要素のハイライトを隠す。対象を指定しない場合はページ上のすべてのハイライトを隠す
playwright-cli highlight e5 --hide
playwright-cli highlight --hide
```

## Raw 出力

グローバルオプション `--raw` は、出力からページステータス、生成されたコード、snapshot セクションを取り除き、結果の値のみを返します。コマンドの出力を他のツールにパイプする際に使用します。出力を生成しないコマンドは何も返しません。

```bash
playwright-cli --raw eval "JSON.stringify(performance.timing)" | jq '.loadEventEnd - .navigationStart'
playwright-cli --raw eval "JSON.stringify([...document.querySelectorAll('a')].map(a => a.href))" > links.json
playwright-cli --raw snapshot > before.yml
playwright-cli click e5
playwright-cli --raw snapshot > after.yml
diff before.yml after.yml
TOKEN=$(playwright-cli --raw cookie-get session_id)
playwright-cli --raw localstorage-get theme
```

すべての応答を JSON として包む構造化出力が必要な場合は --json を指定します
```bash
playwright-cli list --json
```

## open のパラメータ
```bash
# セッション作成時に特定のブラウザを使用する
playwright-cli open --browser=chrome
playwright-cli open --browser=firefox
playwright-cli open --browser=webkit
playwright-cli open --browser=msedge

# 永続プロファイルを使用する（デフォルトではプロファイルはメモリ上にある）
playwright-cli open --persistent
# カスタムディレクトリで永続プロファイルを使用する
playwright-cli open --profile=/path/to/profile

# Playwright Extension 経由でブラウザに接続する
playwright-cli attach --extension=chrome

# 実行中の Chrome または Edge にチャンネル名で接続する
playwright-cli attach --cdp=chrome
playwright-cli attach --cdp=msedge

# CDP エンドポイント経由で実行中のブラウザに接続する
playwright-cli attach --cdp=http://localhost:9222

# 設定ファイルを指定して起動する
playwright-cli open --config=my-config.json

# ブラウザを閉じる
playwright-cli close
# アタッチしたブラウザからデタッチする（外部ブラウザは起動したまま）
playwright-cli -s=msedge detach
# デフォルトセッションのユーザーデータを削除する
playwright-cli delete-data
```

## Snapshot

各コマンドの実行後、playwright-cli は現在のブラウザ状態の snapshot を提供します。

```bash
> playwright-cli goto https://example.com
### Page
- Page URL: https://example.com/
- Page Title: Example Domain
### Snapshot
[Snapshot](.playwright-cli/page-2026-02-14T19-22-42-679Z.yml)
```

`playwright-cli snapshot` コマンドを使って必要なときに snapshot を取得することもできます。以下のオプションは必要に応じて組み合わせられます。

```bash
# デフォルト - タイムスタンプベースの名前でファイルに保存する
playwright-cli snapshot

# ファイルに保存する。snapshot がワークフローの成果物の一部である場合に使用する
playwright-cli snapshot --filename=after-click.yaml

# ページ全体ではなく要素の snapshot を取得する
playwright-cli snapshot "#main"

# 効率化のため snapshot の深さを制限し、その後で部分的な snapshot を取得する
playwright-cli snapshot --depth=4
playwright-cli snapshot e34

# 各要素のバウンディングボックスを [box=x,y,width,height] として含める
playwright-cli snapshot --boxes
```

## 要素の指定

デフォルトでは、snapshot の ref を使ってページ要素を操作します。

```bash
# ref 付きの snapshot を取得する
playwright-cli snapshot

# ref を使って操作する
playwright-cli click e15
```

CSS セレクタや Playwright locator を使うこともできます。

```bash
# CSS セレクタ
playwright-cli click "#main > button.submit"

# role locator
playwright-cli click "getByRole('button', { name: 'Submit' })"

# test id
playwright-cli click "getByTestId('submit-button')"
```

## ブラウザセッション

```bash
# 永続プロファイルで "mysession" という名前の新しいブラウザセッションを作成する
playwright-cli -s=mysession open example.com --persistent
# 同様だが、プロファイルディレクトリを手動で指定する（明示的に要求された場合に使用する）
playwright-cli -s=mysession open example.com --profile=/path/to/profile
playwright-cli -s=mysession click e6
playwright-cli -s=mysession close  # 名前付きブラウザを停止する
playwright-cli -s=mysession delete-data  # 永続セッションのユーザーデータを削除する

playwright-cli list
# すべてのブラウザを閉じる
playwright-cli close-all
# すべてのブラウザプロセスを強制終了する
playwright-cli kill-all
```

## インストール

グローバルの `playwright-cli` コマンドが利用できない場合は、`npx playwright-cli` でローカルバージョンを試します。

```bash
npx --no-install playwright-cli --version
```

ローカルバージョンが利用できる場合は、すべてのコマンドで `npx playwright-cli` を使用します。利用できない場合は、`playwright-cli` をグローバルコマンドとしてインストールします。

```bash
npm install -g @playwright/cli@latest
```

## 例: フォームの送信

```bash
playwright-cli open https://example.com/form
playwright-cli snapshot

playwright-cli fill e1 "user@example.com"
playwright-cli fill e2 "password123"
playwright-cli click e3
playwright-cli snapshot
playwright-cli close
```

## 例: 複数タブのワークフロー

```bash
playwright-cli open https://example.com
playwright-cli tab-new https://example.com/other
playwright-cli tab-list
playwright-cli tab-select 0
playwright-cli snapshot
playwright-cli close
```

## 例: DevTools を使ったデバッグ

```bash
playwright-cli open https://example.com
playwright-cli click e4
playwright-cli fill e7 "test"
playwright-cli console
playwright-cli requests
playwright-cli close
```

```bash
playwright-cli open https://example.com
playwright-cli tracing-start
playwright-cli click e4
playwright-cli fill e7 "test"
playwright-cli tracing-stop
playwright-cli close
```

## 例: インタラクティブセッション

ユーザーに UI への注釈を求めます。ユーザーは注釈を使って文脈に応じたタスクを指示したり、質問したりできます。

```bash
playwright-cli open https://example.com
playwright-cli show --annotate
```

## 個別タスク

* **Playwright テストの実行とデバッグ** [references/playwright-tests.md](references/playwright-tests.md)
* **リクエストのモック** [references/request-mocking.md](references/request-mocking.md)
* **Playwright コードの実行** [references/running-code.md](references/running-code.md)
* **ブラウザセッションの管理** [references/session-management.md](references/session-management.md)
* **仕様駆動テスト（plan / generate / heal）** [references/spec-driven-testing.md](references/spec-driven-testing.md)
* **ストレージ状態（cookie、localStorage）** [references/storage-state.md](references/storage-state.md)
* **テストの生成** [references/test-generation.md](references/test-generation.md)
* **トレーシング** [references/tracing.md](references/tracing.md)
* **動画の記録** [references/video-recording.md](references/video-recording.md)
* **要素属性の検査** [references/element-attributes.md](references/element-attributes.md)
