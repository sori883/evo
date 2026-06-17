export type UserClaims = {
  /** Cognito sub（= AgentCore Memory の actorId）。 */
  sub: string;
  /** メールアドレス（無ければ空文字）。 */
  email: string;
};

/**
 * id token(JWT) のペイロードから sub / email を取り出す。
 * トークンはログイン時に検証済みでサーバの httpOnly cookie に保持しているため、
 * ここでは署名検証はせずデコードのみ行う（表示・actorId 取得用途）。
 */
export function decodeClaims(idToken: string | undefined | null): UserClaims | null {
  if (!idToken) {
    return null;
  }
  const payloadPart = idToken.split(".")[1];
  if (!payloadPart) {
    return null;
  }
  try {
    const json = Buffer.from(payloadPart, "base64url").toString("utf8");
    const payload = JSON.parse(json) as { sub?: unknown; email?: unknown };
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}
