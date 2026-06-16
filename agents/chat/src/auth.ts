import { CognitoJwtVerifier } from "aws-jwt-verify";

type HeaderMap = Record<string, string | undefined>;

/** Authorization ヘッダ(大文字小文字どちらも)から Bearer トークンを取り出す。 */
export function extractBearerToken(headers: HeaderMap): string {
  const raw = headers["authorization"] ?? headers["Authorization"];
  if (!raw) {
    throw new Error("authorization ヘッダがありません");
  }
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  if (!match?.[1]) {
    throw new Error("Bearer トークンが不正です");
  }
  return match[1];
}

/** verify だけを使う最小インターフェース（テストで DI 可能にする）。 */
type TokenVerifier = {
  verify: (token: string) => Promise<{ sub?: unknown }>;
};

/**
 * Authorization ヘッダの JWT を検証し、Cognito の sub(= Memory の actorId)を返す。
 * AgentCore の inbound authorizer がトークンの真正性を保証するが、
 * SDK は claim を展開しないため、ここで検証して sub を取り出す。
 */
export async function verifyAndGetSub(
  verifier: TokenVerifier,
  headers: HeaderMap,
): Promise<string> {
  const token = extractBearerToken(headers);
  const payload = await verifier.verify(token);
  if (typeof payload.sub !== "string") {
    throw new Error("sub クレームがありません");
  }
  return payload.sub;
}

/** Cognito User Pool の access token verifier を生成する。 */
export function createVerifier(config: {
  userPoolId: string;
  clientId: string;
}): TokenVerifier {
  return CognitoJwtVerifier.create({
    userPoolId: config.userPoolId,
    tokenUse: "access",
    clientId: config.clientId,
  });
}
