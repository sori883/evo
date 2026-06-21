import { NextResponse } from "next/server";
import { listIncidents } from "@/lib/incidents";
import { getCurrentUser } from "@/lib/session";

/** インシデント一覧を返す。 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ incidents: await listIncidents() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "incidents error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
