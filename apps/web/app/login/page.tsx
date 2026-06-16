"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  return (
    <main style={{ maxWidth: 360, margin: "80px auto", padding: 16 }}>
      <h1 style={{ fontSize: 20 }}>
        {mode === "login" ? "ログイン" : mode === "signup" ? "サインアップ" : "メール確認"}
      </h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        {mode !== "confirm" && (
          <input
            type="password"
            placeholder="パスワード（8文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        )}
        {mode === "confirm" && (
          <input
            type="text"
            placeholder="確認コード"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={inputStyle}
          />
        )}
        {error && <p style={{ color: "#ff6b6b", fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading
            ? "処理中…"
            : mode === "login"
              ? "ログイン"
              : mode === "signup"
                ? "登録"
                : "確認"}
        </button>
      </form>
      <div style={{ marginTop: 16, fontSize: 13 }}>
        {mode === "login" ? (
          <button onClick={() => setMode("signup")} style={linkStyle}>
            アカウントを作成
          </button>
        ) : (
          <button onClick={() => setMode("login")} style={linkStyle}>
            ログインへ戻る
          </button>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#16161c",
  color: "#e8e8ea",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#5b8cff",
  color: "#fff",
  cursor: "pointer",
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#5b8cff",
  cursor: "pointer",
  padding: 0,
};
