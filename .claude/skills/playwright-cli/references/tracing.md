# Tracing

デバッグと分析のために、詳細な実行トレースを取得します。トレースには DOM スナップショット、スクリーンショット、ネットワークアクティビティ、コンソールログが含まれます。

## Basic Usage

```bash
# トレース記録を開始
playwright-cli tracing-start

# アクションを実行
playwright-cli open https://example.com
playwright-cli click e1
playwright-cli fill e2 "test"

# トレース記録を停止
playwright-cli tracing-stop
```

## Trace Output Files

トレースを開始すると、Playwright は複数のファイルを含む `traces/` ディレクトリを作成します。

### `trace-{timestamp}.trace`

**Action log** - 以下を含むメインのトレースファイル:
- 実行されたすべてのアクション（clicks、fills、navigations）
- 各アクション前後の DOM スナップショット
- 各ステップでのスクリーンショット
- タイミング情報
- コンソールメッセージ
- ソース位置

### `trace-{timestamp}.network`

**Network log** - 完全なネットワークアクティビティ:
- すべての HTTP リクエストとレスポンス
- リクエストのヘッダーとボディ
- レスポンスのヘッダーとボディ
- タイミング（DNS、connect、TLS、TTFB、download）
- リソースサイズ
- 失敗したリクエストとエラー

### `resources/`

**Resources directory** - キャッシュされたリソース:
- 画像、フォント、スタイルシート、スクリプト
- リプレイ用のレスポンスボディ
- ページ状態を再構築するために必要なアセット

## What Traces Capture

| Category | Details |
|----------|---------|
| **Actions** | クリック、入力、ホバー、キーボード入力、ナビゲーション |
| **DOM** | 各アクション前後の完全な DOM スナップショット |
| **Screenshots** | 各ステップでの視覚的な状態 |
| **Network** | すべてのリクエスト、レスポンス、ヘッダー、ボディ、タイミング |
| **Console** | すべての console.log、warn、error メッセージ |
| **Timing** | 各操作の正確なタイミング |

## Use Cases

### Debugging Failed Actions

```bash
playwright-cli tracing-start
playwright-cli open https://app.example.com

# このクリックは失敗する - なぜ？
playwright-cli click e5

playwright-cli tracing-stop
# トレースを開いて、クリックが試行されたときの DOM 状態を確認する
```

### Analyzing Performance

```bash
playwright-cli tracing-start
playwright-cli open https://slow-site.com
playwright-cli tracing-stop

# ネットワークウォーターフォールを表示して、遅いリソースを特定する
```

### Capturing Evidence

```bash
# ドキュメント用に完全なユーザーフローを記録する
playwright-cli tracing-start

playwright-cli open https://app.example.com/checkout
playwright-cli fill e1 "4111111111111111"
playwright-cli fill e2 "12/25"
playwright-cli fill e3 "123"
playwright-cli click e4

playwright-cli tracing-stop
# トレースには正確なイベントの順序が表示される
```

## Trace vs Video vs Screenshot

| Feature | Trace | Video | Screenshot |
|---------|-------|-------|------------|
| **Format** | .trace ファイル | .webm 動画 | .png/.jpeg 画像 |
| **DOM inspection** | あり | なし | なし |
| **Network details** | あり | なし | なし |
| **Step-by-step replay** | あり | 連続 | 単一フレーム |
| **File size** | 中 | 大 | 小 |
| **Best for** | デバッグ | デモ | クイックキャプチャ |

## Best Practices

### 1. Start Tracing Before the Problem

```bash
# 失敗するステップだけでなく、フロー全体をトレースする
playwright-cli tracing-start
playwright-cli open https://example.com
# ... 問題に至るまでのすべてのステップ ...
playwright-cli tracing-stop
```

### 2. Clean Up Old Traces

トレースは大量のディスク容量を消費する可能性があります:

```bash
# 7 日より古いトレースを削除する
find .playwright-cli/traces -mtime +7 -delete
```

## Limitations

- トレースは自動化にオーバーヘッドを追加する
- 大きなトレースは大量のディスク容量を消費する可能性がある
- 一部の動的コンテンツは完全にはリプレイされない場合がある
