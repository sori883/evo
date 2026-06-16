---
name: github-workflow
description: GitHub をコーディングエージェントループの作業面として使うための Skill。Codex またはサブエージェントが GitHub repository、branch、commit、pull request、review comment、CI/check failure、release note、GitHub issue を読む・作る・更新する必要があるときに使う。Linear をメモリバックエンドとするプロジェクトでは、GitHub は実装成果物と検証証跡の場所として扱い、永続的な作業状態は linear-memory に記録する。
---

# GitHub Workflow

## 概要

GitHub はコードホスティング、branch、PR、CI、review の作業面として使う。Linear が memory backend の場合、GitHub 上の出来事は Linear に link と要約を残し、GitHub 自体を loop memory の source of truth にしない。

## ツール選択

- GitHub MCP が使える場合は、repository、PR、issue、review、check の読み書きに優先して使う。
- GitHub MCP が使えない場合は、`gh` CLI と `git` を使う。
- ローカル Git 操作は repository の既存 branch/worktree 方針に従う。
- 認証、権限、remote repository が不足している場合は推測で進めず、エスカレーションする。

## 作業前に読むもの

1. 対象 repository、base branch、作業 branch、関連 Linear issue または GitHub issue/PR を特定する。
2. 既存 PR、open review comment、CI/check status、最近の関連 commit を確認する。
3. 作業対象が Linear に由来する場合は `$linear-memory` で対象 Issue と最新 Comment を読む。
4. GitHub 上の指摘と Linear 上の memory が矛盾する場合は、Linear を作業状態の source of truth とし、GitHub の内容は証跡として扱う。

## Linear 連携

Linear issue 由来の作業では、GitHub artifact から Linear issue に辿れるようにする。

- 作業開始時に Linear issue identifier を特定する。例: `ENG-123`。
- identifier が不明な場合は、branch、commit、PR を作る前に `$linear-memory` で対象 Issue を確認する。
- Linear issue が存在しない作業では、必要に応じて Linear issue を作るか、人間に確認する。
- branch、commit、PR の少なくとも PR は Linear issue にリンクされる形にする。
- GitHub 側に残した link は `$linear-memory` にも記録する。

Linear/GitHub integration が有効な場合の標準:

- Branch: Linear の「Copy git branch name」を使える場合はそれを使う。手動で作る場合は issue ID を含める。
  - 例: `codex/ENG-123-add-login-e2e`
- Commit: commit message に issue ID と magic word を含める。
  - default: `References ENG-123`
  - issue を閉じる意図がある場合だけ: `Fixes ENG-123`
- PR title: issue ID を含める。
  - 例: `ENG-123 Add login E2E coverage`
- PR description: magic word + issue ID を含める。
  - default: `References ENG-123`
  - merge で完了扱いにしたい場合だけ: `Fixes ENG-123`

複数 issue にまたがる場合は、PR description に複数の issue ID を明示する。自動 close したくない issue には closing magic word を使わない。

## ブランチとコミット

- 並列作業では worktree または独立 branch を使う。
- branch 名は既存方針がなければ `codex/<linear-issue-id>-<short-topic>` を使う。Linear issue がない場合だけ `codex/<short-topic>` を使う。
- 変更は小さく、レビューしやすい単位に保つ。
- commit、push、PR 作成は user request、automation policy、または project rule が許可している場合だけ行う。
- Linear issue 由来の commit では、commit message の body または subject に issue ID と magic word を含める。
- secret、token、private log、chain-of-thought を commit や PR description に含めない。

## プルリクエスト

PR を作る・更新する場合は、本文に次を簡潔に含める。

```md
## 概要

## 検証

## リンク
```

- `概要` には変更内容だけを書く。
- `検証` には実行した test、lint、build、manual check、または未実行理由を書く。
- `リンク` には Linear issue、関連 GitHub issue、branch、commit、CI run、artifact を貼る。
- Linear issue 由来の PR では、title または description に issue ID を含め、description には `References <issue-id>` または `Fixes <issue-id>` を入れる。
- Linear が memory backend の場合は、PR URL と検証結果を `$linear-memory` に記録する。

## CI と Checks

- CI failure は、失敗した job、step、重要な error、関連 commit/PR を確認する。
- 長い log をそのまま貼らず、原因候補と次アクションに要約する。
- flaky か deterministic かを分けて扱う。
- retry は project policy または user request が許可している場合だけ行う。
- CI の結果は PR と Linear memory の両方から辿れるようにする。
- CI run が特定 commit に紐づく場合は、commit SHA と Linear issue identifier を `$linear-memory` に記録する。

## レビューコメント

- review comment は、対象 file、line、指摘内容、対応方針、解決状態に分けて読む。
- 対応した comment には、必要に応じて短い返信または code change で応答する。
- 議論が設計判断や未解決事項になった場合は `$linear-memory` に記録する。
- 承認が必要な判断は GitHub comment だけに閉じず、Linear に human escalation として残す。

## GitHub Issue

このプロジェクトで Linear を memory とする場合、GitHub Issue は主要な work memory として扱わない。

- GitHub Issue から作業を発見した場合は、必要に応じて Linear issue に同期または link する。
- GitHub Issue の comment に実装ログを長く残さない。
- GitHub Issue を閉じる・label 変更する・assignee 変更する場合は project policy に従う。

## 最終応答

GitHub 操作後の最終応答には、次だけを含める。

- 実行した GitHub 操作。
- PR、branch、commit、CI run、review comment などの URL または identifier。
- Linear memory に記録した場合は、その Issue または Comment。
- 残るリスク、未実行検証、人間の判断が必要な事項。
