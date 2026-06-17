import { cookies } from "next/headers";
import { type UserClaims, decodeClaims, isTokenExpiringSoon } from "./claims";
import type { AuthTokens } from "./cognito";
import { createCognitoService } from "./cognito-service";
import { COOKIE_ACCESS, COOKIE_ID, COOKIE_REFRESH } from "./cookie-names";

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
  store.set(COOKIE_ACCESS, tokens.accessToken, {
    ...base,
    maxAge: tokens.expiresIn,
  });
  store.set(COOKIE_ID, tokens.idToken, { ...base, maxAge: tokens.expiresIn });
  if (tokens.refreshToken) {
    store.set(COOKIE_REFRESH, tokens.refreshToken, {
      ...base,
      maxAge: REFRESH_MAX_AGE,
    });
  }
}

/** AgentCore へ渡す access token を取り出す。 */
export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_ACCESS)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_REFRESH)?.value;
}

/** id token を取り出す（クレーム表示・actorId 取得用）。 */
export async function getIdToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_ID)?.value;
}

/** ログイン中ユーザーのクレーム（sub/email）。未ログインなら null。 */
export async function getCurrentUser(): Promise<UserClaims | null> {
  return decodeClaims(await getIdToken());
}

/**
 * 有効な access token を返す。失効/失効間近なら refresh token で再発行し、
 * cookie を更新してから新しい access token を返す。
 * refresh できない場合は現在値（多くは undefined）を返す。
 */
export async function getValidAccessToken(nowMs: number): Promise<string | undefined> {
  const access = await getAccessToken();
  if (access && !isTokenExpiringSoon(access, nowMs)) {
    return access;
  }
  const refresh = await getRefreshToken();
  if (!refresh) {
    return access;
  }
  try {
    const tokens = await createCognitoService().refresh(refresh);
    // REFRESH_TOKEN_AUTH は新しい refresh token を返さないため既存を引き継ぐ。
    await setSession({ ...tokens, refreshToken: tokens.refreshToken ?? refresh });
    return tokens.accessToken;
  } catch {
    return access;
  }
}

/** ログアウト時にセッション cookie を削除する。 */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const name of [COOKIE_ACCESS, COOKIE_ID, COOKIE_REFRESH]) {
    store.delete(name);
  }
}
