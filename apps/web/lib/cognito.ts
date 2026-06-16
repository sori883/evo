import {
  type CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/** send だけを使う最小インターフェース（テストで DI 可能にする）。 */
type SendableClient = Pick<CognitoIdentityProviderClient, "send">;

type AuthResultLike =
  | {
      AccessToken?: string;
      IdToken?: string;
      RefreshToken?: string;
      ExpiresIn?: number;
    }
  | undefined;

/**
 * Cognito User Pool 操作（Amplify 非依存）。
 * Route Handler（サーバ）から呼び、トークンは httpOnly cookie に保存する想定。
 */
export class CognitoService {
  constructor(
    private readonly client: SendableClient,
    private readonly clientId: string,
  ) {}

  async signUp(email: string, password: string): Promise<void> {
    await this.client.send(
      new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      }),
    );
  }

  async confirm(email: string, code: string): Promise<void> {
    await this.client.send(
      new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      }),
    );
  }

  async signIn(email: string, password: string): Promise<AuthTokens> {
    const res = await this.client.send(
      new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    );
    return toTokens(res.AuthenticationResult);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await this.client.send(
      new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      }),
    );
    return toTokens(res.AuthenticationResult);
  }
}

function toTokens(result: AuthResultLike): AuthTokens {
  if (!result?.AccessToken || !result.IdToken) {
    throw new Error("認証に失敗しました");
  }
  return {
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn ?? 3600,
  };
}
