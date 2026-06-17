# デプロイ & E2E 運用ガイド

東京リージョン（ap-northeast-1）前提。設定値は `.env` / GitHub secrets・variables から注入する（ハードコードしない）。

---

## 1. AWS 側の事前準備

### 1.1 CDK Bootstrap（初回のみ）
```bash
pnpm --filter @evo/infra exec cdk bootstrap aws://<ACCOUNT_ID>/ap-northeast-1
```

### 1.2 Bedrock モデルアクセスの有効化
AWS コンソール → Bedrock → Model access で Anthropic Claude を有効化。
利用は日本国内完結の推論プロファイル `jp.anthropic.claude-*`。最新 ID を確認:
```bash
aws bedrock list-inference-profiles --region ap-northeast-1 \
  --query "inferenceProfileSummaries[?contains(inferenceProfileId,'claude')].inferenceProfileId"
```
→ `infra/.env` の `BEDROCK_MODEL_ID`、`agents/chat/.env` の `BEDROCK_MODEL_ID` に設定。

### 1.3 AgentCore CodeZip の managed runtime 値
`infra/.env` の `AGENT_MANAGED_RUNTIME`（既定 `NODEJS_22`）と `entryPoint`（`index.js`）は、
デプロイ時に AgentCore のドキュメント/CLI で正式値を確認して確定する。

---

## 2. IAM（重要）

### 2.1 AgentCore Runtime 実行ロール — **CDK が自動作成**（手動不要）
`infra/lib/constructs/agent.ts` の `executionRole`。信頼ポリシーは
`bedrock-agentcore.amazonaws.com`（confused deputy 対策で `aws:SourceAccount` /
`aws:SourceArn` 条件付き）。付与権限:
- `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`
- `bedrock-agentcore:CreateEvent` / `ListEvents` / `RetrieveMemoryRecords` / `ListMemoryRecords`（Memory ARN 限定）
- DynamoDB 共有テーブルの read
- CodeZip(S3 asset) の read

### 2.2 Memory 実行ロール — **CDK が自動作成**
`infra/lib/constructs/memory.ts` の `executionRole`（長期記憶抽出のため `bedrock:InvokeModel`）。

> 上記 2.1 / 2.2 は `cdk deploy` で作成される。利用者の手動作成は不要。
> （絞り込み TODO: `bedrock:InvokeModel` の Resource を `jp.*` 推論プロファイル ARN + 各リージョン foundation-model ARN に限定 → EVO-7）

### 2.3 デプロイ実行ロール（GitHub Actions OIDC）— **利用者が作成**
1. GitHub OIDC プロバイダを作成（`token.actions.githubusercontent.com`、aud `sts.amazonaws.com`）。
2. デプロイ用 IAM ロールを作成。信頼ポリシーで対象 repo/branch を限定:
   ```json
   {
     "Effect": "Allow",
     "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
     "Action": "sts:AssumeRoleWithWebIdentity",
     "Condition": {
       "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
       "StringLike": { "token.actions.githubusercontent.com:sub": "repo:sori883/evo:*" }
     }
   }
   ```
3. 権限: `cdk deploy` 実行に必要なもの。簡便には CDK bootstrap が作る
   `cdk-hnb659fds-*` ロールへの `sts:AssumeRole` を許可（推奨）。直接付与する場合は
   CloudFormation / S3(asset) / IAM(ロール作成) / Cognito / DynamoDB /
   `bedrock-agentcore:*`(Memory/Runtime 作成) / Logs / SSM(bootstrap パラメータ) が必要。

### 2.4 E2E はローカル実行
E2E は CI ではなく**ローカルで実行**する（下記 5）。専用ロールは不要で、実行者の AWS
認証情報に Cognito 管理（`cognito-idp:AdminCreateUser` / `AdminSetUserPassword`）と
AgentCore 呼び出し権限があればよい。

### 2.5 ローカル診断用の最小権限（推奨）
ログ調査・Memory 確認・runtime invoke などローカル診断に `AdministratorAccess` を使うのは
広すぎる。以下に絞った permission set/ロールの利用を推奨（SSO の短命クレデンシャルを使い、
長期 IAM アクセスキーは使わない）:
- CloudWatch Logs 読取: `logs:Describe*` / `logs:GetLogEvents` / `logs:FilterLogEvents`
- AgentCore（読取 + invoke）: `bedrock-agentcore:List*` / `Get*` / `RetrieveMemoryRecords` /
  `InvokeAgentRuntime`、`bedrock-agentcore-control:GetAgentRuntime`
- E2E ユーザー操作: `cognito-idp:AdminCreateUser` / `AdminSetUserPassword` / `AdminGetUser` /
  `InitiateAuth`
- 推論プロファイル確認: `bedrock:ListInferenceProfiles` / `GetInferenceProfile`

---

## 3. GitHub secrets / variables

CD（infra デプロイ）に必要なもののみ:

| 種別 | キー | 用途 |
|---|---|---|
| secret | `AWS_DEPLOY_ROLE_ARN` | CD: デプロイロール（OIDC） |
| secret | `AWS_ACCOUNT_ID` | CD: `CDK_DEFAULT_ACCOUNT` |
| variable | `BEDROCK_MODEL_ID` | `jp.anthropic.claude-*` |
| variable | `AGENT_MANAGED_RUNTIME` | 例 `NODEJS_22` |

GitHub の Environment `production` に protection rule（手動承認）を設定すること。

> E2E はローカル実行のため GitHub secrets は不要。E2E 用の値（`COGNITO_*` /
> `AGENT_RUNTIME_URL` / `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` / `AWS_REGION` /
> `AWS_PROFILE`）は `apps/web/.env.local` に集約する。

---

## 4. デプロイ手順（ローカル）

```bash
# 1. 値を設定
cp infra/.env.example infra/.env        # BEDROCK_MODEL_ID, CDK_DEFAULT_ACCOUNT 等
cp agents/chat/.env.example agents/chat/.env

# 2. agent をビルド（infra が dist を CodeZip 化）
pnpm --filter @evo/agent-chat build

# 3. infra をデプロイ
pnpm --filter @evo/infra deploy

# 4. 出力(UserPoolId/UserPoolClientId/MemoryId/AgentRuntimeArn/SharedTableName)を転記
cp apps/web/.env.example apps/web/.env.local   # COGNITO_*, AGENT_RUNTIME_URL
# agents/chat/.env の MEMORY_ID / COGNITO_* も設定

# 5. web を Vercel にデプロイ（下記 6）
```

CI/CD は GitHub Actions:
- `.github/workflows/ci.yml` — PR/push で typecheck/test/build/synth
- `.github/workflows/cd.yml` — main で OIDC → `cdk deploy`（要 Environment 承認）

E2E はローカル実行（下記 5）。

---

## 5. ローカル E2E（実 AWS 接続）

EvoStack デプロイ済み + AWS 認証情報（Cognito 管理権限）が必要。
設定は **`apps/web/.env.local` に集約**する（`playwright.config.ts` が読み込むため export 不要）。

```bash
# 1. .env.local を用意して実値を記入
cp apps/web/.env.example apps/web/.env.local
#    AWS_REGION / AWS_PROFILE / COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID /
#    AGENT_RUNTIME_URL / E2E_USER_EMAIL / E2E_USER_PASSWORD

# 2. ビルド → ブラウザ取得 → E2E 実行（export 不要）
pnpm --filter @evo/web build
pnpm --filter @evo/web exec playwright install chromium
pnpm --filter @evo/web e2e
```

`e2e/global-setup.ts` が `.env.local` の値でテストユーザーを Cognito に用意（確認済み・恒久パスワード）、
`e2e/chat.spec.ts` がログイン→チャット→ストリーミング応答を検証する。

---

## 6. Web（Vercel）

`apps/web` は Vercel にデプロイ（CDK 対象外）。Vercel の GitHub 連携で自動デプロイ、
または `vercel` CLI。

### 環境変数（Project Settings）
`AWS_REGION` / `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` / `AGENT_RUNTIME_URL` /
`MEMORY_ID`（チャット履歴を AgentCore Memory から引くため。CDK 出力 MemoryId）。

### BFF に必要な AWS 権限（IAM ユーザーのアクセスキーを Vercel に設定）
BFF（`/api/chat`, `/api/auth/*`, `/api/history*`）はサーバ実行のため AWS 認証情報が要る。最小権限:

- 認証（Cognito、public API）: `cognito-idp:SignUp` / `ConfirmSignUp` / `InitiateAuth`
  （`InitiateAuth` は USER_PASSWORD_AUTH のログインと REFRESH_TOKEN_AUTH の再発行の両方をカバー）。
- チャット履歴（AgentCore Memory データプレーン、Resource は対象 Memory ARN に限定）:
  `bedrock-agentcore:ListSessions` / `ListEvents`。

### cookie / CSRF（本番の挙動）
- 本番（`NODE_ENV=production`、https）ではセッション cookie 名が `__Host-` プレフィックス付き
  （`Secure` / `Path=/` / `Domain` 無し）になる。Vercel は https のため自動的に有効。
  **本番初回デプロイ時、旧 cookie 名のセッションは読めず再ログインが必要。**
- 変更系 Route Handler は Origin/Host 同一オリジン検証（CSRF 対策）。同一オリジンの
  ブラウザ fetch は Origin を送るため通常利用に影響なし。
- access token は失効/失効間近で refresh token により自動再発行される（`/api/chat`）。
