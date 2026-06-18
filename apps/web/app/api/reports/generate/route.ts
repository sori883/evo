import { type NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/csrf";
import { generateReport } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";

// レポート生成は ~35s かかるため関数タイムアウトを延ばす（Vercel）。
export const maxDuration = 60;

/** レポートを種別指定でオンデマンド生成する。 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOrigin(req.headers)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { kind?: unknown };
  const kind = body.kind === "config" ? "config" : "operations";
  try {
    const result = await generateReport(kind);
    return NextResponse.json({ ...result, kind });
  } catch (e) {
    const message = e instanceof Error ? e.message : "generate error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
