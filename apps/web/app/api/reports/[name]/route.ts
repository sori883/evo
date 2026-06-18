import { type NextRequest, NextResponse } from "next/server";
import { getReport } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";

/** 指定レポートの Markdown 本文を返す。 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await params;
  const markdown = await getReport(decodeURIComponent(name));
  if (markdown === null) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  return NextResponse.json({ name, markdown });
}
