---
description: GitHub CLI (gh) の包括的リファレンス。リポジトリ、issue、プルリクエスト、Actions、プロジェクト、リリース、gist、codespace、組織、拡張機能など、コマンドラインからのあらゆる GitHub 操作を網羅する。
metadata:
    github-path: skills/gh-cli
    github-pinned: 68120732cf9e69de8bec6a2b06a57b7463222440
    github-ref: 68120732cf9e69de8bec6a2b06a57b7463222440
    github-repo: https://github.com/github/awesome-copilot
    github-tree-sha: 437437f7f20bcdbbdb3081cf164435a388c0a39a
name: gh-cli
---
# GitHub CLI (gh)

GitHub CLI (gh) の包括的リファレンス。コマンドラインから GitHub をシームレスに操作できる。

**バージョン:** 2.85.0（2026年1月時点の最新）

## 前提条件

### インストール

```bash
# macOS
brew install gh

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Windows
winget install --id GitHub.cli

# インストールの確認
gh --version
```

### 認証

```bash
# 対話的ログイン（デフォルト: github.com）
gh auth login

# ホスト名を指定してログイン
gh auth login --hostname enterprise.internal

# トークンでログイン
gh auth login --with-token < mytoken.txt

# 認証ステータスの確認
gh auth status

# アカウントの切り替え
gh auth switch --hostname github.com --user username

# ログアウト
gh auth logout --hostname github.com --user username
```

### Git 連携のセットアップ

```bash
# gh を認証情報ヘルパーとして使うよう git を設定
gh auth setup-git

# 有効なトークンを表示
gh auth token

# 認証スコープを更新
gh auth refresh --scopes write:org,read:public_key
```

## CLI 構造

```
gh                          # ルートコマンド
├── auth                    # 認証
│   ├── login
│   ├── logout
│   ├── refresh
│   ├── setup-git
│   ├── status
│   ├── switch
│   └── token
├── browse                  # ブラウザで開く
├── codespace               # GitHub Codespaces
│   ├── code
│   ├── cp
│   ├── create
│   ├── delete
│   ├── edit
│   ├── jupyter
│   ├── list
│   ├── logs
│   ├── ports
│   ├── rebuild
│   ├── ssh
│   ├── stop
│   └── view
├── gist                    # Gist
│   ├── clone
│   ├── create
│   ├── delete
│   ├── edit
│   ├── list
│   ├── rename
│   └── view
├── issue                   # Issue
│   ├── create
│   ├── list
│   ├── status
│   ├── close
│   ├── comment
│   ├── delete
│   ├── develop
│   ├── edit
│   ├── lock
│   ├── pin
│   ├── reopen
│   ├── transfer
│   ├── unlock
│   └── view
├── org                     # 組織
│   └── list
├── pr                      # プルリクエスト
│   ├── create
│   ├── list
│   ├── status
│   ├── checkout
│   ├── checks
│   ├── close
│   ├── comment
│   ├── diff
│   ├── edit
│   ├── lock
│   ├── merge
│   ├── ready
│   ├── reopen
│   ├── revert
│   ├── review
│   ├── unlock
│   ├── update-branch
│   └── view
├── project                 # プロジェクト
│   ├── close
│   ├── copy
│   ├── create
│   ├── delete
│   ├── edit
│   ├── field-create
│   ├── field-delete
│   ├── field-list
│   ├── item-add
│   ├── item-archive
│   ├── item-create
│   ├── item-delete
│   ├── item-edit
│   ├── item-list
│   ├── link
│   ├── list
│   ├── mark-template
│   ├── unlink
│   └── view
├── release                 # リリース
│   ├── create
│   ├── list
│   ├── delete
│   ├── delete-asset
│   ├── download
│   ├── edit
│   ├── upload
│   ├── verify
│   ├── verify-asset
│   └── view
├── repo                    # リポジトリ
│   ├── create
│   ├── list
│   ├── archive
│   ├── autolink
│   ├── clone
│   ├── delete
│   ├── deploy-key
│   ├── edit
│   ├── fork
│   ├── gitignore
│   ├── license
│   ├── rename
│   ├── set-default
│   ├── sync
│   ├── unarchive
│   └── view
├── cache                   # Actions キャッシュ
│   ├── delete
│   └── list
├── run                     # ワークフロー実行
│   ├── cancel
│   ├── delete
│   ├── download
│   ├── list
│   ├── rerun
│   ├── view
│   └── watch
├── workflow                # ワークフロー
│   ├── disable
│   ├── enable
│   ├── list
│   ├── run
│   └── view
├── agent-task              # エージェントタスク
├── alias                   # コマンドエイリアス
│   ├── delete
│   ├── import
│   ├── list
│   └── set
├── api                     # API リクエスト
├── attestation             # アーティファクト証明（attestation）
│   ├── download
│   ├── trusted-root
│   └── verify
├── completion              # シェル補完
├── config                  # 設定
│   ├── clear-cache
│   ├── get
│   ├── list
│   └── set
├── extension               # 拡張機能
│   ├── browse
│   ├── create
│   ├── exec
│   ├── install
│   ├── list
│   ├── remove
│   ├── search
│   └── upgrade
├── gpg-key                 # GPG 鍵
│   ├── add
│   ├── delete
│   └── list
├── label                   # ラベル
│   ├── clone
│   ├── create
│   ├── delete
│   ├── edit
│   └── list
├── preview                 # プレビュー機能
├── ruleset                 # ルールセット
│   ├── check
│   ├── list
│   └── view
├── search                  # 検索
│   ├── code
│   ├── commits
│   ├── issues
│   ├── prs
│   └── repos
├── secret                  # シークレット
│   ├── delete
│   ├── list
│   └── set
├── ssh-key                 # SSH 鍵
│   ├── add
│   ├── delete
│   └── list
├── status                  # ステータス概要
└── variable                # 変数
    ├── delete
    ├── get
    ├── list
    └── set
```

## 設定

### グローバル設定

```bash
# すべての設定を一覧表示
gh config list

# 特定の設定値を取得
gh config list git_protocol
gh config get editor

# 設定値を変更
gh config set editor vim
gh config set git_protocol ssh
gh config set prompt disabled
gh config set pager "less -R"

# 設定キャッシュをクリア
gh config clear-cache
```

### 環境変数

```bash
# GitHub トークン（自動化用）
export GH_TOKEN=ghp_xxxxxxxxxxxx

# GitHub ホスト名
export GH_HOST=github.com

# プロンプトを無効化
export GH_PROMPT_DISABLED=true

# カスタムエディタ
export GH_EDITOR=vim

# カスタムページャ
export GH_PAGER=less

# HTTP タイムアウト
export GH_TIMEOUT=30

# カスタムリポジトリ（デフォルトを上書き）
export GH_REPO=owner/repo

# カスタム git プロトコル
export GH_ENTERPRISE_HOSTNAME=hostname
```

## 認証 (gh auth)

### ログイン

```bash
# 対話的ログイン
gh auth login

# Web ベースの認証
gh auth login --web

# OAuth コードをクリップボードで扱う
gh auth login --web --clipboard

# git プロトコルを指定
gh auth login --git-protocol ssh

# カスタムホスト名（GitHub Enterprise）
gh auth login --hostname enterprise.internal

# stdin からトークンでログイン
gh auth login --with-token < token.txt

# 安全でないストレージ（平文）
gh auth login --insecure-storage
```

### ステータス

```bash
# すべての認証ステータスを表示
gh auth status

# 有効なアカウントのみ表示
gh auth status --active

# 特定のホスト名を表示
gh auth status --hostname github.com

# 出力にトークンを含める
gh auth status --show-token

# JSON 出力
gh auth status --json hosts

# jq でフィルタ
gh auth status --json hosts --jq '.hosts | add'
```

### アカウントの切り替え

```bash
# 対話的に切り替え
gh auth switch

# 特定のユーザー/ホストに切り替え
gh auth switch --hostname github.com --user monalisa
```

### トークン

```bash
# 認証トークンを表示
gh auth token

# 特定のホスト/ユーザーのトークン
gh auth token --hostname github.com --user monalisa
```

### 更新（refresh）

```bash
# 認証情報を更新
gh auth refresh

# スコープを追加
gh auth refresh --scopes write:org,read:public_key

# スコープを削除
gh auth refresh --remove-scopes delete_repo

# デフォルトのスコープにリセット
gh auth refresh --reset-scopes

# クリップボードを使用
gh auth refresh --clipboard
```

### Git のセットアップ

```bash
# git 認証情報ヘルパーをセットアップ
gh auth setup-git

# 特定のホスト向けにセットアップ
gh auth setup-git --hostname enterprise.internal

# ホストが未知でも強制的にセットアップ
gh auth setup-git --hostname enterprise.internal --force
```

## ブラウズ (gh browse)

```bash
# リポジトリをブラウザで開く
gh browse

# 特定のパスを開く
gh browse script/
gh browse main.go:312

# issue または PR を開く
gh browse 123

# コミットを開く
gh browse 77507cd94ccafcf568f8560cfecde965fcfa63

# 特定のブランチで開く
gh browse main.go --branch bug-fix

# 別のリポジトリを開く
gh browse --repo owner/repo

# 特定のページを開く
gh browse --actions       # Actions タブ
gh browse --projects      # Projects タブ
gh browse --releases      # Releases タブ
gh browse --settings      # Settings ページ
gh browse --wiki          # Wiki ページ

# 開かずに URL を表示
gh browse --no-browser
```

## リポジトリ (gh repo)

### リポジトリの作成

```bash
# 新しいリポジトリを作成
gh repo create my-repo

# 説明付きで作成
gh repo create my-repo --description "My awesome project"

# パブリックリポジトリを作成
gh repo create my-repo --public

# プライベートリポジトリを作成
gh repo create my-repo --private

# ホームページ付きで作成
gh repo create my-repo --homepage https://example.com

# ライセンス付きで作成
gh repo create my-repo --license mit

# gitignore 付きで作成
gh repo create my-repo --gitignore python

# テンプレートリポジトリとして初期化
gh repo create my-repo --template

# 組織内にリポジトリを作成
gh repo create org/my-repo

# ローカルにクローンせずに作成
gh repo create my-repo --source=.

# issue を無効化
gh repo create my-repo --disable-issues

# wiki を無効化
gh repo create my-repo --disable-wiki
```

### リポジトリのクローン

```bash
# リポジトリをクローン
gh repo clone owner/repo

# 特定のディレクトリにクローン
gh repo clone owner/repo my-directory

# 別のブランチでクローン
gh repo clone owner/repo --branch develop
```

### リポジトリの一覧

```bash
# すべてのリポジトリを一覧表示
gh repo list

# 特定のオーナーのリポジトリを一覧表示
gh repo list owner

# 件数を制限
gh repo list --limit 50

# パブリックリポジトリのみ
gh repo list --public

# ソースリポジトリのみ（フォークを除く）
gh repo list --source

# JSON 出力
gh repo list --json name,visibility,owner

# テーブル出力
gh repo list --limit 100 | tail -n +2

# jq でフィルタ
gh repo list --json name --jq '.[].name'
```

### リポジトリの表示

```bash
# リポジトリの詳細を表示
gh repo view

# 特定のリポジトリを表示
gh repo view owner/repo

# JSON 出力
gh repo view --json name,description,defaultBranchRef

# ブラウザで表示
gh repo view --web
```

### リポジトリの編集

```bash
# 説明を編集
gh repo edit --description "New description"

# ホームページを設定
gh repo edit --homepage https://example.com

# 可視性を変更
gh repo edit --visibility private
gh repo edit --visibility public

# 機能の有効化/無効化
gh repo edit --enable-issues
gh repo edit --disable-issues
gh repo edit --enable-wiki
gh repo edit --disable-wiki
gh repo edit --enable-projects
gh repo edit --disable-projects

# デフォルトブランチを設定
gh repo edit --default-branch main

# リポジトリ名を変更
gh repo rename new-name

# リポジトリをアーカイブ
gh repo archive
gh repo unarchive
```

### リポジトリの削除

```bash
# リポジトリを削除
gh repo delete owner/repo

# プロンプトなしで確認
gh repo delete owner/repo --yes
```

### リポジトリのフォーク

```bash
# リポジトリをフォーク
gh repo fork owner/repo

# 組織にフォーク
gh repo fork owner/repo --org org-name

# フォーク後にクローン
gh repo fork owner/repo --clone

# フォークのリモート名
gh repo fork owner/repo --remote-name upstream
```

### フォークの同期

```bash
# フォークを upstream と同期
gh repo sync

# 特定のブランチを同期
gh repo sync --branch feature

# 強制同期
gh repo sync --force
```

### デフォルトリポジトリの設定

```bash
# 現在のディレクトリのデフォルトリポジトリを設定
gh repo set-default

# 明示的にデフォルトを設定
gh repo set-default owner/repo

# デフォルトを解除
gh repo set-default --unset
```

### リポジトリの自動リンク（autolink）

```bash
# 自動リンクを一覧表示
gh repo autolink list

# 自動リンクを追加
gh repo autolink add \
  --key-prefix JIRA- \
  --url-template https://jira.example.com/browse/<num>

# 自動リンクを削除
gh repo autolink delete 12345
```

### リポジトリのデプロイキー

```bash
# デプロイキーを一覧表示
gh repo deploy-key list

# デプロイキーを追加
gh repo deploy-key add ~/.ssh/id_rsa.pub \
  --title "Production server" \
  --read-only

# デプロイキーを削除
gh repo deploy-key delete 12345
```

### Gitignore とライセンス

```bash
# gitignore テンプレートを表示
gh repo gitignore

# ライセンステンプレートを表示
gh repo license mit

# フルネーム付きのライセンス
gh repo license mit --fullname "John Doe"
```

## Issue (gh issue)

### Issue の作成

```bash
# 対話的に issue を作成
gh issue create

# タイトル付きで作成
gh issue create --title "Bug: Login not working"

# タイトルと本文付きで作成
gh issue create \
  --title "Bug: Login not working" \
  --body "Steps to reproduce..."

# ファイルから本文を読み込んで作成
gh issue create --body-file issue.md

# ラベル付きで作成
gh issue create --title "Fix bug" --labels bug,high-priority

# 担当者付きで作成
gh issue create --title "Fix bug" --assignee user1,user2

# 特定のリポジトリに作成
gh issue create --repo owner/repo --title "Issue title"

# Web から issue を作成
gh issue create --web
```

### Issue の一覧

```bash
# オープンな issue をすべて一覧表示
gh issue list

# すべての issue を一覧表示（クローズ済みを含む）
gh issue list --state all

# クローズ済みの issue を一覧表示
gh issue list --state closed

# 件数を制限
gh issue list --limit 50

# 担当者でフィルタ
gh issue list --assignee username
gh issue list --assignee @me

# ラベルでフィルタ
gh issue list --labels bug,enhancement

# マイルストーンでフィルタ
gh issue list --milestone "v1.0"

# 検索/フィルタ
gh issue list --search "is:open is:issue label:bug"

# JSON 出力
gh issue list --json number,title,state,author

# テーブル表示
gh issue list --json number,title,labels --jq '.[] | [.number, .title, .labels[].name] | @tsv'

# コメント数を表示
gh issue list --json number,title,comments --jq '.[] | [.number, .title, .comments]'

# 並び替え
gh issue list --sort created --order desc
```

### Issue の表示

```bash
# issue を表示
gh issue view 123

# コメント付きで表示
gh issue view 123 --comments

# ブラウザで表示
gh issue view 123 --web

# JSON 出力
gh issue view 123 --json title,body,state,labels,comments

# 特定のフィールドを表示
gh issue view 123 --json title --jq '.title'
```

### Issue の編集

```bash
# 対話的に編集
gh issue edit 123

# タイトルを編集
gh issue edit 123 --title "New title"

# 本文を編集
gh issue edit 123 --body "New description"

# ラベルを追加
gh issue edit 123 --add-label bug,high-priority

# ラベルを削除
gh issue edit 123 --remove-label stale

# 担当者を追加
gh issue edit 123 --add-assignee user1,user2

# 担当者を削除
gh issue edit 123 --remove-assignee user1

# マイルストーンを設定
gh issue edit 123 --milestone "v1.0"
```

### Issue のクローズ/再オープン

```bash
# issue をクローズ
gh issue close 123

# コメント付きでクローズ
gh issue close 123 --comment "Fixed in PR #456"

# issue を再オープン
gh issue reopen 123
```

### Issue へのコメント

```bash
# コメントを追加
gh issue comment 123 --body "This looks good!"

# コメントを編集
gh issue comment 123 --edit 456789 --body "Updated comment"

# コメントを削除
gh issue comment 123 --delete 456789
```

### Issue のステータス

```bash
# issue のステータス概要を表示
gh issue status

# 特定のリポジトリのステータス
gh issue status --repo owner/repo
```

### Issue のピン留め/解除

```bash
# issue をピン留め（リポジトリのダッシュボードに固定）
gh issue pin 123

# issue のピン留めを解除
gh issue unpin 123
```

### Issue のロック/解除

```bash
# 会話をロック
gh issue lock 123

# 理由を指定してロック
gh issue lock 123 --reason off-topic

# ロックを解除
gh issue unlock 123
```

### Issue の移管

```bash
# 別のリポジトリへ移管
gh issue transfer 123 --repo owner/new-repo
```

### Issue の削除

```bash
# issue を削除
gh issue delete 123

# プロンプトなしで確認
gh issue delete 123 --yes
```

### Issue から開発（ドラフト PR）

```bash
# issue からドラフト PR を作成
gh issue develop 123

# 特定のブランチで作成
gh issue develop 123 --branch fix/issue-123

# ベースブランチを指定して作成
gh issue develop 123 --base main
```

## プルリクエスト (gh pr)

### プルリクエストの作成

```bash
# 対話的に PR を作成
gh pr create

# タイトル付きで作成
gh pr create --title "Feature: Add new functionality"

# タイトルと本文付きで作成
gh pr create \
  --title "Feature: Add new functionality" \
  --body "This PR adds..."

# テンプレートから本文を埋める
gh pr create --body-file .github/PULL_REQUEST_TEMPLATE.md

# ベースブランチを設定
gh pr create --base main

# ヘッドブランチを設定（デフォルト: 現在のブランチ）
gh pr create --head feature-branch

# ドラフト PR を作成
gh pr create --draft

# 担当者を追加
gh pr create --assignee user1,user2

# レビュアーを追加
gh pr create --reviewer user1,user2

# ラベルを追加
gh pr create --labels enhancement,feature

# issue にリンク
gh pr create --issue 123

# 特定のリポジトリに作成
gh pr create --repo owner/repo

# 作成後にブラウザで開く
gh pr create --web
```

### プルリクエストの一覧

```bash
# オープンな PR を一覧表示
gh pr list

# すべての PR を一覧表示
gh pr list --state all

# マージ済みの PR を一覧表示
gh pr list --state merged

# クローズ済み（マージされていない）の PR を一覧表示
gh pr list --state closed

# ヘッドブランチでフィルタ
gh pr list --head feature-branch

# ベースブランチでフィルタ
gh pr list --base main

# 作成者でフィルタ
gh pr list --author username
gh pr list --author @me

# 担当者でフィルタ
gh pr list --assignee username

# ラベルでフィルタ
gh pr list --labels bug,enhancement

# 件数を制限
gh pr list --limit 50

# 検索
gh pr list --search "is:open is:pr label:review-required"

# JSON 出力
gh pr list --json number,title,state,author,headRefName

# チェックステータスを表示
gh pr list --json number,title,statusCheckRollup --jq '.[] | [.number, .title, .statusCheckRollup[]?.status]'

# 並び替え
gh pr list --sort created --order desc
```

### プルリクエストの表示

```bash
# PR を表示
gh pr view 123

# コメント付きで表示
gh pr view 123 --comments

# ブラウザで表示
gh pr view 123 --web

# JSON 出力
gh pr view 123 --json title,body,state,author,commits,files

# diff を表示
gh pr view 123 --json files --jq '.files[].path'

# jq クエリで表示
gh pr view 123 --json title,state --jq '"\(.title): \(.state)"'
```

### プルリクエストのチェックアウト

```bash
# PR ブランチをチェックアウト
gh pr checkout 123

# 特定のブランチ名でチェックアウト
gh pr checkout 123 --branch name-123

# 強制チェックアウト
gh pr checkout 123 --force
```

### プルリクエストの差分（diff）

```bash
# PR の diff を表示
gh pr diff 123

# 色付きで diff を表示
gh pr diff 123 --color always

# ファイルに出力
gh pr diff 123 > pr-123.patch

# 特定のファイルの diff を表示
gh pr diff 123 --name-only
```

### プルリクエストのマージ

```bash
# PR をマージ
gh pr merge 123

# 特定のマージ方式でマージ
gh pr merge 123 --merge
gh pr merge 123 --squash
gh pr merge 123 --rebase

# マージ後にブランチを削除
gh pr merge 123 --delete-branch

# コメント付きでマージ
gh pr merge 123 --subject "Merge PR #123" --body "Merging feature"

# ドラフト PR をマージ
gh pr merge 123 --admin

# 強制マージ（チェックをスキップ）
gh pr merge 123 --admin
```

### プルリクエストのクローズ

```bash
# PR をクローズ（マージせずにドラフト扱い）
gh pr close 123

# コメント付きでクローズ
gh pr close 123 --comment "Closing due to..."
```

### プルリクエストの再オープン

```bash
# クローズ済みの PR を再オープン
gh pr reopen 123
```

### プルリクエストの編集

```bash
# 対話的に編集
gh pr edit 123

# タイトルを編集
gh pr edit 123 --title "New title"

# 本文を編集
gh pr edit 123 --body "New description"

# ラベルを追加
gh pr edit 123 --add-label bug,enhancement

# ラベルを削除
gh pr edit 123 --remove-label stale

# 担当者を追加
gh pr edit 123 --add-assignee user1,user2

# 担当者を削除
gh pr edit 123 --remove-assignee user1

# レビュアーを追加
gh pr edit 123 --add-reviewer user1,user2

# レビュアーを削除
gh pr edit 123 --remove-reviewer user1

# レビュー可能としてマーク
gh pr edit 123 --ready
```

### レビュー準備完了

```bash
# ドラフト PR をレビュー準備完了にする
gh pr ready 123
```

### プルリクエストのチェック

```bash
# PR のチェックを表示
gh pr checks 123

# チェックをリアルタイムで監視
gh pr checks 123 --watch

# 監視間隔（秒）
gh pr checks 123 --watch --interval 5
```

### プルリクエストへのコメント

```bash
# コメントを追加
gh pr comment 123 --body "Looks good!"

# 特定の行にコメント
gh pr comment 123 --body "Fix this" \
  --repo owner/repo \
  --head-owner owner --head-branch feature

# コメントを編集
gh pr comment 123 --edit 456789 --body "Updated"

# コメントを削除
gh pr comment 123 --delete 456789
```

### プルリクエストのレビュー

```bash
# PR をレビュー（エディタを開く）
gh pr review 123

# PR を承認
gh pr review 123 --approve --body "LGTM!"

# 変更を要求
gh pr review 123 --request-changes \
  --body "Please fix these issues"

# PR にコメント
gh pr review 123 --comment --body "Some thoughts..."

# レビューを取り下げ
gh pr review 123 --dismiss
```

### ブランチの更新

```bash
# PR ブランチを最新のベースブランチで更新
gh pr update-branch 123

# 強制更新
gh pr update-branch 123 --force

# マージ戦略を使用
gh pr update-branch 123 --merge
```

### プルリクエストのロック/解除

```bash
# PR の会話をロック
gh pr lock 123

# 理由を指定してロック
gh pr lock 123 --reason off-topic

# ロックを解除
gh pr unlock 123
```

### プルリクエストの取り消し（revert）

```bash
# マージ済みの PR を取り消す
gh pr revert 123

# 特定のブランチ名で取り消す
gh pr revert 123 --branch revert-pr-123
```

### プルリクエストのステータス

```bash
# PR のステータス概要を表示
gh pr status

# 特定のリポジトリのステータス
gh pr status --repo owner/repo
```

## GitHub Actions

### ワークフロー実行 (gh run)

```bash
# ワークフロー実行を一覧表示
gh run list

# 特定のワークフローの実行を一覧表示
gh run list --workflow "ci.yml"

# 特定のブランチの実行を一覧表示
gh run list --branch main

# 件数を制限
gh run list --limit 20

# JSON 出力
gh run list --json databaseId,status,conclusion,headBranch

# 実行の詳細を表示
gh run view 123456789

# 詳細なログ付きで実行を表示
gh run view 123456789 --log

# 特定のジョブを表示
gh run view 123456789 --job 987654321

# ブラウザで表示
gh run view 123456789 --web

# 実行をリアルタイムで監視
gh run watch 123456789

# 間隔を指定して監視
gh run watch 123456789 --interval 5

# 失敗した実行を再実行
gh run rerun 123456789

# 特定のジョブを再実行
gh run rerun 123456789 --job 987654321

# 実行をキャンセル
gh run cancel 123456789

# 実行を削除
gh run delete 123456789

# 実行のアーティファクトをダウンロード
gh run download 123456789

# 特定のアーティファクトをダウンロード
gh run download 123456789 --name build

# ディレクトリにダウンロード
gh run download 123456789 --dir ./artifacts
```

### ワークフロー (gh workflow)

```bash
# ワークフローを一覧表示
gh workflow list

# ワークフローの詳細を表示
gh workflow view ci.yml

# ワークフローの YAML を表示
gh workflow view ci.yml --yaml

# ブラウザで表示
gh workflow view ci.yml --web

# ワークフローを有効化
gh workflow enable ci.yml

# ワークフローを無効化
gh workflow disable ci.yml

# ワークフローを手動で実行
gh workflow run ci.yml

# 入力付きで実行
gh workflow run ci.yml \
  --raw-field \
  version="1.0.0" \
  environment="production"

# 特定のブランチから実行
gh workflow run ci.yml --ref develop
```

### Actions キャッシュ (gh cache)

```bash
# キャッシュを一覧表示
gh cache list

# 特定のブランチのキャッシュを一覧表示
gh cache list --branch main

# 件数を制限して一覧表示
gh cache list --limit 50

# キャッシュを削除
gh cache delete 123456789

# すべてのキャッシュを削除
gh cache delete --all
```

### Actions シークレット (gh secret)

```bash
# シークレットを一覧表示
gh secret list

# シークレットを設定（値を入力）
gh secret set MY_SECRET

# 環境変数からシークレットを設定
echo "$MY_SECRET" | gh secret set MY_SECRET

# 特定の environment にシークレットを設定
gh secret set MY_SECRET --env production

# 組織にシークレットを設定
gh secret set MY_SECRET --org orgname

# シークレットを削除
gh secret delete MY_SECRET

# environment から削除
gh secret delete MY_SECRET --env production
```

### Actions 変数 (gh variable)

```bash
# 変数を一覧表示
gh variable list

# 変数を設定
gh variable set MY_VAR "some-value"

# environment 向けに変数を設定
gh variable set MY_VAR "value" --env production

# 組織向けに変数を設定
gh variable set MY_VAR "value" --org orgname

# 変数の値を取得
gh variable get MY_VAR

# 変数を削除
gh variable delete MY_VAR

# environment から削除
gh variable delete MY_VAR --env production
```

## プロジェクト (gh project)

```bash
# プロジェクトを一覧表示
gh project list

# オーナーのプロジェクトを一覧表示
gh project list --owner owner

# オープンなプロジェクトを表示
gh project list --open

# プロジェクトを表示
gh project view 123

# プロジェクトのアイテムを表示
gh project view 123 --format json

# プロジェクトを作成
gh project create --title "My Project"

# 組織内に作成
gh project create --title "Project" --org orgname

# readme 付きで作成
gh project create --title "Project" --readme "Description here"

# プロジェクトを編集
gh project edit 123 --title "New Title"

# プロジェクトを削除
gh project delete 123

# プロジェクトをクローズ
gh project close 123

# プロジェクトをコピー
gh project copy 123 --owner target-owner --title "Copy"

# テンプレートとしてマーク
gh project mark-template 123

# フィールドを一覧表示
gh project field-list 123

# フィールドを作成
gh project field-create 123 --title "Status" --datatype single_select

# フィールドを削除
gh project field-delete 123 --id 456

# アイテムを一覧表示
gh project item-list 123

# アイテムを作成
gh project item-create 123 --title "New item"

# プロジェクトにアイテムを追加
gh project item-add 123 --owner-owner --repo repo --issue 456

# アイテムを編集
gh project item-edit 123 --id 456 --title "Updated title"

# アイテムを削除
gh project item-delete 123 --id 456

# アイテムをアーカイブ
gh project item-archive 123 --id 456

# アイテムをリンク
gh project link 123 --id 456 --link-id 789

# アイテムのリンクを解除
gh project unlink 123 --id 456 --link-id 789

# プロジェクトをブラウザで表示
gh project view 123 --web
```

## リリース (gh release)

```bash
# リリースを一覧表示
gh release list

# 最新のリリースを表示
gh release view

# 特定のリリースを表示
gh release view v1.0.0

# ブラウザで表示
gh release view v1.0.0 --web

# リリースを作成
gh release create v1.0.0 \
  --notes "Release notes here"

# ファイルからリリースノートを読み込んで作成
gh release create v1.0.0 --notes-file notes.md

# ターゲットを指定して作成
gh release create v1.0.0 --target main

# ドラフトとして作成
gh release create v1.0.0 --draft

# プレリリースを作成
gh release create v1.0.0 --prerelease

# タイトル付きで作成
gh release create v1.0.0 --title "Version 1.0.0"

# リリースにアセットをアップロード
gh release upload v1.0.0 ./file.tar.gz

# 複数のアセットをアップロード
gh release upload v1.0.0 ./file1.tar.gz ./file2.tar.gz

# ラベル付きでアップロード（大文字小文字を区別）
gh release upload v1.0.0 ./file.tar.gz --casing

# リリースを削除
gh release delete v1.0.0

# タグのクリーンアップ付きで削除
gh release delete v1.0.0 --yes

# 特定のアセットを削除
gh release delete-asset v1.0.0 file.tar.gz

# リリースのアセットをダウンロード
gh release download v1.0.0

# 特定のアセットをダウンロード
gh release download v1.0.0 --pattern "*.tar.gz"

# ディレクトリにダウンロード
gh release download v1.0.0 --dir ./downloads

# アーカイブ（zip/tar）をダウンロード
gh release download v1.0.0 --archive zip

# リリースを編集
gh release edit v1.0.0 --notes "Updated notes"

# リリースの署名を検証
gh release verify v1.0.0

# 特定のアセットを検証
gh release verify-asset v1.0.0 file.tar.gz
```

## Gist (gh gist)

```bash
# gist を一覧表示
gh gist list

# すべての gist を一覧表示（プライベートを含む）
gh gist list --public

# 件数を制限
gh gist list --limit 20

# gist を表示
gh gist view abc123

# gist のファイルを表示
gh gist view abc123 --files

# gist を作成
gh gist create script.py

# 説明付きで gist を作成
gh gist create script.py --desc "My script"

# パブリックな gist を作成
gh gist create script.py --public

# 複数ファイルの gist を作成
gh gist create file1.py file2.py

# stdin から作成
echo "print('hello')" | gh gist create

# gist を編集
gh gist edit abc123

# gist を削除
gh gist delete abc123

# gist のファイル名を変更
gh gist rename abc123 --filename old.py new.py

# gist をクローン
gh gist clone abc123

# ディレクトリにクローン
gh gist clone abc123 my-directory
```

## Codespaces (gh codespace)

```bash
# codespace を一覧表示
gh codespace list

# codespace を作成
gh codespace create

# 特定のリポジトリで作成
gh codespace create --repo owner/repo

# ブランチを指定して作成
gh codespace create --branch develop

# 特定のマシンで作成
gh codespace create --machine premiumLinux

# codespace の詳細を表示
gh codespace view

# codespace に SSH 接続
gh codespace ssh

# 特定のコマンドで SSH 接続
gh codespace ssh --command "cd /workspaces && ls"

# codespace をブラウザで開く
gh codespace code

# VS Code で開く
gh codespace code --codec

# 特定のパスで開く
gh codespace code --path /workspaces/repo

# codespace を停止
gh codespace stop

# codespace を削除
gh codespace delete

# ログを表示
gh codespace logs

--tail 100

# ポートを表示
gh codespace ports

# ポートを転送
gh codespace cp 8080:8080

# codespace を再ビルド
gh codespace rebuild

# codespace を編集
gh codespace edit --machine standardLinux

# Jupyter サポート
gh codespace jupyter

# codespace との間でファイルをコピー
gh codespace cp file.txt :/workspaces/file.txt
gh codespace cp :/workspaces/file.txt ./file.txt
```

## 組織 (gh org)

```bash
# 組織を一覧表示
gh org list

# ユーザーの組織を一覧表示
gh org list --user username

# JSON 出力
gh org list --json login,name,description

# 組織を表示
gh org view orgname

# 組織のメンバーを表示
gh org view orgname --json members --jq '.members[] | .login'
```

## 検索 (gh search)

```bash
# コードを検索
gh search code "TODO"

# 特定のリポジトリ内を検索
gh search code "TODO" --repo owner/repo

# コミットを検索
gh search commits "fix bug"

# issue を検索
gh search issues "label:bug state:open"

# PR を検索
gh search prs "is:open is:pr review:required"

# リポジトリを検索
gh search repos "stars:>1000 language:python"

# 件数を制限
gh search repos "topic:api" --limit 50

# JSON 出力
gh search repos "stars:>100" --json name,description,stargazers

# 結果を並び替え
gh search repos "language:rust" --order desc --sort stars

# 拡張子を指定して検索
gh search code "import" --extension py

# Web 検索（ブラウザで開く）
gh search prs "is:open" --web
```

## ラベル (gh label)

```bash
# ラベルを一覧表示
gh label list

# ラベルを作成
gh label create bug --color "d73a4a" --description "Something isn't working"

# 16進数カラーで作成
gh label create enhancement --color "#a2eeef"

# ラベルを編集
gh label edit bug --name "bug-report" --color "ff0000"

# ラベルを削除
gh label delete bug

# リポジトリからラベルをクローン
gh label clone owner/repo

# 特定のリポジトリにクローン
gh label clone owner/repo --repo target/repo
```

## SSH 鍵 (gh ssh-key)

```bash
# SSH 鍵を一覧表示
gh ssh-key list

# SSH 鍵を追加
gh ssh-key add ~/.ssh/id_rsa.pub --title "My laptop"

# タイプを指定して鍵を追加
gh ssh-key add ~/.ssh/id_ed25519.pub --type "authentication"

# SSH 鍵を削除
gh ssh-key delete 12345

# タイトルで削除
gh ssh-key delete --title "My laptop"
```

## GPG 鍵 (gh gpg-key)

```bash
# GPG 鍵を一覧表示
gh gpg-key list

# GPG 鍵を追加
gh gpg-key add ~/.ssh/id_rsa.pub

# GPG 鍵を削除
gh gpg-key delete 12345

# 鍵 ID で削除
gh gpg-key delete ABCD1234
```

## ステータス (gh status)

```bash
# ステータス概要を表示
gh status

# 特定のリポジトリのステータス
gh status --repo owner/repo

# JSON 出力
gh status --json
```

## 設定 (gh config)

```bash
# すべての設定を一覧表示
gh config list

# 特定の値を取得
gh config get editor

# 値を設定
gh config set editor vim

# git プロトコルを設定
gh config set git_protocol ssh

# キャッシュをクリア
gh config clear-cache

# プロンプトの挙動を設定
gh config set prompt disabled
gh config set prompt enabled
```

## 拡張機能 (gh extension)

```bash
# インストール済みの拡張機能を一覧表示
gh extension list

# 拡張機能を検索
gh extension search github

# 拡張機能をインストール
gh extension install owner/extension-repo

# ブランチからインストール
gh extension install owner/extension-repo --branch develop

# 拡張機能をアップグレード
gh extension upgrade extension-name

# 拡張機能を削除
gh extension remove extension-name

# 新しい拡張機能を作成
gh extension create my-extension

# 拡張機能をブラウズ
gh extension browse

# 拡張機能のコマンドを実行
gh extension exec my-extension --arg value
```

## エイリアス (gh alias)

```bash
# エイリアスを一覧表示
gh alias list

# エイリアスを設定
gh alias set prview 'pr view --web'

# シェルエイリアスを設定
gh alias set co 'pr checkout' --shell

# エイリアスを削除
gh alias delete prview

# エイリアスをインポート
gh alias import ./aliases.sh
```

## API リクエスト (gh api)

```bash
# API リクエストを実行
gh api /user

# メソッドを指定してリクエスト
gh api --method POST /repos/owner/repo/issues \
  --field title="Issue title" \
  --field body="Issue body"

# ヘッダー付きでリクエスト
gh api /user \
  --header "Accept: application/vnd.github.v3+json"

# ページネーション付きでリクエスト
gh api /user/repos --paginate

# 生の出力（整形なし）
gh api /user --raw

# 出力にヘッダーを含める
gh api /user --include

# サイレントモード（進捗出力なし）
gh api /user --silent

# ファイルから入力
gh api --input request.json

# レスポンスに jq クエリ
gh api /user --jq '.login'

# レスポンスからフィールドを取得
gh api /repos/owner/repo --jq '.stargazers_count'

# GitHub Enterprise
gh api /user --hostname enterprise.internal

# GraphQL クエリ
gh api graphql \
  -f query='
  {
    viewer {
      login
      repositories(first: 5) {
        nodes {
          name
        }
      }
    }
  }'
```

## ルールセット (gh ruleset)

```bash
# ルールセットを一覧表示
gh ruleset list

# ルールセットを表示
gh ruleset view 123

# ルールセットをチェック
gh ruleset check --branch feature

# 特定のリポジトリをチェック
gh ruleset check --repo owner/repo --branch main
```

## 証明（gh attestation）

```bash
# 証明をダウンロード
gh attestation download owner/repo \
  --artifact-id 123456

# 証明を検証
gh attestation verify owner/repo

# 信頼されたルートを取得
gh attestation trusted-root
```

## 補完 (gh completion)

```bash
# シェル補完を生成
gh completion -s bash > ~/.gh-complete.bash
gh completion -s zsh > ~/.gh-complete.zsh
gh completion -s fish > ~/.gh-complete.fish
gh completion -s powershell > ~/.gh-complete.ps1

# シェル別の手順
gh completion --shell=bash
gh completion --shell=zsh
```

## プレビュー (gh preview)

```bash
# プレビュー機能を一覧表示
gh preview

# プレビュースクリプトを実行
gh preview prompter
```

## エージェントタスク (gh agent-task)

```bash
# エージェントタスクを一覧表示
gh agent-task list

# エージェントタスクを表示
gh agent-task view 123

# エージェントタスクを作成
gh agent-task create --description "My task"
```

## グローバルフラグ

| フラグ                      | 説明                                   |
| -------------------------- | -------------------------------------- |
| `--help` / `-h`            | コマンドのヘルプを表示                 |
| `--version`                | gh のバージョンを表示                  |
| `--repo [HOST/]OWNER/REPO` | 別のリポジトリを選択                   |
| `--hostname HOST`          | GitHub ホスト名                        |
| `--jq EXPRESSION`          | JSON 出力をフィルタ                    |
| `--json FIELDS`            | 指定したフィールドで JSON を出力       |
| `--template STRING`        | Go テンプレートで JSON を整形          |
| `--web`                    | ブラウザで開く                         |
| `--paginate`               | 追加の API 呼び出しを行う              |
| `--verbose`                | 詳細な出力を表示                       |
| `--debug`                  | デバッグ出力を表示                     |
| `--timeout SECONDS`        | API リクエストの最大時間               |
| `--cache CACHE`            | キャッシュ制御（default, force, bypass） |

## 出力の整形

### JSON 出力

```bash
# 基本的な JSON
gh repo view --json name,description

# ネストされたフィールド
gh repo view --json owner,name --jq '.owner.login + "/" + .name'

# 配列操作
gh pr list --json number,title --jq '.[] | select(.number > 100)'

# 複雑なクエリ
gh issue list --json number,title,labels \
  --jq '.[] | {number, title: .title, tags: [.labels[].name]}'
```

### テンプレート出力

```bash
# カスタムテンプレート
gh repo view \
  --template '{{.name}}: {{.description}}'

# 複数行のテンプレート
gh pr view 123 \
  --template 'Title: {{.title}}
Author: {{.author.login}}
State: {{.state}}
'
```

## よくあるワークフロー

### Issue から PR を作成

```bash
# issue からブランチを作成
gh issue develop 123 --branch feature/issue-123

# 変更を加え、コミットし、プッシュ
git add .
git commit -m "Fix issue #123"
git push

# issue にリンクした PR を作成
gh pr create --title "Fix #123" --body "Closes #123"
```

### 一括操作

```bash
# 複数の issue をクローズ
gh issue list --search "label:stale" \
  --json number \
  --jq '.[].number' | \
  xargs -I {} gh issue close {} --comment "Closing as stale"

# 複数の PR にラベルを追加
gh pr list --search "review:required" \
  --json number \
  --jq '.[].number' | \
  xargs -I {} gh pr edit {} --add-label needs-review
```

### リポジトリのセットアップワークフロー

```bash
# 初期セットアップ付きでリポジトリを作成
gh repo create my-project --public \
  --description "My awesome project" \
  --clone \
  --gitignore python \
  --license mit

cd my-project

# ブランチをセットアップ
git checkout -b develop
git push -u origin develop

# ラベルを作成
gh label create bug --color "d73a4a" --description "Bug report"
gh label create enhancement --color "a2eeef" --description "Feature request"
gh label create documentation --color "0075ca" --description "Documentation"
```

### CI/CD ワークフロー

```bash
# ワークフローを実行して待機
RUN_ID=$(gh workflow run ci.yml --ref main --jq '.databaseId')

# 実行を監視
gh run watch "$RUN_ID"

# 完了時にアーティファクトをダウンロード
gh run download "$RUN_ID" --dir ./artifacts
```

### フォーク同期ワークフロー

```bash
# リポジトリをフォーク
gh repo fork original/repo --clone

cd repo

# upstream リモートを追加
git remote add upstream https://github.com/original/repo.git

# フォークを同期
gh repo sync

# または手動で同期
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## 環境のセットアップ

### シェル連携

```bash
# ~/.bashrc または ~/.zshrc に追加
eval "$(gh completion -s bash)"  # または zsh/fish

# 便利なエイリアスを作成
alias gs='gh status'
alias gpr='gh pr view --web'
alias gir='gh issue view --web'
alias gco='gh pr checkout'
```

### Git の設定

```bash
# gh を認証情報ヘルパーとして使用
gh auth setup-git

# リポジトリ操作のデフォルトに gh を設定
git config --global credential.helper 'gh !gh auth setup-git'

# または手動で
git config --global credential.helper github
```

## ベストプラクティス

1. **認証**: 自動化には環境変数を使う

   ```bash
   export GH_TOKEN=$(gh auth token)
   ```

2. **デフォルトリポジトリ**: 繰り返しを避けるためデフォルトを設定する

   ```bash
   gh repo set-default owner/repo
   ```

3. **JSON のパース**: 複雑なデータ抽出には jq を使う

   ```bash
   gh pr list --json number,title --jq '.[] | select(.title | contains("fix"))'
   ```

4. **ページネーション**: 大きな結果セットには --paginate を使う

   ```bash
   gh issue list --state all --paginate
   ```

5. **キャッシュ**: 頻繁にアクセスするデータにはキャッシュ制御を使う
   ```bash
   gh api /user --cache force
   ```

## ヘルプの取得

```bash
# 一般的なヘルプ
gh --help

# コマンドのヘルプ
gh pr --help
gh issue create --help

# ヘルプトピック
gh help formatting
gh help environment
gh help exit-codes
gh help accessibility
```

## 参考リンク

- 公式マニュアル: https://cli.github.com/manual/
- GitHub Docs: https://docs.github.com/en/github-cli
- REST API: https://docs.github.com/en/rest
- GraphQL API: https://docs.github.com/en/graphql
