"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "./theme-toggle";

type SessionItem = {
  sessionId: string;
  title: string;
  createdAt: string;
};

/** 認証済みエリアのサイドバー。会話履歴・ナビ・アカウント・ログアウト。 */
export function Sidebar({ email }: { email: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeSession = params.get("session");

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { sessions?: SessionItem[] };
        setSessions(data.sessions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // 新しい会話が保存されたらサイドバーを更新する
    const onChanged = () => void load();
    window.addEventListener("evo:history-changed", onChanged);
    return () => window.removeEventListener("evo:history-changed", onChanged);
  }, [load]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const onChat = pathname === "/chat";

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
          e
        </span>
        <span className="text-sm font-semibold tracking-wide">evo chat</span>
      </div>

      <div className="space-y-1 px-3">
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          ＋ 新しい会話
        </Link>
        <Link
          href="/reports"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2 ${
            pathname === "/reports" ? "bg-surface-2 text-fg" : "text-muted"
          }`}
        >
          📄 運用レポート
        </Link>
        <Link
          href="/skills"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2 ${
            pathname === "/skills" ? "bg-surface-2 text-fg" : "text-muted"
          }`}
        >
          🧠 Skills
        </Link>
        <Link
          href="/incidents"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2 ${
            pathname === "/incidents" ? "bg-surface-2 text-fg" : "text-muted"
          }`}
        >
          🚨 インシデント
        </Link>
      </div>

      <nav className="mt-4 min-h-0 flex-1 overflow-y-auto px-2">
        <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted">
          履歴
        </p>
        {loading ? (
          <p className="px-2 py-2 text-xs text-muted">読み込み中…</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted">まだ会話がありません</p>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((s) => {
              const active = onChat && activeSession === s.sessionId;
              return (
                <li key={s.sessionId}>
                  <Link
                    href={`/chat?session=${encodeURIComponent(s.sessionId)}`}
                    className={`block truncate rounded-md px-2 py-2 text-sm transition-colors ${
                      active
                        ? "bg-surface-2 text-fg"
                        : "text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                    title={s.title}
                  >
                    {s.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <ThemeToggle className="mb-1 w-full" />
        <Link
          href="/account"
          className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2 ${
            pathname === "/account" ? "bg-surface-2" : ""
          }`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
            {(email[0] ?? "?").toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{email || "アカウント"}</span>
            <span className="block text-xs text-muted">アカウント</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={logout}
          className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-danger"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}
