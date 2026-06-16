# CLAUDE.md

このリポジトリで作業するエージェント（Claude / サブエージェント）向けの運用ルール。
**日本語で応答・記述する。** 技術用語・コード識別子は原文のまま。

---

## 開発フロー（Loop Engineering + TDD + クロスレビュー）

このプロジェクトは **Linear をメモリ/状態のバックエンド**、**GitHub を実装成果物と検証証跡の場所**、
**t-wada 流 TDD**、**各工程後の独立クロスレビュー**で進める。関連 skill:
`loop-engineering` / `linear-memory` / `tdd-cycle` / `cross-review-gates` / `github-workflow`。

### work item のループ

1. **triage / plan**: work item を Linear issue として特定・claim（status を In Progress に、owner 設定）。計画・受け入れ基準を issue 本文 or コメントに記録。`planner` / `architect` / `explorer` を必要に応じて使う。
2. **test（Red）**: テストリストを作り、失敗するテストを書く。意図を Linear に記録。
3. **implement（Green）**: テストを通す最小実装。`implementer` を使ってよい。
4. **refactor**: 重複除去・命名改善。`refactor-cleaner` を使ってよい。テストは緑のまま。
5. **phase-reviewer によるクロスレビュー**: 各 phase（plan / test / implement / refactor）の成果物を `phase-reviewer` サブエージェント（読み取り専用・別エージェント）が APPROVE / REJECT / ESCALATE 判定。REJECT なら是正してから次へ。
6. **verifier による最終検証**: work item を Done にする前に `verifier` サブエージェント（読み取り専用）が、目的達成・テスト成功・スコープ・完了証跡を検証し APPROVE / REJECT / ESCALATE。
7. **記録**: 実行ログ・検証結果・判断・GitHub リンク（PR/commit/CI）を Linear issue のコメントに残す。status を In Review → Done に更新。

### 重要原則

- **実装者とレビュアーは別エージェント**。`phase-reviewer` / `verifier` は読み取り専用で、ファイル・Linear・GitHub を変更しない。変更を検知したら ESCALATE。
- **完了の証跡**: 「Done」にできるのは、受け入れ基準を満たし、関連テスト/検証コマンドが成功し、失敗を隠す回避策がない場合のみ。テストが落ちている・実装が部分的なら In Progress のまま。
- **書き込み境界**: 各 work item は宣言したスコープのファイルのみ変更する。スコープ外に波及する場合は新しい work item を作る。

---

## Linear 運用（メモリバックエンド）

- **team: `evo`**（このプロジェクト専用。`Sori883` team は別プロジェクトなので使わない）。
- **work item = Linear issue**。粒度はレビュー可能な単位（例: 「infra: Cognito Construct」「agents/chat: Memoryラッパ」）。
- 大きな塊は親 issue（エピック）+ sub-issue（`parentId` で紐付け）で構成する。
- **status**: Backlog → Todo → In Progress → In Review → Done（Canceled / Duplicate もあり）。
- **実装ログ・判断・検証結果は issue のコメント**に記録する（チャット文脈ではなく Linear を source of truth にする）。
- **issue タイトルは日本語**で書く。
- 人間の判断が必要な事項は **Linear に human escalation** として残しつつ、本セッションでもトリアージ（後述）する。

---

## GitHub 運用（成果物・証跡）

- repository: `github.com/sori883/evo`、base branch: `main`、`gh` CLI 認証済み（account: sori883）。
- **Linear が source of truth**。GitHub 上の出来事は Linear に link と要約を残す。
- **branch**: `claude/<topic>`（Linear issue ID があれば `claude/<issue-id>-<topic>`）。`main` に直接コミットしない。
- **commit / push / PR は user が許可した場合のみ**行う。勝手に push しない。
- commit message / PR には Linear issue への参照（`References <issue-id>` / 完了時のみ `Fixes <issue-id>`）を含める。
- PR 本文は `## 概要` / `## 検証` / `## リンク` の3節。検証結果と Linear issue を必ず貼る。
- secret / token / log / 思考過程を commit や PR に含めない。
- PR URL・CI 結果・検証結果は Linear issue のコメントにも記録する。

---

## 自律進行とトリアージ方針

- **基本は自律的に進める**。設計・実装・テスト・レビューは止まらずに回す。
- **人間に確認するのは「自分で決められない／調べても分からないこと」だけ**にする。例:
  - 外部サービスのアカウント固有情報（Linear の team/project 選択、AWS アカウント/プロファイル）
  - 不可逆・外部公開を伴う操作（deploy, push, PR 作成、リソース削除）
  - 仕様の本質的な分岐で、コードや既存方針から妥当な既定値を導けないもの
- それ以外（ライブラリ選定、ファイル構成、命名、テスト設計など）は**推奨案で進め**、結果を簡潔に報告する。
- 判断に迷い人間に委ねる場合は、`triage` 相当の整理（優先度・対応可否・選択肢）をして Linear にも残す。

---

## サブエージェントの使い分け

| エージェント | 用途 |
|---|---|
| `explorer` | コードパス・依存・既存パターン・リスクの読み取り専用調査 |
| `planner` / `architect` | 計画立案・アーキテクチャ判断 |
| `implementer` | claim 済み work item のスコープ限定実装（TDD） |
| `refactor-cleaner` | リファクタリング |
| `phase-reviewer` | 各 phase 後の独立クロスレビュー（読み取り専用、APPROVE/REJECT/ESCALATE） |
| `verifier` | Done 前の最終検証（読み取り専用） |
| `triage` | issue/CI/PR の読み取り専用トリアージ |
| `tech-docs-search-agent` | 最新ドキュメント・ベストプラクティス調査 |

`phase-reviewer` と `verifier` は **必ず実装者と別エージェント**として起動する。

---
