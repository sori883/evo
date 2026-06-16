#!/usr/bin/env bash
# GitHub Actions OIDC プロバイダ + デプロイ用 IAM ロールを作成する。
# 実行: AWS 認証のあるシェルで  bash scripts/setup-oidc.sh
set -euo pipefail

REGION=ap-northeast-1
REPO_SUB="repo:sori883/evo:*"
ROLE_NAME=evo-gha-deploy

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
PROVIDER_ARN="arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"

echo "Account: ${ACCOUNT}"

# 1. OIDC プロバイダ（無ければ作成。thumbprint は GitHub 既知値、現行 IAM では検証されないがCLIが要求）
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$PROVIDER_ARN" >/dev/null 2>&1; then
  echo "OIDC provider: already exists"
else
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 1b511abead59c6ce207077c0bf0e0043b1382612 >/dev/null
  echo "OIDC provider: created"
fi

# 2. 信頼ポリシー（repo 限定）
TRUST=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "${PROVIDER_ARN}" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
      "StringLike": { "token.actions.githubusercontent.com:sub": "${REPO_SUB}" }
    }
  }]
}
JSON
)

# 3. ロール作成 or 信頼ポリシー更新
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST"
  echo "Role: updated trust policy"
else
  aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" >/dev/null
  echo "Role: created"
fi

# 4. 権限（簡便版: CDK bootstrap が作るロールを assume できれば cdk deploy 可能）
PERM=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "arn:aws:iam::${ACCOUNT}:role/cdk-hnb659fds-*"
  }]
}
JSON
)
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name cdk-assume --policy-document "$PERM"
echo "Role: attached cdk-assume policy"

echo ""
echo "=== 完了。以下を GitHub に登録してください ==="
echo "AWS_DEPLOY_ROLE_ARN=arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}"
echo "AWS_ACCOUNT_ID=${ACCOUNT}"
