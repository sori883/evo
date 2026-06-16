# Playwright テストの実行

Playwright テストを実行するには、`npx playwright test` コマンド、またはパッケージマネージャーのスクリプトを使用します。インタラクティブな html レポートが開かないようにするには、`PLAYWRIGHT_HTML_OPEN=never` 環境変数を使用してください。

```bash
# すべてのテストを実行
PLAYWRIGHT_HTML_OPEN=never npx playwright test

# カスタム npm スクリプト経由ですべてのテストを実行
PLAYWRIGHT_HTML_OPEN=never npm run special-test-command
```

# Playwright テストのデバッグ

失敗している Playwright テストをデバッグするには、`--debug=cli` オプションを付けて実行します。このコマンドはテストを開始時に一時停止し、デバッグ手順を出力します。

**重要**: コマンドはバックグラウンドで実行し、"Debugging Instructions" が出力されるまで出力を確認してください。作業が完了したら必ずコマンドを停止してください。

セッション名を含む手順が出力されたら、`playwright-cli` を使ってそのセッションにアタッチし、ページを探索します。

```bash
# テストを実行
PLAYWRIGHT_HTML_OPEN=never npx playwright test --debug=cli
# ...
# ... "tw-abcdef" セッションのデバッグ手順 ...
# ...

# テストにアタッチ
playwright-cli attach tw-abcdef
```

探索して修正方法を探している間、テストはバックグラウンドで実行し続けてください。
テストは開始時に一時停止しているため、問題が発生している可能性が最も高い箇所で
ステップオーバーするか、一時停止するとよいでしょう。

`playwright-cli` で実行するすべてのアクションは、対応する Playwright の TypeScript コードを生成します。
このコードは出力に表示され、テストに直接コピーできます。ほとんどの場合は特定の locator や expectation を更新することになりますが、アプリ側のバグである可能性もあります。状況に応じて判断してください。

テストを修正したら、バックグラウンドのテスト実行を停止します。再実行してテストが通ることを確認してください。
