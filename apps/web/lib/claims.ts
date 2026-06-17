export type UserClaims = {
  /** Cognito sub（= AgentCore Memory の actorId）。 */
  sub: string;
  /** メールアドレス（無ければ空文字）。 */
  email: string;
};

/** JWT のペイロード部を JSON としてデコードする（署名検証はしない）。 */
function decodePayload(token: string | undefined | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }
  const payloadPart = token.split(".")[1];
  if (!payloadPart) {
    return null;
  }
  try {
    const json = Buffer.from(payloadPart, "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * id token(JWT) のペイロードから sub / email を取り出す。
 * トークンはログイン時に検証済みでサーバの httpOnly cookie に保持しているため、
 * ここでは署名検証はせずデコードのみ行う（表示・actorId 取得用途）。
 */
export function decodeClaims(idToken: string | undefined | null): UserClaims | null {
  const payload = decodePayload(idToken);
  if (!payload || typeof payload.sub !== "string" || payload.sub.length === 0) {
    return null;
  }
  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : "",
  };
}

/** JWT の exp（UNIX 秒）を返す。取得できなければ null。 */
export function getTokenExp(token: string | undefined | null): number | null {
  const payload = decodePayload(token);
  return payload && typeof payload.exp === "number" ? payload.exp : null;
}

/**
 * access token が失効、または指定秒数以内に失効するかを判定する。
 * exp を取得できない（不正/欠落）場合は安全側に倒して true（要再発行）。
 */
export function isTokenExpiringSoon(
  token: string | undefined | null,
  nowMs: number,
  skewSeconds = 30,
): boolean {
  const exp = getTokenExp(token);
  if (exp === null) {
    return true;
  }
  return exp * 1000 <= nowMs + skewSeconds * 1000;
}
