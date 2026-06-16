# Spec-driven testing (plan → generate → heal)

`playwright-cli` を使って Playwright テストを作成・保守するためのエンドツーエンドのワークフローです。以下の 3 つのセクションはそれぞれ独立して利用できます。

- **Planning** — アプリを探索し、何をテストするかを記述した spec ファイルを作成する。
- **Generate** — spec を Playwright のテストファイルに変換する。spec が曖昧だったり古くなっていたら更新する。
- **Heal** — 失敗しているテストを診断し、コードを修正し、spec を実際の挙動と整合させる。

3 つとも同じ仕組みに依存しています。バックグラウンドで `npx playwright test --debug=cli` を実行し、続いて `playwright-cli attach tw-XXXX` で一時停止したページに接続して対話的に操作します。debug/attach の仕組みについては [playwright-tests.md](playwright-tests.md) を、すべての `playwright-cli` アクションがどのように Playwright の TypeScript を出力するかについては [test-generation.md](test-generation.md) を参照してください。

---

## 1. Planning

ゴール: テストするシナリオを列挙した spec ファイル（例: `specs/<feature>.plan.md`）を作成すること。spec は **必ず** ファイルに書き出します。

### 1.1 Prerequisite: workspace

何よりも先に、ワークスペースに Playwright がインストールされているか確認します。

```bash
# 以下のいずれかでワークスペースであることを確認できる:
test -f playwright.config.ts || test -f playwright.config.js
npx --no-install playwright --version
```

Playwright がインストールされていない場合は、ブートストラップしてデフォルト設定をユーザーに選ばせます。

```bash
npm init playwright@latest
```

### 1.2 Prerequisite: seed test

**seed test** とは、すべてのシナリオが起点とする状態（アプリへのナビゲーション、必要なログイン、feature flag など）にページを到達させる最小限のテストです。各シナリオは seed の *後* のまっさらな状態から開始すると仮定します。`--debug=cli` はこの test の *内部* で一時停止するため、すべての planning および generation セッションは seed から始まります。

最小限の seed:

```ts
// tests/seed.spec.ts
import { test } from '@playwright/test';

test('seed', async ({ page }) => {
  await page.goto('https://example.com/');
});
```

推奨 — ナビゲーションを fixture に押し込み、シナリオテストで再利用できるようにします。

```ts
// tests/fixtures.ts
import { test as baseTest } from '@playwright/test';
export { expect } from '@playwright/test';

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.goto('https://example.com/');
    await use(page);
  },
});
```

```ts
// tests/seed.spec.ts
import { test } from './fixtures';

test('seed', async ({ page }) => {
  // fixture が既にナビゲーションを行う。この空の本体は、エージェントに開始地点を示す。
});
```

seed が存在しない場合は、少なくともアプリにナビゲートする seed を作成します。

### 1.3 Explore the app

seed 経由でアプリをバックグラウンドで起動し、attach します。

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/seed.spec.ts --debug=cli
# "Debugging Instructions" とセッション名 tw-XXXX が表示されるのを待つ
playwright-cli attach tw-XXXX
```

resume して seed を実行し、続いてアプリを調べます。

```bash
playwright-cli resume                   # resume して seed test を最後まで実行する
playwright-cli snapshot                 # インタラクティブ要素の一覧
playwright-cli click e5                 # フローをたどる
playwright-cli eval "location.href"     # URL / 状態を読む
playwright-cli show --annotate          # ユーザーに何かを指し示してもらう
```

以下を洗い出します。

- インタラクティブな面（フォーム、ボタン、リスト、フィルタ、モーダル）。
- 主要なユーザージャーニーをエンドツーエンドで。
- エッジケース: 空状態、バリデーションエラー、非常に長い入力、境界値。
- 永続性: リロード、local/session storage、URL フラグメント。
- ナビゲーション: どのコントロールが URL を変えるか、戻る/進むの挙動。

**Important**: playwright-cli でアプリの URL を直接開くだけにせず、必ず test 経由で、そこで行われるカスタムセットアップを取り込むこと。
**Important**: 探索が終わったらバックグラウンドの test を停止すること。

### 1.4 Write the spec file

`specs/<feature>.plan.md` 配下に保存します。次の構造を使います。

```markdown
# <Feature> Test Plan

## Application Overview

<その feature が何をするのか、なぜ重要なのかを 1 段落で記述する。>

## Test Scenarios

### 1. <Group Name>

**Seed:** `tests/seed.spec.ts`

#### 1.1. <kebab-case-scenario-name>

**File:** `tests/<group>/<kebab-case-scenario-name>.spec.ts`

**Steps:**
  1. <具体的なユーザー操作>
    - expect: <観測可能な結果>
    - expect: <別の観測可能な結果>
  2. <次の操作>
    - expect: <結果>

#### 1.2. <next-scenario>
...

### 2. <Next Group>

**Seed:** `tests/seed.spec.ts`
...
```

ガイドライン:

- 各シナリオは独立しており、seed のまっさらな状態から開始する — シナリオを連鎖させてはならない。
- シナリオ名は kebab-case で、テストファイル名と一致させる（`should-add-single-todo` → `should-add-single-todo.spec.ts`）。
- ハッピーパス、エッジケース、バリデーション、ネガティブフロー、永続性をカバーする。
- ステップはユーザーレベルで書く（「input に 'Buy milk' とタイプする」）。API レベル（「`fill` を呼ぶ」）では書かない。
- 観測可能な結果は `- expect:` の箇条書きに入れる。それぞれが generation 時にアサーションになる。

---

## 2. Generate

ゴール: spec ファイルを受け取り、Playwright のテストファイルを生成すること。必要に応じて、内容がずれている spec を更新する。

### 2.1 Inputs

- **Spec file**、例: `specs/basic-operations.plan.md`。
- **Target**: 単一シナリオ（例: `1.2`）、グループ全体（`1`）、または全部のいずれか。
- **Seed file**、シナリオが属するグループの `**Seed:**` 行から読み取る。

### 2.2 Generate one scenario

対象の各シナリオについて、順番に（決して並列にはしない — シナリオは seed セッションを共有する）処理します。

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test <seed-file> --debug=cli   # background
playwright-cli attach tw-XXXX
# resume
```

playwright-cli でアプリの URL を直接開く **だけにはしない**。必ず test 経由で、そこで行われるカスタムセットアップを取り込むこと。

シナリオの `Steps:` を `playwright-cli` で 1 つずつたどります。spec を計画として扱い、動作中のアプリを source of truth として扱います。あるステップが曖昧だったり（「ボタンをクリック」— どのボタン?）、もはや存在しない要素を参照していたり、アプリの実際の挙動と矛盾している場合は、判断を働かせて、アプリの実際の挙動に合わせて spec を更新してから続行します。generation の途中で spec を編集するのは想定内です。

すべてのアクションは、対応する Playwright の TypeScript を出力します（[test-generation.md](test-generation.md) を参照）。

```bash
playwright-cli snapshot                         # ref を見つける
playwright-cli fill e3 "John Doe"               # -> page.getByRole('textbox', {...}).fill(...)
playwright-cli press Enter
playwright-cli click e7
```

`- expect:` の各箇条書きについて、明示的なアサーションを追加します。詳細は [test-generation.md](test-generation.md) を参照してください。

生成されたコードを集め、spec で指定されたパスにテストファイルを書き出します。

```ts
// spec: specs/basic-operations.plan.md
// seed: tests/seed.spec.ts
import { test, expect } from './fixtures';   // または fixtures ファイルがなければ '@playwright/test'

test.describe('Singing in and out', () => {
  test('should sign in', async ({ page }) => {
    // 1. Navigate to the application
    // (seed fixture が処理する)

    // 2. Type 'John Doe' into the username field
    await page.getByRole('textbox', { name: 'username' }).fill('John Doe');

    // 3. Type password
    await page.getByRole('textbox', { name: 'password' }).fill('TestPassword');

    // 4. Press Enter to submit
    await page.getByRole('textbox', { name: 'password' }).press('Enter');

    await expect(page.getByRole('heading')).toContainText('Welcome, John Doe!');
  });
});
```

ルール:

- **1 ファイルにつき 1 テスト。** ファイルパス、describe 名、test 名は spec からそのまま（序数を除いて）取る。
- 番号付きの各ステップには、そのアクションの前に `// N. <step text>` コメントを付ける。
- describe グループ名は spec からそのまま使う（`1.` の序数は付けない）。
- プロジェクトに fixtures があれば `./fixtures` から import する。なければ `@playwright/test` から。
- **Important**: 次のシナリオに移る前に、CLI セッションを閉じ、バックグラウンドの test を停止すること。

### 2.3 Generate multiple scenarios

対象シナリオに対して 2.2 を 1 つずつループします。各テストがクリーンなページから開始するよう、毎回 seed を再起動します。生成されるセッション名がユニークなので並列化しても安全です — ただし各 test run が必ず停止されることを確認してください。

### 2.4 Run generated tests

生成後、新しいテストを一度実行します。

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/<group>/<scenario>.spec.ts
```

失敗があれば Section 3 へ進みます。

---

## 3. Heal

ゴール: 失敗しているテストを修正し、アプリの意図された挙動が変わっていれば spec を更新すること。

### 3.1 Find failing tests

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test
```

失敗している `<file>:<line>` のエントリ一覧を記録し、1 つずつ処理します。並列での修正は試みないでください — 共有状態と単一の CLI セッションのため、不安定になります。

### 3.2 Debug one failure

失敗している単一のテストを debug モードでバックグラウンド実行し、attach します。

```bash
PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/<group>/<scenario>.spec.ts:<line> --debug=cli
# "Debugging Instructions" と tw-XXXX のセッション名が表示されるのを待つ
playwright-cli attach tw-XXXX
```

テストは開始地点で一時停止しています。失敗するアクションまたはアサーションの直前まで step forward または run to で進め、診断します。

```bash
playwright-cli snapshot                # 要素が変わった / 移動した / 名前が変わったか?
playwright-cli console                 # アプリ側のエラーは?
playwright-cli network                 # 失敗したリクエスト? ペイロードが間違っている?
playwright-cli show --annotate         # ユーザーにどこかを指し示してもらう
```

よくある原因: セレクタのドリフト、新しい wrapper 要素、label/ARIA のリネーム、タイミング（トランジション、非同期ロード）、アプリ側でアサーション対象のテキストが更新された、run 間でテストデータが漏れている。

修正後のインタラクションを `playwright-cli` でリハーサルします — 出力に表示される生成コードが、テストに貼り戻すものです。

### 3.3 Apply the fix

テストファイルを編集します。修正後の挙動に合わせて locator、アサーション、ステップ順、入力を更新します。バックグラウンドの debug run を停止します。単一テストを再実行して green になることを確認します。

hook をスキップしたり、修正として sleep を追加してはいけません。`networkidle` を使ってはいけません。

### 3.4 Reconcile with the spec

テストファイルの `// spec:` ヘッダで参照されている spec を開き、そのテストに対応するシナリオを見つけます。

- **修正が純粋に技術的なもの**（locator のドリフト、より良いアサーションの形）で、spec のユーザーレベルの挙動が依然としてアプリと一致している → spec はそのままにする。
- **修正が、spec に記述されたユーザーに見えるステップ・入力・順序・期待される結果を変えた** → 現実に合わせて spec を更新する。シナリオ id とファイルパスは変えずに維持し、step / expect の行だけを変更する。
- **アプリの変更が意図的（spec が古い）なのか、リグレッション（テストが正しく、アプリが間違っている）なのか不明** → **作業を止めてユーザーに尋ねる**。以下を提示する:
  - シナリオ id（例: `2.3`）、
  - もはや一致しない spec の行、
  - 観測されたアプリの挙動（snapshot の抜粋や具体的な結果を引用する）。

ユーザーが答えてから初めて、spec を更新する（意図的な変更）か、テストがバグをカバーしているものとして報告/フラグを立てる（リグレッション）かのいずれかを行います。

### 3.5 Iteration and giving up

- 失敗は 1 つずつ修正し、各修正後に再実行する。
- 徹底的に調査した結果、テストは正しくアプリが間違っていると確信でき *かつ* それがバグであるとユーザーが確認した場合: ユーザーの判断や issue リンクを指すコメントを付けて、テストを `test.fixme(...)` でマークする。決して黙ってスキップしてはならない。

---

## Cross-references

| For... | See |
|---|---|
| `--debug=cli` / attach の仕組み | [playwright-tests.md](playwright-tests.md) |
| `playwright-cli` のアクションがどのように TS になるか | [test-generation.md](test-generation.md) |
| 探索/生成中のリクエストのモック | [request-mocking.md](request-mocking.md) |
| CLI ブラウザセッションの管理 | [session-management.md](session-management.md) |
