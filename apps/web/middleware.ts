import { type NextRequest, NextResponse } from "next/server";

/**
 * 未認証（access cookie 無し）で保護ページにアクセスしたらログインへリダイレクト。
 * 認可の最終判断は BFF/Route Handler 側で行う（middleware は入口ガード）。
 */
export function middleware(req: NextRequest): NextResponse {
  const token = req.cookies.get("evo_access")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat", "/chat/:path*", "/account", "/account/:path*"],
};
