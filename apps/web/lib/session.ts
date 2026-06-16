import { cookies } from "next/headers";
import type { AuthTokens } from "./cognito";

// httpOnly cookie 名。localhost(http) でも動くよう secure は本番のみ。
const ACCESS = "evo_access";
const ID = "evo_id";
const REFRESH = "evo_refresh";

const secure = process.env.NODE_ENV === "production";
const base = {
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: "/",
};

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 日

/** トークンを httpOnly cookie に保存する。 */
export async function setSession(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS, tokens.accessToken, { ...base, maxAge: tokens.expiresIn });
  store.set(ID, tokens.idToken, { ...base, maxAge: tokens.expiresIn });
  if (tokens.refreshToken) {
    store.set(REFRESH, tokens.refreshToken, { ...base, maxAge: REFRESH_MAX_AGE });
  }
}

/** AgentCore へ渡す access token を取り出す。 */
export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH)?.value;
}

/** ログアウト時にセッション cookie を削除する。 */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const name of [ACCESS, ID, REFRESH]) {
    store.delete(name);
  }
}
