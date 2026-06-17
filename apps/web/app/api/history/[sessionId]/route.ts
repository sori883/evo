import { type NextRequest, NextResponse } from "next/server";
import { eventsToMessages } from "@/lib/history";
import { MemoryReader } from "@/lib/memory";
import { getCurrentUser } from "@/lib/session";

/** 指定セッションの会話メッセージ（古い→新しい順）を返す。 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  try {
    const reader = new MemoryReader();
    const events = await reader.listEvents(user.sub, sessionId, 100);
    return NextResponse.json({ messages: eventsToMessages(events) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "history error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
