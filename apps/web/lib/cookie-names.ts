// セッション cookie 名。本番(https)では `__Host-` プレフィックスを付け、
// Secure/Path=//Domain無し を必須化してスコープを厳格にする。
// dev(http) では `__Host-` が Secure 必須で使えないため従来名にフォールバックする。
// middleware(edge) と session(server) の双方から参照するため next/headers 非依存。
const PROD = process.env.NODE_ENV === "production";
const prefix = PROD ? "__Host-" : "";

export const COOKIE_ACCESS = `${prefix}evo_access`;
export const COOKIE_ID = `${prefix}evo_id`;
export const COOKIE_REFRESH = `${prefix}evo_refresh`;
