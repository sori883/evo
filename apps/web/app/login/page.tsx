"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type Mode = "login" | "signup" | "confirm";

async function postAuth(action: string, body: unknown): Promise<void> {
  const res = await fetch(`/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "失敗しました");
  }
}

const TITLE: Record<Mode, string> = {
  login: "ログイン",
  signup: "アカウント作成",
  confirm: "メール確認",
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await postAuth("signup", { email, password });
        setMode("confirm");
      } else if (mode === "confirm") {
        await postAuth("confirm", { email, code });
        setMode("login");
      } else {
        await postAuth("login", { email, password });
        router.push("/chat");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-[15px] outline-none placeholder:text-muted focus:border-accent";

  return (
    <main className="relative grid min-h-dvh place-items-center px-4">
      <div className="absolute right-3 top-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-xl font-bold text-accent-fg">
            e
          </span>
          <h1 className="text-xl font-semibold">{TITLE[mode]}</h1>
          <p className="mt-1 text-sm text-muted">evo chat へようこそ</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl border border-border bg-surface p-5"
        >
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
          {mode !== "confirm" && (
            <input
              type="password"
              placeholder="パスワード（8文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          )}
          {mode === "confirm" && (
            <input
              type="text"
              inputMode="numeric"
              placeholder="確認コード"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className={inputClass}
            />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-3.5 py-2.5 text-[15px] font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? "処理中…"
              : mode === "login"
                ? "ログイン"
                : mode === "signup"
                  ? "登録する"
                  : "確認する"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className="text-accent hover:underline"
            >
              アカウントを作成
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="text-accent hover:underline"
            >
              ログインへ戻る
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
