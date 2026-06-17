import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/session";

/** アカウント情報の確認とログアウト。 */
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: "メールアドレス", value: user.email || "（未設定）" },
    { label: "ユーザーID (sub)", value: user.sub },
  ];

  return (
    <>
      <header className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <h1 className="text-sm font-semibold">アカウント</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <div className="mb-6 flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-full bg-accent/20 text-xl font-semibold text-accent">
              {(user.email[0] ?? "?").toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-medium">
                {user.email || "アカウント"}
              </p>
              <p className="text-sm text-muted">evo chat ユーザー</p>
            </div>
          </div>

          <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <dt className="text-sm text-muted">{r.label}</dt>
                <dd className="break-all font-mono text-sm sm:text-right">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-4">
            <div>
              <p className="text-sm font-medium">サインアウト</p>
              <p className="text-xs text-muted">この端末からログアウトします。</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  );
}
