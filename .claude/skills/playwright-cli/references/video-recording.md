# 動画録画

ブラウザ自動化セッションを動画としてキャプチャし、デバッグ、ドキュメント作成、検証に活用します。WebM（VP8/VP9 コーデック）を生成します。

## 基本的な録画

```bash
# まずブラウザを開く
playwright-cli open

# 録画を開始
playwright-cli video-start demo.webm

# セクションの切り替え用にチャプターマーカーを追加
playwright-cli video-chapter "Getting Started" --description="Opening the homepage" --duration=2000

# 移動してアクションを実行
playwright-cli goto https://example.com
playwright-cli snapshot
playwright-cli click e1

# 別のチャプターを追加
playwright-cli video-chapter "Filling Form" --description="Entering test data" --duration=2000
playwright-cli fill e2 "test input"

# 停止して保存
playwright-cli video-stop
```

## ベストプラクティス

### 1. 説明的なファイル名を使う

```bash
# ファイル名にコンテキストを含める
playwright-cli video-start recordings/login-flow-2024-01-15.webm
playwright-cli video-start recordings/checkout-test-run-42.webm
```

### 2. ヒーロースクリプト全体を録画する

ユーザー向けの動画や作業の証跡として動画を録画する場合は、コードスニペットを作成して run-code で実行するのが最適です。
これにより、アクション間に適切なポーズを挟んだり、動画に注釈を付けたりできます。そのための新しい Playwright API があります。

1) CLI を使ってシナリオを実行し、すべての locator とアクションを記録しておきます。ハイライト用に bounding box を要求する際にこれらの locator が必要になります。
2) 動画用の意図したスクリプト（下記）を含むファイルを作成します。きれいなタイピングのために pressSequentially を delay 付きで使い、適度なポーズを挟みます。
3) playwright-cli run-code --filename your-script.js を使います。

**重要**: オーバーレイは `pointer-events: none` であり、ページの操作を妨げません。クリック、入力、その他あらゆる操作をページ上で行う間も、固定オーバーレイを安全に表示し続けられます。

```js
async page => {
  await page.screencast.start({ path: 'video.webm', size: { width: 1280, height: 800 } });
  await page.goto('https://demo.playwright.dev/todomvc');

  // チャプターカードを表示する — ページをぼかしてダイアログを表示する。
  // duration が経過するまでブロックし、その後自動的に削除される。
  // 単純なユースケースにはこれを使うが、await page.screencast.showOverlay() で
  // 独自の美しいオーバーレイを自作しても構わない。
  await page.screencast.showChapter('Adding Todo Items', {
    description: 'We will add several items to the todo list.',
    duration: 2000,
  });

  // アクションを実行
  await page.getByRole('textbox', { name: 'What needs to be done?' }).pressSequentially('Walk the dog', { delay: 60 });
  await page.getByRole('textbox', { name: 'What needs to be done?' }).press('Enter');
  await page.waitForTimeout(1000);

  // 次のチャプターを表示
  await page.screencast.showChapter('Verifying Results', {
    description: 'Checking the item appeared in the list.',
    duration: 2000,
  });

  // アクションの実行中も残る固定の注釈を追加する。
  // オーバーレイは pointer-events: none なので、クリックを妨げない。
  const annotation = await page.screencast.showOverlay(`
    <div style="position: absolute; top: 8px; right: 8px;
      padding: 6px 12px; background: rgba(0,0,0,0.7);
      border-radius: 8px; font-size: 13px; color: white;">
      ✓ Item added successfully
    </div>
  `);

  // 注釈が表示されている間にさらにアクションを実行
  await page.getByRole('textbox', { name: 'What needs to be done?' }).pressSequentially('Buy groceries', { delay: 60 });
  await page.getByRole('textbox', { name: 'What needs to be done?' }).press('Enter');
  await page.waitForTimeout(1500);

  // 終わったら注釈を削除する
  await annotation.dispose();

  // 関連する locator をハイライトして、文脈に応じた注釈を付けることもできる。
  const bounds = await page.getByText('Walk the dog').boundingBox();
  await page.screencast.showOverlay(`
    <div style="position: absolute;
      top: ${bounds.y}px;
      left: ${bounds.x}px;
      width: ${bounds.width}px;
      height: ${bounds.height}px;
      border: 1px solid red;">
    </div>
    <div style="position: absolute;
      top: ${bounds.y + bounds.height + 5}px;
      left: ${bounds.x + bounds.width / 2}px;
      transform: translateX(-50%);
      padding: 6px;
      background: #808080;
      border-radius: 10px;
      font-size: 14px;
      color: white;">Check it out, it is right above this text
    </div>
  `, { duration: 2000 });

  await page.screencast.stop();
}
```

創造性を発揮しましょう。オーバーレイは強力です。

### オーバーレイ API のまとめ

| メソッド | ユースケース |
|--------|--------|
| `page.screencast.showChapter(title, { description?, duration?, styleSheet? })` | 背景をぼかした全画面のチャプターカード — セクションの切り替えに最適 |
| `page.screencast.showOverlay(html, { duration? })` | カスタム HTML オーバーレイ — 吹き出し、ラベル、ハイライトに使う |
| `disposable.dispose()` | duration なしで追加した固定オーバーレイを削除する |
| `page.screencast.hideOverlays()` / `page.screencast.showOverlays()` | すべてのオーバーレイを一時的に非表示/表示する |

## トレーシングと動画の比較

| 機能 | 動画 | トレーシング |
|---------|-------|---------|
| 出力 | WebM ファイル | トレースファイル（Trace Viewer で閲覧可能） |
| 表示内容 | 視覚的な録画 | DOM スナップショット、ネットワーク、コンソール、アクション |
| ユースケース | デモ、ドキュメント | デバッグ、分析 |
| サイズ | 大きい | 小さい |

## 制限事項

- 録画は自動化にわずかなオーバーヘッドを追加します
- 大きな録画はかなりのディスク容量を消費する可能性があります
