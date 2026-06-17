"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** ログアウトしてログイン画面へ戻る。 */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-danger transition-colors hover:border-danger disabled:opacity-50"
    >
      {busy ? "ログアウト中…" : "ログアウト"}
    </button>
  );
}
