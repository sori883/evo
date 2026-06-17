import { NextResponse } from "next/server";
import { deriveSessionTitle, eventsToMessages } from "@/lib/history";
import { MemoryReader } from "@/lib/memory";
import { getCurrentUser } from "@/lib/session";

/**
 * ログイン中ユーザー(actorId=sub)のセッション一覧を返す。
 * 各セッションは先頭イベントから導いたタイトルを付与する。
 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reader = new MemoryReader();
    const sessions = await reader.listSessions(user.sub, 30);
    const enriched = await Promise.all(
      sessions.slice(0, 20).map(async (s) => {
        const events = await reader
          .listEvents(user.sub, s.sessionId, 4)
          .catch(() => []);
        return {
          sessionId: s.sessionId,
          updatedAt: s.updatedAt,
          title: deriveSessionTitle(eventsToMessages(events)),
        };
      }),
    );
    return NextResponse.json({ sessions: enriched });
  } catch (e) {
    const message = e instanceof Error ? e.message : "history error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
