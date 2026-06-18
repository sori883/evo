import { NextResponse } from "next/server";
import { listReports } from "@/lib/reports";
import { getCurrentUser } from "@/lib/session";

/** 運用レポートの一覧を返す。 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ reports: await listReports() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "reports error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
