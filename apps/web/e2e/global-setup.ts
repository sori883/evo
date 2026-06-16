import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";

/**
 * E2E 用のテストユーザーを Cognito に用意する（確認済み・恒久パスワード）。
 * 必要 env: AWS_REGION, COGNITO_USER_POOL_ID, E2E_USER_EMAIL, E2E_USER_PASSWORD
 * 実行には Cognito 管理権限を持つ AWS 認証情報が必要。
 */
async function globalSetup(): Promise<void> {
  const region = process.env.AWS_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!region || !userPoolId || !email || !password) {
    throw new Error(
      "E2E には AWS_REGION / COGNITO_USER_POOL_ID / E2E_USER_EMAIL / E2E_USER_PASSWORD が必要です",
    );
  }

  const client = new CognitoIdentityProviderClient({ region });

  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
        MessageAction: "SUPPRESS",
      }),
    );
  } catch (e) {
    if (!(e instanceof UsernameExistsException)) {
      throw e;
    }
  }

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    }),
  );
}

export default globalSetup;
