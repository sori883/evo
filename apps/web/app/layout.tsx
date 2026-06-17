import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "evo chat",
  description: "AgentCore 対話エージェント",
};

// 初回描画前にテーマを確定し、フラッシュ（FOUC）を防ぐ。
// localStorage('theme') を優先し、無ければ OS 設定に追従する。
const themeInit = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: テーマ初期化の同期スクリプト */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
