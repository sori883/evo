import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listSkills } from "@/lib/skills";

/** 共有 skill ストアの一覧を返す（全 namespace / base+dynamic）。 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ skills: await listSkills() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "skills error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
