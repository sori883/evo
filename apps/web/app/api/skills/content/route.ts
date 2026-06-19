import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getSkill } from "@/lib/skills";

/**
 * 指定 skill(SKILL.md) の本文を返す。
 * key はスラッシュを含む S3 キーのため query param で受け取り、getSkill 側で
 * 厳格に検証する（不正は 404）。
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const markdown = await getSkill(key);
  if (markdown === null) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json({ key, markdown });
}
