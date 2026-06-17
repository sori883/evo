/**
 * 変更系リクエストの簡易 CSRF 対策（Origin/Host 同一オリジン検証）。
 * cookie は sameSite=lax だが、明示的に Origin と Host の一致を確認する。
 * ブラウザは同一オリジンの POST でも Origin を送るため、欠落は拒否（安全側）。
 */
export function isSameOrigin(headers: {
  get(name: string): string | null;
}): boolean {
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin || !host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
