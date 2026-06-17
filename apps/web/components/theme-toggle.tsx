"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * ライト/ダークの切替トグル。`<html>` の `.dark` を付け外しし localStorage に保存する。
 * 初期テーマは layout の同期スクリプトが設定済みなので、ここでは現在値を読むだけ。
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage が使えない環境では保存をスキップ
    }
    setTheme(next);
  }

  // ハイドレーション不一致を避けるため、マウント前はラベルを出さない
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="テーマを切り替え"
      title="テーマを切り替え"
      className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg ${className}`}
    >
      <span aria-hidden className="text-base leading-none">
        {theme === null ? "◐" : isDark ? "☀️" : "🌙"}
      </span>
      <span>
        {theme === null ? "テーマ" : isDark ? "ライトモード" : "ダークモード"}
      </span>
    </button>
  );
}
